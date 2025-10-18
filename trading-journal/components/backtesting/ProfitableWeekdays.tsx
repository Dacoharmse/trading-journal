'use client'

import type { Backtest } from '@/lib/backtest-selectors'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProfitableWeekdaysProps {
  backtests: Backtest[]
}

interface DayMetrics {
  day: string
  dayIndex: number
  n: number
  netR: number
  avgR: number
  winRate: number
}

export function ProfitableWeekdays({ backtests }: ProfitableWeekdaysProps) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const dayMetrics: DayMetrics[] = weekdays.map((day, index) => {
    // Monday = 1, Tuesday = 2, ..., Friday = 5
    const dayIndex = index + 1

    const dayTrades = backtests.filter((bt) => {
      if (!bt.entry_date || bt.result_r == null) return false
      const date = new Date(bt.entry_date)
      return date.getUTCDay() === dayIndex
    })

    const n = dayTrades.length
    const netR = dayTrades.reduce((sum, t) => sum + (t.result_r ?? 0), 0)
    const avgR = n > 0 ? netR / n : 0
    const wins = dayTrades.filter((t) => (t.result_r ?? 0) > 0).length
    const winRate = n > 0 ? wins / n : 0

    return {
      day,
      dayIndex,
      n,
      netR,
      avgR,
      winRate,
    }
  })

  const maxNetR = Math.max(...dayMetrics.map((d) => Math.abs(d.netR)), 0.01)

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200/70 bg-white/80 p-4 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
        Most Profitable Weekdays
      </h2>

      <div className="space-y-2">
        {dayMetrics.map((metric) => {
          const barHeight = (Math.abs(metric.netR) / maxNetR) * 100
          const isPositive = metric.netR > 0

          return (
            <div key={metric.day} className="flex items-center gap-3">
              {/* Day label */}
              <div className="flex w-20 shrink-0 items-center gap-1.5">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {metric.day.substring(0, 3)}
                </span>
                {metric.n > 0 && metric.n < 10 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    *
                  </span>
                )}
              </div>

              {/* Chart bar */}
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-neutral-200/80 dark:bg-neutral-800/80">
                {metric.n > 0 && (
                  <>
                    {/* Midline */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-400/60 dark:bg-neutral-600/60" />

                    {/* Bar */}
                    <div
                      className={cn(
                        'absolute inset-y-0 transition-all',
                        isPositive
                          ? 'bg-emerald-500/90 dark:bg-emerald-400/90'
                          : 'bg-red-500/90 dark:bg-red-400/90',
                        metric.n < 10 && 'opacity-50'
                      )}
                      style={
                        isPositive
                          ? {
                              left: '50%',
                              width: `${barHeight / 2}%`,
                            }
                          : {
                              right: '50%',
                              width: `${barHeight / 2}%`,
                            }
                      }
                    />

                    {/* Value label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                        {metric.avgR.toFixed(2)}R avg
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Metrics */}
              <div className="flex w-32 shrink-0 items-center justify-end gap-2 text-xs">
                {metric.n > 0 && (
                  <>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {(metric.winRate * 100).toFixed(0)}% WR
                    </span>
                    <Badge
                      variant="secondary"
                      className="min-w-[55px] justify-center text-xs"
                    >
                      n={metric.n}
                    </Badge>
                  </>
                )}
              </div>

              {/* Net R */}
              <div className="w-20 shrink-0 text-right">
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    isPositive
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : metric.n > 0
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-neutral-400 dark:text-neutral-500'
                  )}
                >
                  {metric.n === 0
                    ? '—'
                    : `${isPositive ? '+' : ''}${metric.netR.toFixed(2)}R`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
        * Exploratory (n&lt;10)
      </p>
    </div>
  )
}
