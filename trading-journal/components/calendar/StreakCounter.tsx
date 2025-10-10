"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, TrendingUp, TrendingDown, Calendar } from "lucide-react"

interface StreakCounterProps {
  currentStreak: number
  currentStreakType: 'win' | 'loss' | 'none'
  bestWinStreak: number
  bestWinStreakDates: { start: string; end: string } | null
  worstLossStreak: number
  worstLossStreakDates: { start: string; end: string } | null
}

export function StreakCounter({
  currentStreak,
  currentStreakType,
  bestWinStreak,
  bestWinStreakDates,
  worstLossStreak,
  worstLossStreakDates,
}: StreakCounterProps) {
  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    if (start === end) {
      return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Streak */}
      <Card className="bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Current Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${
              currentStreakType === 'win'
                ? 'text-green-600 dark:text-green-400'
                : currentStreakType === 'loss'
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            }`}>
              {currentStreak}
            </span>
            <span className="text-sm text-muted-foreground">
              {currentStreakType === 'win' ? 'wins' : currentStreakType === 'loss' ? 'losses' : 'days'}
            </span>
          </div>
          {currentStreakType !== 'none' && (
            <p className="text-xs text-muted-foreground mt-2">
              Keep it {currentStreakType === 'win' ? 'going!' : 'under control'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Best Win Streak */}
      <Card className="bg-gradient-to-br from-green-50/80 to-green-100/60 dark:from-green-950/30 dark:to-green-900/20 backdrop-blur-sm border-green-200 dark:border-green-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
            <TrendingUp className="h-4 w-4" />
            Best Win Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-green-600 dark:text-green-400">
              {bestWinStreak}
            </span>
            <span className="text-sm text-green-700/70 dark:text-green-400/70">days</span>
          </div>
          {bestWinStreakDates && (
            <p className="text-xs text-green-700/60 dark:text-green-400/60 mt-2">
              {formatDateRange(bestWinStreakDates.start, bestWinStreakDates.end)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Worst Loss Streak */}
      <Card className="bg-gradient-to-br from-red-50/80 to-red-100/60 dark:from-red-950/30 dark:to-red-900/20 backdrop-blur-sm border-red-200 dark:border-red-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
            <TrendingDown className="h-4 w-4" />
            Longest Drawdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-red-600 dark:text-red-400">
              {worstLossStreak}
            </span>
            <span className="text-sm text-red-700/70 dark:text-red-400/70">days</span>
          </div>
          {worstLossStreakDates && (
            <p className="text-xs text-red-700/60 dark:text-red-400/60 mt-2">
              {formatDateRange(worstLossStreakDates.start, worstLossStreakDates.end)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
