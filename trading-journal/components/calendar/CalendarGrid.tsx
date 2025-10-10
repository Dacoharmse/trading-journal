"use client"

import * as React from "react"
import { CalendarCell } from "./CalendarCell"
import { getCalendarGrid, type DailyStats } from "@/lib/calendar-utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  const monthName = React.useMemo(() => {
    const date = new Date(year, month, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [year, month])

  // Calculate max absolute value for color scaling
  const maxAbsValue = React.useMemo(() => {
    let max = 0
    dailyStats.forEach((stats) => {
      const value = displayUnit === 'r' ? Math.abs(stats.totalR) : Math.abs(stats.totalPnL)
      if (value > max) max = value
    })
    return max || 1 // Prevent division by zero
  }, [dailyStats, displayUnit])

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11)
    } else {
      onMonthChange(year, month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0)
    } else {
      onMonthChange(year, month + 1)
    }
  }

  const handleToday = () => {
    const today = new Date()
    onMonthChange(today.getFullYear(), today.getMonth())
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {grid.map((date, idx) => {
          const dateKey = date.toISOString().slice(0, 10)
          const stats = dailyStats.get(dateKey)
          const isHighlightedBest = bestDay === dateKey

          return (
            <CalendarCell
              key={idx}
              date={date}
              stats={stats}
              currentMonth={month}
              displayUnit={displayUnit}
              currency={currency}
              maxAbsValue={maxAbsValue}
              isHighlightedBest={isHighlightedBest}
              onDateClick={onDateClick}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-muted-foreground">Profitable</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-muted-foreground">Loss</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800"></div>
          <span className="text-muted-foreground">No trades</span>
        </div>
      </div>
    </div>
  )
}
