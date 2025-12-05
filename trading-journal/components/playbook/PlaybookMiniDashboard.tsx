'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  BarChart3,
  Flame,
  Award,
  Clock,
} from 'lucide-react'

export interface PlaybookStats {
  playbook_id: string
  total_trades: number
  wins: number
  losses: number
  breakeven: number
  win_rate: number
  total_pnl: number
  total_r: number
  avg_r: number
  expectancy: number
  profit_factor: number
  best_trade_r: number
  worst_trade_r: number
  avg_winner_r: number
  avg_loser_r: number
  current_streak: number // positive = win streak, negative = loss streak
  max_win_streak: number
  max_loss_streak: number
  avg_hold_time_min?: number
  last_trade_date?: string
}

interface PlaybookMiniDashboardProps {
  stats: PlaybookStats | null
  compact?: boolean
  showTitle?: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'neutral',
  compact = false,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  color?: 'emerald' | 'red' | 'blue' | 'purple' | 'amber' | 'neutral'
  compact?: boolean
}) {
  const colorClasses = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    amber: 'text-amber-600 dark:text-amber-400',
    neutral: 'text-neutral-600 dark:text-neutral-400',
  }

  const bgClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30',
    red: 'bg-red-50 dark:bg-red-950/30',
    blue: 'bg-blue-50 dark:bg-blue-950/30',
    purple: 'bg-purple-50 dark:bg-purple-950/30',
    amber: 'bg-amber-50 dark:bg-amber-950/30',
    neutral: 'bg-neutral-50 dark:bg-neutral-900/50',
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', colorClasses[color])} />
        <div className="flex items-baseline gap-1">
          <span className={cn('text-sm font-semibold', colorClasses[color])}>{value}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg p-3', bgClasses[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', colorClasses[color])} />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
      <div className={cn('text-lg font-bold', colorClasses[color])}>{value}</div>
      {subValue && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subValue}</div>
      )}
    </div>
  )
}

export function PlaybookMiniDashboard({
  stats,
  compact = false,
  showTitle = true,
}: PlaybookMiniDashboardProps) {
  if (!stats || stats.total_trades === 0) {
    return (
      <div className={cn(
        'rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700',
        compact ? 'p-3' : 'p-4'
      )}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
          No trades recorded yet
        </p>
      </div>
    )
  }

  const isPositiveR = stats.total_r >= 0
  const isGoodWinRate = stats.win_rate >= 50
  const streakColor = stats.current_streak > 0 ? 'emerald' : stats.current_streak < 0 ? 'red' : 'neutral'
  const streakText = stats.current_streak > 0
    ? `${stats.current_streak}W`
    : stats.current_streak < 0
      ? `${Math.abs(stats.current_streak)}L`
      : '—'

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <StatCard
          icon={BarChart3}
          label="trades"
          value={stats.total_trades}
          color="neutral"
          compact
        />
        <StatCard
          icon={Percent}
          label="win"
          value={`${stats.win_rate.toFixed(0)}%`}
          color={isGoodWinRate ? 'emerald' : 'red'}
          compact
        />
        <StatCard
          icon={isPositiveR ? TrendingUp : TrendingDown}
          label="R"
          value={`${isPositiveR ? '+' : ''}${stats.total_r.toFixed(1)}`}
          color={isPositiveR ? 'emerald' : 'red'}
          compact
        />
        <StatCard
          icon={Target}
          label="exp"
          value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`}
          color={stats.expectancy >= 0 ? 'emerald' : 'red'}
          compact
        />
        {stats.current_streak !== 0 && (
          <StatCard
            icon={Flame}
            label="streak"
            value={streakText}
            color={streakColor}
            compact
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Performance Stats
          </h3>
          <span className="text-xs text-neutral-500 ml-auto">
            {stats.total_trades} trades
          </span>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Percent}
          label="Win Rate"
          value={`${stats.win_rate.toFixed(1)}%`}
          subValue={`${stats.wins}W / ${stats.losses}L`}
          color={isGoodWinRate ? 'emerald' : 'red'}
        />
        <StatCard
          icon={isPositiveR ? TrendingUp : TrendingDown}
          label="Total R"
          value={`${isPositiveR ? '+' : ''}${stats.total_r.toFixed(2)}R`}
          subValue={`Avg: ${stats.avg_r >= 0 ? '+' : ''}${stats.avg_r.toFixed(2)}R`}
          color={isPositiveR ? 'emerald' : 'red'}
        />
        <StatCard
          icon={Target}
          label="Expectancy"
          value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`}
          subValue="per trade"
          color={stats.expectancy >= 0 ? 'emerald' : 'red'}
        />
        <StatCard
          icon={Award}
          label="Profit Factor"
          value={stats.profit_factor === Infinity ? '∞' : stats.profit_factor.toFixed(2)}
          subValue={stats.profit_factor >= 1.5 ? 'Good' : stats.profit_factor >= 1 ? 'Break-even' : 'Negative'}
          color={stats.profit_factor >= 1.5 ? 'emerald' : stats.profit_factor >= 1 ? 'amber' : 'red'}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Avg Winner</div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +{stats.avg_winner_r.toFixed(2)}R
          </div>
        </div>
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Avg Loser</div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
            {stats.avg_loser_r.toFixed(2)}R
          </div>
        </div>
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Current Streak</div>
          <div className={cn(
            'text-sm font-semibold flex items-center gap-1',
            stats.current_streak > 0 ? 'text-emerald-600 dark:text-emerald-400' :
            stats.current_streak < 0 ? 'text-red-600 dark:text-red-400' :
            'text-neutral-600 dark:text-neutral-400'
          )}>
            {stats.current_streak !== 0 && <Flame className="h-3.5 w-3.5" />}
            {streakText}
          </div>
        </div>
      </div>

      {/* Best/Worst + Streaks */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
        <div className="flex gap-4">
          <span>
            Best: <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{stats.best_trade_r.toFixed(2)}R</span>
          </span>
          <span>
            Worst: <span className="text-red-600 dark:text-red-400 font-medium">{stats.worst_trade_r.toFixed(2)}R</span>
          </span>
        </div>
        <div className="flex gap-4">
          <span>Max Win Streak: <span className="font-medium">{stats.max_win_streak}</span></span>
          <span>Max Loss Streak: <span className="font-medium">{stats.max_loss_streak}</span></span>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate stats from trades
export function calculatePlaybookStats(
  playbookId: string,
  trades: Array<{
    id: string
    playbook_id?: string | null
    pnl: number
    r_multiple?: number | null
    closed_at?: string | null
    opened_at?: string | null
  }>
): PlaybookStats {
  const playbookTrades = trades
    .filter(t => t.playbook_id === playbookId)
    .sort((a, b) => {
      const dateA = a.closed_at ? new Date(a.closed_at).getTime() : 0
      const dateB = b.closed_at ? new Date(b.closed_at).getTime() : 0
      return dateA - dateB
    })

  const total_trades = playbookTrades.length
  const wins = playbookTrades.filter(t => t.pnl > 0).length
  const losses = playbookTrades.filter(t => t.pnl < 0).length
  const breakeven = playbookTrades.filter(t => t.pnl === 0).length
  const win_rate = total_trades > 0 ? (wins / total_trades) * 100 : 0
  const total_pnl = playbookTrades.reduce((sum, t) => sum + t.pnl, 0)
  const total_r = playbookTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
  const avg_r = total_trades > 0 ? total_r / total_trades : 0

  const winners = playbookTrades.filter(t => t.pnl > 0)
  const losers = playbookTrades.filter(t => t.pnl < 0)

  const avg_winner_r = winners.length > 0
    ? winners.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / winners.length
    : 0
  const avg_loser_r = losers.length > 0
    ? losers.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / losers.length
    : 0

  const expectancy = (win_rate / 100) * avg_winner_r + ((100 - win_rate) / 100) * avg_loser_r

  const total_winner_r = winners.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
  const total_loser_r = Math.abs(losers.reduce((sum, t) => sum + (t.r_multiple || 0), 0))
  const profit_factor = total_loser_r > 0 ? total_winner_r / total_loser_r : total_winner_r > 0 ? Infinity : 0

  const rMultiples = playbookTrades.map(t => t.r_multiple || 0)
  const best_trade_r = rMultiples.length > 0 ? Math.max(...rMultiples) : 0
  const worst_trade_r = rMultiples.length > 0 ? Math.min(...rMultiples) : 0

  // Calculate streaks
  let current_streak = 0
  let max_win_streak = 0
  let max_loss_streak = 0
  let tempWinStreak = 0
  let tempLossStreak = 0

  playbookTrades.forEach(trade => {
    if (trade.pnl > 0) {
      tempWinStreak++
      tempLossStreak = 0
      max_win_streak = Math.max(max_win_streak, tempWinStreak)
    } else if (trade.pnl < 0) {
      tempLossStreak++
      tempWinStreak = 0
      max_loss_streak = Math.max(max_loss_streak, tempLossStreak)
    }
  })

  // Current streak from most recent trades
  for (let i = playbookTrades.length - 1; i >= 0; i--) {
    const trade = playbookTrades[i]
    if (current_streak === 0) {
      current_streak = trade.pnl > 0 ? 1 : trade.pnl < 0 ? -1 : 0
    } else if (current_streak > 0 && trade.pnl > 0) {
      current_streak++
    } else if (current_streak < 0 && trade.pnl < 0) {
      current_streak--
    } else {
      break
    }
  }

  const last_trade = playbookTrades[playbookTrades.length - 1]
  const last_trade_date = last_trade?.closed_at || undefined

  return {
    playbook_id: playbookId,
    total_trades,
    wins,
    losses,
    breakeven,
    win_rate,
    total_pnl,
    total_r,
    avg_r,
    expectancy,
    profit_factor,
    best_trade_r,
    worst_trade_r,
    avg_winner_r,
    avg_loser_r,
    current_streak,
    max_win_streak,
    max_loss_streak,
    last_trade_date,
  }
}
