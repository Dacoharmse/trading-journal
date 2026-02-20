"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CalendarHeatmapProps {
  trades: Trade[]
  startDate?: Date
  endDate?: Date
}

// Format a Date as a local YYYY-MM-DD string (avoids UTC timezone shift)
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalendarHeatmap({ trades }: CalendarHeatmapProps) {
  const [viewDate, setViewDate] = React.useState(() => new Date())

  const goToPrevMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goToNextMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToToday = () => setViewDate(new Date())

  const today = localDateKey(new Date())

  // Build daily P&L map from all trades
  const dailyPnL = React.useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number }>()
    trades.forEach(trade => {
      const rawDate = trade.exit_date || trade.entry_date
      const dateStr = rawDate.length === 10 ? `${rawDate}T00:00` : rawDate
      const date = new Date(dateStr)
      const key = localDateKey(date)
      const current = map.get(key) || { pnl: 0, trades: 0 }
      map.set(key, { pnl: current.pnl + trade.pnl, trades: current.trades + 1 })
    })
    return map
  }, [trades])

  // Streak stats from all trade data
  const { currentStreak, bestWinStreak } = React.useMemo(() => {
    const sortedDates = Array.from(dailyPnL.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    let currentStreak = 0, bestWinStreak = 0, tempWinStreak = 0, tempLossStreak = 0

    sortedDates.forEach(([date, data]) => {
      if (data.pnl > 0) {
        tempWinStreak++
        tempLossStreak = 0
        if (tempWinStreak > bestWinStreak) bestWinStreak = tempWinStreak
      } else if (data.pnl < 0) {
        tempLossStreak++
        tempWinStreak = 0
      }
      if (date <= today) {
        if (data.pnl > 0) currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1
        else if (data.pnl < 0) currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1
      }
    })
    return { currentStreak, bestWinStreak }
  }, [dailyPnL, today])

  // Generate full month grid
  const { weeks, monthLabel } = React.useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const monthLabel = new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })

    // First day of month, padded back to Sunday
    const firstOfMonth = new Date(year, month, 1)
    const startSunday = new Date(firstOfMonth)
    startSunday.setDate(startSunday.getDate() - startSunday.getDay())

    // Last day of month
    const lastOfMonth = new Date(year, month + 1, 0)

    type DayCell = { date: string; pnl: number; trades: number; inMonth: boolean }
    const weeks: DayCell[][] = []
    const cur = new Date(startSunday)

    while (cur <= lastOfMonth || cur.getDay() !== 0) {
      if (cur.getDay() === 0) weeks.push([])
      const key = localDateKey(cur)
      const data = dailyPnL.get(key) || { pnl: 0, trades: 0 }
      weeks[weeks.length - 1].push({
        date: key,
        pnl: data.pnl,
        trades: data.trades,
        inMonth: cur.getMonth() === month,
      })
      cur.setDate(cur.getDate() + 1)
      // Safety: never exceed 6 weeks
      if (weeks.length === 6 && cur.getDay() === 0) break
    }

    return { weeks, monthLabel }
  }, [viewDate, dailyPnL])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const getDayBg = (pnl: number, trades: number, inMonth: boolean) => {
    if (!inMonth) return 'bg-neutral-100/20 dark:bg-neutral-900/20'
    if (trades === 0) return 'bg-neutral-100/40 dark:bg-neutral-900/40'
    if (pnl > 0) return 'bg-green-500 dark:bg-green-600'
    if (pnl < 0) return 'bg-red-500 dark:bg-red-600'
    return 'bg-neutral-400 dark:bg-neutral-600'
  }

  const getDayTextColor = (pnl: number, trades: number) => {
    if (trades === 0) return 'text-neutral-400 dark:text-neutral-600'
    return 'text-white'
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardContent className="p-4">
        {/* Header: navigation + streak stats */}
        <div className="flex items-center justify-between mb-3">
          {/* Month nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold min-w-[130px] text-center">{monthLabel}</span>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="ml-1 px-2 py-0.5 text-[11px] font-medium border border-border rounded hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              Today
            </button>
          </div>

          {/* Streak stats */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Best: <span className="font-bold text-green-600">{bestWinStreak}d</span>
            </span>
            <span className="text-muted-foreground">
              Current:{' '}
              <span className={`font-bold ${currentStreak > 0 ? 'text-green-600' : currentStreak < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {currentStreak > 0 ? '+' : ''}{currentStreak}d
              </span>
            </span>
          </div>
        </div>

        {/* Grid: 8 columns (Su–Sa + Week summary) */}
        <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {/* Column headers */}
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="bg-muted/30 dark:bg-neutral-900/60 text-center text-[11px] font-medium text-muted-foreground py-1.5">
              {d}
            </div>
          ))}
          <div className="bg-muted/50 dark:bg-neutral-900/80 text-center text-[11px] font-medium text-muted-foreground py-1.5">
            Week
          </div>

          {/* Week rows */}
          {weeks.map((week, weekIdx) => {
            const weekTradeCount = week.filter(d => d.inMonth).reduce((s, d) => s + d.trades, 0)
            const weekPnL = week.filter(d => d.inMonth).reduce((s, d) => s + d.pnl, 0)

            return (
              <React.Fragment key={weekIdx}>
                {/* Day cells */}
                {week.map((day, dayIdx) => {
                  const dayNum = parseInt(day.date.slice(-2), 10)
                  const isToday = day.date === today
                  const hasData = day.trades > 0 && day.inMonth

                  return (
                    <div
                      key={dayIdx}
                      className={`${getDayBg(day.pnl, day.trades, day.inMonth)} min-h-[72px] p-1.5 flex flex-col relative group`}
                    >
                      {/* Day number */}
                      <div className="flex justify-start">
                        <span
                          className={`text-[11px] font-semibold leading-none w-5 h-5 flex items-center justify-center rounded-full
                            ${isToday
                              ? 'bg-white text-neutral-900 dark:bg-white dark:text-neutral-900'
                              : getDayTextColor(day.pnl, day.trades)
                            } ${!day.inMonth ? 'opacity-30' : ''}`}
                        >
                          {dayNum}
                        </span>
                      </div>

                      {/* P&L + trade count */}
                      {hasData && (
                        <div className="mt-auto flex flex-col gap-0.5">
                          <span className="text-[12px] font-bold text-white leading-tight">
                            {formatCurrency(day.pnl)}
                          </span>
                          <span className="text-[10px] text-white/70 leading-none">
                            {day.trades} trade{day.trades !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Week summary cell */}
                <div className="bg-muted/30 dark:bg-neutral-900/50 min-h-[72px] p-1.5 flex flex-col">
                  <span className="text-[10px] font-medium text-muted-foreground leading-none">
                    Wk {weekIdx + 1}
                  </span>
                  <div className="mt-auto flex flex-col gap-0.5">
                    <span className={`text-[11px] font-bold leading-tight ${weekPnL > 0 ? 'text-green-500' : weekPnL < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {weekTradeCount > 0 ? formatCurrency(weekPnL) : '$0.00'}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {weekTradeCount} trade{weekTradeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
