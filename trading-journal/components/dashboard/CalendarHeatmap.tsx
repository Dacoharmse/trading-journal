"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { TrendingUp, TrendingDown, Calendar as CalendarIcon } from "lucide-react"

interface CalendarHeatmapProps {
  trades: Trade[]
  startDate: Date
  endDate: Date
}

export function CalendarHeatmap({ trades, startDate, endDate }: CalendarHeatmapProps) {
  // Calculate daily P&L
  const dailyPnL = React.useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number }>()

    trades.forEach(trade => {
      const date = new Date(trade.exit_date || trade.entry_date)
      const key = date.toISOString().slice(0, 10)
      const current = map.get(key) || { pnl: 0, trades: 0 }
      map.set(key, {
        pnl: current.pnl + trade.pnl,
        trades: current.trades + 1
      })
    })

    return map
  }, [trades])

  // Calculate streaks
  const { currentStreak, bestWinStreak, worstLossStreak, bestDay, worstDay } = React.useMemo(() => {
    const sortedDates = Array.from(dailyPnL.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))

    let currentStreak = 0
    let bestWinStreak = 0
    let tempWinStreak = 0
    let worstLossStreak = 0
    let tempLossStreak = 0
    let bestDay = { date: '', pnl: -Infinity }
    let worstDay = { date: '', pnl: Infinity }

    const today = new Date().toISOString().slice(0, 10)

    sortedDates.forEach(([date, data]) => {
      // Track best/worst days
      if (data.pnl > bestDay.pnl) {
        bestDay = { date, pnl: data.pnl }
      }
      if (data.pnl < worstDay.pnl) {
        worstDay = { date, pnl: data.pnl }
      }

      // Track streaks
      if (data.pnl > 0) {
        tempWinStreak++
        tempLossStreak = 0
        if (tempWinStreak > bestWinStreak) {
          bestWinStreak = tempWinStreak
        }
      } else if (data.pnl < 0) {
        tempLossStreak++
        tempWinStreak = 0
        if (tempLossStreak > worstLossStreak) {
          worstLossStreak = tempLossStreak
        }
      }

      // Track current streak (up to today)
      if (date <= today) {
        if (data.pnl > 0) {
          currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1
        } else if (data.pnl < 0) {
          currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1
        }
      }
    })

    return { currentStreak, bestWinStreak, worstLossStreak, bestDay, worstDay }
  }, [dailyPnL])

  // Generate calendar grid
  const calendarDays = React.useMemo(() => {
    const days: Array<{ date: string; pnl: number; trades: number }> = []
    const current = new Date(startDate)

    // Find the Sunday before start date
    const firstDay = new Date(current)
    firstDay.setDate(firstDay.getDate() - firstDay.getDay())

    // Generate days until we pass end date
    const currentDate = new Date(firstDay)
    while (currentDate <= endDate) {
      const key = currentDate.toISOString().slice(0, 10)
      const data = dailyPnL.get(key) || { pnl: 0, trades: 0 }

      days.push({
        date: key,
        pnl: data.pnl,
        trades: data.trades
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }, [startDate, endDate, dailyPnL])

  // Get color based on P&L
  const getColor = (pnl: number, trades: number) => {
    if (trades === 0) return 'bg-muted/20'
    if (pnl > 1000) return 'bg-green-600'
    if (pnl > 500) return 'bg-green-500'
    if (pnl > 0) return 'bg-green-400'
    if (pnl === 0) return 'bg-neutral-400'
    if (pnl > -500) return 'bg-red-400'
    if (pnl > -1000) return 'bg-red-500'
    return 'bg-red-600'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Group by weeks
  const weeks = React.useMemo(() => {
    const grouped: typeof calendarDays[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      grouped.push(calendarDays.slice(i, i + 7))
    }
    return grouped
  }, [calendarDays])

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Trading Calendar
            </CardTitle>
          </div>

          {/* Streak indicators */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-muted-foreground">Best Streak:</span>
              <span className="font-bold text-green-600">{bestWinStreak} days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Current:</span>
              <span className={`font-bold ${currentStreak > 0 ? 'text-green-600' : currentStreak < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {Math.abs(currentStreak)} {currentStreak > 0 ? '🔥' : currentStreak < 0 ? '❄️' : ''}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Best/Worst Day */}
          <div className="flex items-center justify-around text-xs bg-muted/30 rounded-lg p-3">
            {bestDay.pnl !== -Infinity && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-muted-foreground">Best Day</div>
                  <div className="font-bold text-green-600">{formatCurrency(bestDay.pnl)}</div>
                  <div className="text-muted-foreground/70">{formatDate(bestDay.date)}</div>
                </div>
              </div>
            )}
            {worstDay.pnl !== Infinity && (
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <div>
                  <div className="text-muted-foreground">Worst Day</div>
                  <div className="font-bold text-red-600">{formatCurrency(worstDay.pnl)}</div>
                  <div className="text-muted-foreground/70">{formatDate(worstDay.date)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {/* Week day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`aspect-square rounded-md ${getColor(day.pnl, day.trades)} transition-all hover:scale-110 hover:shadow-lg cursor-pointer relative group`}
                    title={`${formatDate(day.date)}: ${day.trades} trades, ${formatCurrency(day.pnl)}`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {formatDate(day.date)}<br />
                      {day.trades} trade{day.trades !== 1 ? 's' : ''}<br />
                      {formatCurrency(day.pnl)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/20" />
              <div className="w-3 h-3 rounded-sm bg-red-400" />
              <div className="w-3 h-3 rounded-sm bg-neutral-400" />
              <div className="w-3 h-3 rounded-sm bg-green-400" />
              <div className="w-3 h-3 rounded-sm bg-green-600" />
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Accessibility text */}
        <div className="sr-only">
          Trading calendar heatmap showing daily performance. Best win streak: {bestWinStreak} days.
          Current streak: {Math.abs(currentStreak)} {currentStreak > 0 ? 'winning' : 'losing'} days.
          Best day: {formatCurrency(bestDay.pnl)} on {formatDate(bestDay.date)}.
          Worst day: {formatCurrency(worstDay.pnl)} on {formatDate(worstDay.date)}.
        </div>
      </CardContent>
    </Card>
  )
}
