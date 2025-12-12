"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade, EMOTIONAL_STATES, EmotionalState } from "@/types/supabase"
import { cn } from "@/lib/utils"

interface EmotionalStateWidgetProps {
  trades: Trade[]
}

interface EmotionalStats {
  state: EmotionalState
  label: string
  color: string
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  avgPnL: number
  avgR: number
}

export function EmotionalStateWidget({ trades }: EmotionalStateWidgetProps) {
  const [sortBy, setSortBy] = React.useState<'trades' | 'winRate' | 'pnl'>('trades')

  const stats = React.useMemo(() => {
    const emotionalStats: EmotionalStats[] = []

    EMOTIONAL_STATES.forEach((stateInfo) => {
      const stateTrades = trades.filter(t => t.emotional_state === stateInfo.value)

      if (stateTrades.length === 0) return

      const wins = stateTrades.filter(t => t.pnl > 0).length
      const losses = stateTrades.filter(t => t.pnl < 0).length
      const winRate = stateTrades.length > 0 ? (wins / stateTrades.length) * 100 : 0
      const totalPnL = stateTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      const avgPnL = stateTrades.length > 0 ? totalPnL / stateTrades.length : 0
      const avgR = stateTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / stateTrades.length

      emotionalStats.push({
        state: stateInfo.value,
        label: stateInfo.label,
        color: stateInfo.color,
        trades: stateTrades.length,
        wins,
        losses,
        winRate,
        totalPnL,
        avgPnL,
        avgR,
      })
    })

    // Sort based on selected metric
    return emotionalStats.sort((a, b) => {
      if (sortBy === 'trades') return b.trades - a.trades
      if (sortBy === 'winRate') return b.winRate - a.winRate
      return b.totalPnL - a.totalPnL
    })
  }, [trades, sortBy])

  const maxTrades = Math.max(...stats.map(s => s.trades), 1)
  const tradesWithEmotions = trades.filter(t => t.emotional_state).length
  const totalTrades = trades.length

  if (stats.length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Performance by Emotional State</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
            <p className="text-sm">No emotional state data yet.</p>
            <p className="text-xs mt-1">Start tracking your emotional state when recording trades.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Performance by Emotional State</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {tradesWithEmotions} of {totalTrades} trades tracked
            </p>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'trades' | 'winRate' | 'pnl')}
            className="px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="trades">Sort by Trades</option>
            <option value="winRate">Sort by Win Rate</option>
            <option value="pnl">Sort by P&L</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.state} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium", stat.color)}>
                    {stat.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    {stat.trades} trade{stat.trades !== 1 ? 's' : ''}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    stat.winRate >= 50 ? "text-green-600" : "text-red-500"
                  )}>
                    {stat.winRate.toFixed(0)}% win
                  </span>
                  <span className={cn(
                    "font-semibold min-w-[60px] text-right",
                    stat.totalPnL >= 0 ? "text-green-600" : "text-red-500"
                  )}>
                    {stat.totalPnL >= 0 ? '+' : ''}{stat.totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Progress bar showing trade count */}
              <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all",
                    stat.winRate >= 60 ? "bg-green-500" :
                    stat.winRate >= 50 ? "bg-green-400" :
                    stat.winRate >= 40 ? "bg-yellow-500" :
                    "bg-red-500"
                  )}
                  style={{ width: `${(stat.trades / maxTrades) * 100}%` }}
                />
              </div>

              {/* Detailed stats on hover */}
              <div className="hidden group-hover:flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>W: {stat.wins} / L: {stat.losses}</span>
                <span>Avg P&L: {stat.avgPnL >= 0 ? '+' : ''}{stat.avgPnL.toFixed(2)}</span>
                {stat.avgR !== 0 && !isNaN(stat.avgR) && (
                  <span>Avg R: {stat.avgR >= 0 ? '+' : ''}{stat.avgR.toFixed(2)}R</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary insights */}
        {stats.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {(() => {
                const bestState = [...stats].sort((a, b) => b.winRate - a.winRate)[0]
                const worstState = [...stats].sort((a, b) => a.winRate - b.winRate)[0]

                if (bestState.winRate > worstState.winRate + 10) {
                  return (
                    <>
                      <span className="font-semibold">{bestState.label}</span> shows your best performance ({bestState.winRate.toFixed(0)}% win rate).
                      Consider avoiding trading when feeling <span className="font-semibold">{worstState.label}</span> ({worstState.winRate.toFixed(0)}% win rate).
                    </>
                  )
                }
                return "Track more trades to discover patterns in your emotional performance."
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
