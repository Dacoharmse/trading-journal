'use client'

import type { DOWMetrics } from '@/lib/analytics-selectors'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface BreakdownByDOWProps {
  data: DOWMetrics[]
}

export function BreakdownByDOW({ data }: BreakdownByDOWProps) {
  const maxExpectancy = Math.max(...data.map((d) => Math.abs(d.expectancyR)), 0.01)

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Performance by Day of Week
      </h2>

      <div className="space-y-3">
        {data.map((item) => {
          const isExploratory = item.n < 30
          const barWidth = (Math.abs(item.expectancyR) / maxExpectancy) * 100
          const isPositive = item.expectancyR > 0

          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-10 font-medium text-neutral-700 dark:text-neutral-200">
                    {item.key}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      isExploratory &&
                        'border-amber-300/60 bg-amber-100/60 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-300'
                    )}
                  >
                    n={item.n}
                  </Badge>
                </div>
                <span
                  className={cn(
                    'font-semibold',
                    isPositive
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {item.expectancyR.toFixed(3)}R
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className={cn(
                    'h-full transition-all',
                    isPositive
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-red-500 dark:bg-red-400',
                    isExploratory && 'opacity-40'
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
        Days with n&lt;30 are dimmed (exploratory). Bars show expectancy in R.
      </p>
    </div>
  )
}
