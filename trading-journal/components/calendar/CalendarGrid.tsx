"use client"

import * as React from "react"
import { CalendarCell } from "./CalendarCell"
import { getCalendarGrid, type DailyStats } from "@/lib/calendar-utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/fx-converter"

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface CalendarGridProps {
  year: number
  month: number
  dailyStats: Map<string, DailyStats>
  displayUnit: 'currency' | 'r'
  currency: string
  bestDay?: string
  onDateClick: (date: Date, stats: DailyStats | undefined) => void
  onMonthChange: (year: number, month: number) => void
}

export function CalendarGrid({
  year,
  month,
  dailyStats,
  displayUnit,
  currency,
  bestDay,
  onDateClick,
  onMonthChange,
}: CalendarGridProps) {
  const grid = React.useMemo(() => getCalendarGrid(year, month), [year, month])

  // Group 42-cell grid into 6 weeks of 7
  const weeks = React.useMemo(() => {
    const ws: Date[][] = []
    for (let i = 0; i < grid.length; i += 7) {
      ws.push(grid.slice(i, i + 7))
    }
    return ws
  }, [grid])

  const monthName = React.useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [year, month])

  // Max absolute value for color intensity scaling
  const maxAbsValue = React.useMemo(() => {
    let max = 0
    dailyStats.forEach((stats) => {
      const value = displayUnit === 'r' ? Math.abs(stats.totalR) : Math.abs(stats.totalPnL)
      if (value > max) max = value
    })
    return max || 1
  }, [dailyStats, displayUnit])

  const handlePrevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, month - 1)
  }

  const handleNextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, month + 1)
  }

  const handleToday = () => {
    const today = new Date()
    onMonthChange(today.getFullYear(), today.getMonth())
  }

  const formatWeekValue = (pnl: number, r: number) => {
    if (displayUnit === 'r') return `${r > 0 ? '+' : ''}${r.toFixed(1)}R`
    return formatCurrency(pnl, currency)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{monthName}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 8-column grid: 7 day columns + week summary column */}
      <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {/* Column headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div
            key={d}
            className="bg-muted/30 dark:bg-neutral-900/60 text-center text-xs font-medium text-muted-foreground py-2"
          >
            {d}
          </div>
        ))}
        <div className="bg-muted/50 dark:bg-neutral-900/80 text-center text-xs font-medium text-muted-foreground py-2">
          Week
        </div>

        {/* Week rows */}
        {weeks.map((week, weekIdx) => {
          // Only count in-month days for week totals
          const inMonthDays = week.filter(d => d.getMonth() === month)
          const weekPnL = inMonthDays.reduce((sum, d) => sum + (dailyStats.get(localDateKey(d))?.totalPnL || 0), 0)
          const weekR = inMonthDays.reduce((sum, d) => sum + (dailyStats.get(localDateKey(d))?.totalR || 0), 0)
          const weekTrades = inMonthDays.reduce((sum, d) => sum + (dailyStats.get(localDateKey(d))?.trades || 0), 0)

          return (
            <React.Fragment key={weekIdx}>
              {week.map((date, dayIdx) => {
                const dateKey = localDateKey(date)
                const stats = dailyStats.get(dateKey)
                return (
                  <CalendarCell
                    key={dayIdx}
                    date={date}
                    stats={stats}
                    currentMonth={month}
                    displayUnit={displayUnit}
                    currency={currency}
                    maxAbsValue={maxAbsValue}
                    isHighlightedBest={bestDay === dateKey}
                    onDateClick={onDateClick}
                  />
                )
              })}

              {/* Week summary cell */}
              <div className="bg-muted/20 dark:bg-neutral-900/40 min-h-[84px] p-2 flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground leading-none">
                  Wk {weekIdx + 1}
                </span>
                <div className="mt-auto">
                  {weekTrades > 0 ? (
                    <>
                      <span className={`text-sm font-bold leading-tight block ${
                        weekPnL >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatWeekValue(weekPnL, weekR)}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-none">
                        {weekTrades} trade{weekTrades !== 1 ? 's' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-muted-foreground">Profitable</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-muted-foreground">Loss</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded bg-neutral-100 dark:bg-neutral-800" />
          <span className="text-muted-foreground">No trades</span>
        </div>
      </div>
    </div>
  )
}
