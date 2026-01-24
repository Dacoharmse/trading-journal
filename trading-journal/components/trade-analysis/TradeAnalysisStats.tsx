'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import type { Trade } from '@/types/supabase'
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react'

interface TradeAnalysisStatsProps {
  trades: Trade[]
}

export function TradeAnalysisStats({ trades }: TradeAnalysisStatsProps) {
  const stats = React.useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnl: 0,
        totalR: 0,
        avgWin: 0,
        avgLoss: 0,
        avgR: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
      }
    }

    const wins = trades.filter(t => t.pnl > 0)
    const losses = trades.filter(t => t.pnl < 0)

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
    const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)

    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0)
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))

    const avgWin = wins.length > 0 ? totalWins / wins.length : 0
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0

    const pnlValues = trades.map(t => t.pnl)
    const largestWin = Math.max(...pnlValues, 0)
    const largestLoss = Math.min(...pnlValues, 0)

    const expectancy = totalPnl / trades.length

    return {
      totalTrades: trades.length,
      winRate: (wins.length / trades.length) * 100,
      totalPnl,
      totalR,
      avgWin,
      avgLoss,
      avgR: totalR / trades.length,
      profitFactor,
      largestWin,
      largestLoss,
      expectancy,
    }
  }, [trades])

  const StatCard = ({ icon, label, value, trend, className = '' }: any) => (
    <div className={`p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</div>
        {icon}
      </div>
      <div className={`text-xl font-bold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-neutral-900 dark:text-white'}`}>
        {value}
      </div>
    </div>
  )

  return (
    <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Performance Metrics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<Award className="w-4 h-4 text-blue-600" />}
            label="Total Trades"
            value={stats.totalTrades}
          />

          <StatCard
            icon={<Target className="w-4 h-4 text-green-600" />}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            trend={stats.winRate >= 50 ? 'up' : 'down'}
          />

          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            label="Total P&L"
            value={`$${stats.totalPnl.toLocaleString()}`}
            trend={stats.totalPnl >= 0 ? 'up' : 'down'}
          />

          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
            label="Total R"
            value={`${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(1)}R`}
            trend={stats.totalR >= 0 ? 'up' : 'down'}
          />

          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            label="Avg Win"
            value={`$${stats.avgWin.toFixed(0)}`}
            trend="up"
          />

          <StatCard
            icon={<TrendingDown className="w-4 h-4 text-red-600" />}
            label="Avg Loss"
            value={`$${stats.avgLoss.toFixed(0)}`}
            trend="down"
          />

          <StatCard
            icon={<Award className="w-4 h-4 text-indigo-600" />}
            label="Profit Factor"
            value={stats.profitFactor.toFixed(2)}
            trend={stats.profitFactor >= 1.5 ? 'up' : stats.profitFactor < 1 ? 'down' : undefined}
          />

          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            label="Largest Win"
            value={`$${stats.largestWin.toFixed(0)}`}
            trend="up"
          />

          <StatCard
            icon={<TrendingDown className="w-4 h-4 text-red-600" />}
            label="Largest Loss"
            value={`$${Math.abs(stats.largestLoss).toFixed(0)}`}
            trend="down"
          />

          <StatCard
            icon={<Target className="w-4 h-4 text-blue-600" />}
            label="Expectancy"
            value={`$${stats.expectancy.toFixed(0)}`}
            trend={stats.expectancy >= 0 ? 'up' : 'down'}
          />

          <StatCard
            icon={<Award className="w-4 h-4 text-purple-600" />}
            label="Avg R"
            value={`${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`}
            trend={stats.avgR >= 0 ? 'up' : 'down'}
          />
        </div>
      </div>
    </Card>
  )
}
