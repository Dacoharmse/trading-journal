"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Flame, CalendarDays } from "lucide-react"
import type { Trade } from "@/types/trade"

interface StreakWidgetProps {
  trades: Trade[]
  startDate: Date
  endDate: Date
}

export function StreakWidget({ trades, startDate, endDate }: StreakWidgetProps) {
  const streaks = React.useMemo(() => {
    // Build daily P&L map
    const dailyPnL = new Map<string, number>()

    trades.forEach(trade => {
      const date = new Date(trade.exit_date || trade.entry_date)
      const key = date.toISOString().slice(0, 10)
      const current = dailyPnL.get(key) || 0
      dailyPnL.set(key, current + trade.pnl)
    })

    // Sort dates
    const sortedDates = Array.from(dailyPnL.keys()).sort()

    if (sortedDates.length === 0) {
      return {
        currentStreak: 0,
        currentStreakType: 'none' as const,
        bestWinStreak: 0,
        bestWinStreakDates: null as { start: string; end: string } | null,
        longestDrawdown: 0,
        longestDrawdownDates: null as { start: string; end: string } | null,
        daysToRecover: 0,
      }
    }

    // Calculate current streak
    let currentStreak = 0
    let currentStreakType: 'win' | 'loss' | 'none' = 'none'

    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const pnl = dailyPnL.get(sortedDates[i])!

      if (i === sortedDates.length - 1) {
        // First day (most recent)
        currentStreak = 1
        currentStreakType = pnl > 0 ? 'win' : 'loss'
      } else {
        // Continue streak if same type
        const isWin = pnl > 0
        if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) {
          currentStreak++
        } else {
          break
        }
      }
    }

    // Calculate best win streak
    let bestWinStreak = 0
    let bestWinStart = ''
    let bestWinEnd = ''
    let tempWinStreak = 0
    let tempWinStart = ''

    sortedDates.forEach((date, idx) => {
      const pnl = dailyPnL.get(date)!

      if (pnl > 0) {
        if (tempWinStreak === 0) {
          tempWinStart = date
        }
        tempWinStreak++

        if (tempWinStreak > bestWinStreak) {
          bestWinStreak = tempWinStreak
          bestWinStart = tempWinStart
          bestWinEnd = date
        }
      } else {
        tempWinStreak = 0
      }
    })

    // Calculate longest drawdown (consecutive losing days)
    let longestDrawdown = 0
    let longestDDStart = ''
    let longestDDEnd = ''
    let tempDDStreak = 0
    let tempDDStart = ''

    sortedDates.forEach((date, idx) => {
      const pnl = dailyPnL.get(date)!

      if (pnl < 0) {
        if (tempDDStreak === 0) {
          tempDDStart = date
        }
        tempDDStreak++

        if (tempDDStreak > longestDrawdown) {
          longestDrawdown = tempDDStreak
          longestDDStart = tempDDStart
          longestDDEnd = date
        }
      } else {
        tempDDStreak = 0
      }
    })

    // Calculate time to recover (from lowest point to breakeven)
    let peakValue = 0
    let peakDate = ''
    let troughValue = 0
    let troughDate = ''
    let recoveryDate = ''
    let cumulative = 0
    let daysToRecover = 0

    sortedDates.forEach((date, idx) => {
      const pnl = dailyPnL.get(date)!
      cumulative += pnl

      if (cumulative > peakValue) {
        peakValue = cumulative
        peakDate = date
        troughValue = cumulative
        troughDate = ''
        recoveryDate = ''
      }

      const drawdown = peakValue - cumulative
      if (drawdown > (peakValue - troughValue)) {
        troughValue = cumulative
        troughDate = date
        recoveryDate = ''
      }

      // Recovery happened
      if (troughDate && cumulative >= peakValue && !recoveryDate) {
        recoveryDate = date
        const troughIdx = sortedDates.indexOf(troughDate)
        const recoveryIdx = sortedDates.indexOf(recoveryDate)
        daysToRecover = recoveryIdx - troughIdx
      }
    })

    return {
      currentStreak,
      currentStreakType,
      bestWinStreak,
      bestWinStreakDates: bestWinStart ? { start: bestWinStart, end: bestWinEnd } : null,
      longestDrawdown,
      longestDrawdownDates: longestDDStart ? { start: longestDDStart, end: longestDDEnd } : null,
      daysToRecover,
    }
  }, [trades, startDate, endDate])

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Streaks & Recovery</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Current Streak */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="h-3 w-3" />
              <span>Current Streak</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${streaks.currentStreakType === 'win' ? 'text-green-600 dark:text-green-400' : streaks.currentStreakType === 'loss' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                {streaks.currentStreak}
              </span>
              <span className="text-xs text-muted-foreground">
                {streaks.currentStreakType === 'win' ? 'wins' : streaks.currentStreakType === 'loss' ? 'losses' : 'days'}
              </span>
            </div>
          </div>

          {/* Best Win Streak */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Best Win Streak</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {streaks.bestWinStreak}
              </span>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
            {streaks.bestWinStreakDates && (
              <div className="text-[10px] text-muted-foreground">
                {formatDateRange(streaks.bestWinStreakDates.start, streaks.bestWinStreakDates.end)}
              </div>
            )}
          </div>

          {/* Longest Drawdown */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              <span>Longest Drawdown</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {streaks.longestDrawdown}
              </span>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
            {streaks.longestDrawdownDates && (
              <div className="text-[10px] text-muted-foreground">
                {formatDateRange(streaks.longestDrawdownDates.start, streaks.longestDrawdownDates.end)}
              </div>
            )}
          </div>

          {/* Time to Recover */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>Recovery Time</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                {streaks.daysToRecover || '—'}
              </span>
              <span className="text-xs text-muted-foreground">
                {streaks.daysToRecover ? 'days' : ''}
              </span>
            </div>
            {streaks.daysToRecover > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Last major recovery
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
