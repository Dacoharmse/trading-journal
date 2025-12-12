"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/fx-converter"
import { type DailyStats } from "@/lib/calendar-utils"

interface WeeklySummaryProps {
  year: number
  month: number
  dailyStats: Map<string, DailyStats>
  displayUnit: 'currency' | 'r'
  currency: string
}

interface WeekStats {
  weekNumber: number
  startDate: Date
  endDate: Date
  totalPnL: number
  totalR: number
  trades: number
  winRate: number
}

export function WeeklySummary({
  year,
  month,
  dailyStats,
  displayUnit,
  currency,
}: WeeklySummaryProps) {
  const weekStats = React.useMemo(() => {
    const weeks: WeekStats[] = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get the first Sunday of the calendar view
    let currentWeekStart = new Date(firstDay)
    const firstDayOfWeek = firstDay.getDay()
    currentWeekStart.setDate(currentWeekStart.getDate() - firstDayOfWeek)

    let weekNumber = 1

    while (currentWeekStart <= lastDay || weekNumber <= 5) {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Calculate stats for this week
      let totalPnL = 0
      let totalR = 0
      let trades = 0
      let wins = 0

      for (let d = new Date(currentWeekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().slice(0, 10)
        const dayStats = dailyStats.get(dateKey)

        if (dayStats) {
          totalPnL += dayStats.totalPnL
          totalR += dayStats.totalR
          trades += dayStats.trades

          // Count winning trades
          dayStats.tradesList.forEach(trade => {
            const r = trade.pnl / (trade.risk || 1)
            if (r > 0) wins++
          })
        }
      }

      const winRate = trades > 0 ? (wins / trades) * 100 : 0

      weeks.push({
        weekNumber,
        startDate: new Date(currentWeekStart),
        endDate: new Date(weekEnd),
        totalPnL,
        totalR,
        trades,
        winRate,
      })

      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
      weekNumber++

      if (weekNumber > 6) break // Max 6 weeks in calendar view
    }

    return weeks
  }, [year, month, dailyStats])

  const formatWeekRange = (start: Date, end: Date) => {
    const startDay = start.getDate()
    const endDay = end.getDate()
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {weekStats.map((week) => {
          const value = displayUnit === 'r' ? week.totalR : week.totalPnL
          const isPositive = value >= 0

          return (
            <div
              key={week.weekNumber}
              className="p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Week {week.weekNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatWeekRange(week.startDate, week.endDate)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`text-xl font-bold ${
                    isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {displayUnit === 'r' ? (
                      `${value > 0 ? '+' : ''}${value.toFixed(1)}R`
                    ) : (
                      formatCurrency(value, currency)
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {week.trades} {week.trades === 1 ? 'trade' : 'trades'}
                    {week.trades > 0 && ` • ${week.winRate.toFixed(0)}% win rate`}
                  </div>
                </div>

                {week.trades > 0 && (
                  <div className={`w-2 h-12 rounded-full ${
                    isPositive ? 'bg-green-500' : 'bg-red-500'
                  }`} style={{
                    opacity: Math.min(Math.abs(value) / Math.max(...weekStats.map(w => Math.abs(displayUnit === 'r' ? w.totalR : w.totalPnL))), 1) * 0.8 + 0.2
                  }} />
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
