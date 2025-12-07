'use client'

import type { Backtest } from '@/lib/backtest-selectors'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, Calendar, Clock, Award } from 'lucide-react'

interface BacktestDashboardProps {
  backtests: Backtest[]
}

export function BacktestDashboard({ backtests }: BacktestDashboardProps) {
  // Calculate key metrics
  const totalTrades = backtests.length
  const wins = backtests.filter(bt => bt.result_r > 0).length
  const losses = backtests.filter(bt => bt.result_r < 0).length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

  // Calculate average R
  const avgR = totalTrades > 0
    ? backtests.reduce((sum, bt) => sum + bt.result_r, 0) / totalTrades
    : 0

  // Calculate max win and max loss
  const maxWin = backtests.length > 0
    ? Math.max(...backtests.map(bt => bt.result_r))
    : 0
  const maxLoss = backtests.length > 0
    ? Math.min(...backtests.map(bt => bt.result_r))
    : 0

  // Calculate profit factor
  const totalWinR = backtests.filter(bt => bt.result_r > 0).reduce((sum, bt) => sum + bt.result_r, 0)
  const totalLossR = Math.abs(backtests.filter(bt => bt.result_r < 0).reduce((sum, bt) => sum + bt.result_r, 0))
  const profitFactor = totalLossR > 0 ? totalWinR / totalLossR : 0

  // Calculate expectancy
  const avgWin = wins > 0 ? totalWinR / wins : 0
  const avgLoss = losses > 0 ? totalLossR / losses : 0
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss

  // Best trading days (group by day of week)
  const dayOfWeekStats: { [key: string]: { wins: number; total: number } } = {}
  backtests.forEach(bt => {
    const date = new Date(bt.entry_date)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    if (!dayOfWeekStats[dayName]) {
      dayOfWeekStats[dayName] = { wins: 0, total: 0 }
    }
    dayOfWeekStats[dayName].total++
    if (bt.result_r > 0) dayOfWeekStats[dayName].wins++
  })

  const bestDay = Object.entries(dayOfWeekStats).sort((a, b) => {
    const aRate = a[1].total > 0 ? a[1].wins / a[1].total : 0
    const bRate = b[1].total > 0 ? b[1].wins / b[1].total : 0
    return bRate - aRate
  })[0]

  // Calculate average holding time
  const avgHoldingMinutes = backtests.filter(bt => bt.hold_time).length > 0
    ? backtests.filter(bt => bt.hold_time).reduce((sum, bt) => sum + (bt.hold_time || 0), 0) / backtests.filter(bt => bt.hold_time).length
    : 0

  // Get recommended TP and SL
  const backtestsWithMetrics = backtests.filter(bt => bt.planned_sl_pips && bt.planned_tp_pips)
  const avgSL = backtestsWithMetrics.length > 0
    ? backtestsWithMetrics.reduce((sum, bt) => sum + (bt.planned_sl_pips || 0), 0) / backtestsWithMetrics.length
    : 0
  const avgTP = backtestsWithMetrics.length > 0
    ? backtestsWithMetrics.reduce((sum, bt) => sum + (bt.planned_tp_pips || 0), 0) / backtestsWithMetrics.length
    : 0
  const avgRR = avgSL > 0 ? avgTP / avgSL : 0

  const metrics = [
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      subtext: `${wins}W / ${losses}L`,
      icon: Target,
      color: winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      bg: winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30',
      border: winRate >= 50 ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'
    },
    {
      label: 'Expectancy',
      value: `${expectancy > 0 ? '+' : ''}${expectancy.toFixed(2)}R`,
      subtext: 'Per trade',
      icon: TrendingUp,
      color: expectancy > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bg: expectancy > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
      border: expectancy > 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'
    },
    {
      label: 'Profit Factor',
      value: profitFactor.toFixed(2),
      subtext: profitFactor > 1 ? 'Profitable' : 'Unprofitable',
      icon: Award,
      color: profitFactor > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bg: profitFactor > 1 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
      border: profitFactor > 1 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'
    },
    {
      label: 'Average R',
      value: `${avgR > 0 ? '+' : ''}${avgR.toFixed(2)}R`,
      subtext: `Max: ${maxWin > 0 ? '+' : ''}${maxWin.toFixed(2)}R`,
      icon: TrendingUp,
      color: avgR > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bg: avgR > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
      border: avgR > 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'
    },
    {
      label: 'Best Day',
      value: bestDay ? bestDay[0] : 'N/A',
      subtext: bestDay ? `${((bestDay[1].wins / bestDay[1].total) * 100).toFixed(0)}% WR` : '',
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800'
    },
    {
      label: 'Avg Holding',
      value: avgHoldingMinutes > 0 ? `${avgHoldingMinutes.toFixed(0)}min` : 'N/A',
      subtext: avgHoldingMinutes > 60 ? `${(avgHoldingMinutes / 60).toFixed(1)}h` : '',
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className={cn(
                'rounded-lg border p-4 transition-all hover:shadow-md',
                metric.bg,
                metric.border
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {metric.label}
                  </p>
                  <p className={cn('mt-1 text-2xl font-bold', metric.color)}>
                    {metric.value}
                  </p>
                  {metric.subtext && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {metric.subtext}
                    </p>
                  )}
                </div>
                <Icon className={cn('h-5 w-5', metric.color)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommended Trade Metrics */}
      {backtestsWithMetrics.length > 0 && (
        <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Recommended Playbook Settings
            </h3>
            <Badge variant="secondary">
              Based on {backtestsWithMetrics.length} {backtestsWithMetrics.length === 1 ? 'trade' : 'trades'}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-blue-200/70 bg-blue-50/50 p-4 dark:border-blue-800/60 dark:bg-blue-900/30">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Average SL
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-50">
                {avgSL.toFixed(1)}
              </div>
              <div className="mt-1 text-sm text-blue-600 dark:text-blue-400">pips</div>
              <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Recommended stop loss for this playbook
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-800/60 dark:bg-emerald-900/30">
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Average TP
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-900 dark:text-emerald-50">
                {avgTP.toFixed(1)}
              </div>
              <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">pips</div>
              <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Recommended take profit for this playbook
              </div>
            </div>

            <div className="rounded-lg border border-purple-200/70 bg-purple-50/50 p-4 dark:border-purple-800/60 dark:bg-purple-900/30">
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Risk:Reward
              </div>
              <div className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-50">
                1:{avgRR.toFixed(1)}
              </div>
              <div className="mt-1 text-sm text-purple-600 dark:text-purple-400">ratio</div>
              <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Optimal R:R based on backtest data
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Session Breakdown */}
      {Object.keys(dayOfWeekStats).length > 0 && (
        <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Best Trading Days
          </h3>
          <div className="space-y-3">
            {Object.entries(dayOfWeekStats)
              .sort((a, b) => {
                const aRate = a[1].total > 0 ? a[1].wins / a[1].total : 0
                const bRate = b[1].total > 0 ? b[1].wins / b[1].total : 0
                return bRate - aRate
              })
              .map(([day, stats]) => {
                const dayWinRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {day}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className={cn(
                            'flex h-full items-center justify-end px-3 text-xs font-semibold text-white transition-all',
                            dayWinRate >= 60
                              ? 'bg-emerald-500 dark:bg-emerald-600'
                              : dayWinRate >= 40
                              ? 'bg-amber-500 dark:bg-amber-600'
                              : 'bg-red-500 dark:bg-red-600'
                          )}
                          style={{ width: `${dayWinRate}%` }}
                        >
                          {dayWinRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="w-24 text-right text-xs text-neutral-600 dark:text-neutral-400">
                      {stats.wins}W / {stats.total - stats.wins}L
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
