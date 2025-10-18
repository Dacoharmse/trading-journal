'use client'

import type { PlaybookGradeMetrics } from '@/lib/analytics-selectors'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PlaybookGradeChartProps {
  data: PlaybookGradeMetrics[]
}

export function PlaybookGradeChart({ data }: PlaybookGradeChartProps) {
  const maxExpectancy = Math.max(...data.map((d) => Math.abs(d.expectancyR)), 0.01)
  const maxScore = Math.max(...data.map((d) => d.avgScore), 1)

  const gradeColors: Record<string, string> = {
    'A+': 'bg-emerald-600 dark:bg-emerald-500',
    A: 'bg-emerald-500 dark:bg-emerald-400',
    B: 'bg-neutral-500 dark:bg-neutral-400',
    C: 'bg-yellow-500 dark:bg-yellow-400',
    D: 'bg-orange-500 dark:bg-orange-400',
    F: 'bg-red-500 dark:bg-red-400',
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Playbook Grade vs Performance
      </h2>

      <div className="space-y-4">
        {data.map((item) => {
          const hasData = item.n > 0
          const barHeight = hasData ? (Math.abs(item.expectancyR) / maxExpectancy) * 100 : 0
          const scoreBarWidth = hasData ? (item.avgScore / maxScore) * 100 : 0
          const isPositive = item.expectancyR > 0

          return (
            <div key={item.grade} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-center font-bold text-neutral-900 dark:text-neutral-50">
                    {item.grade}
                  </span>
                  {hasData && (
                    <Badge variant="secondary" className="text-xs">
                      n={item.n}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Score: {hasData ? (item.avgScore * 100).toFixed(0) : 0}%
                  </span>
                  <span
                    className={cn(
                      'font-semibold',
                      hasData
                        ? isPositive
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-red-700 dark:text-red-300'
                        : 'text-neutral-400 dark:text-neutral-500'
                    )}
                  >
                    {hasData ? (isPositive ? '+' : '') + item.expectancyR.toFixed(3) : '—'}R
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="h-8 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                    {hasData && (
                      <div
                        className={cn(
                          'h-full transition-all',
                          gradeColors[item.grade] || 'bg-neutral-400'
                        )}
                        style={{ width: `${barHeight}%` }}
                      />
                    )}
                  </div>
                </div>
                <div className="w-24">
                  <div className="h-8 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                    {hasData && (
                      <div
                        className="h-full bg-purple-500 dark:bg-purple-400"
                        style={{ width: `${scoreBarWidth}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
        <span>← Expectancy (R)</span>
        <span>Setup Score →</span>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
        Compares setup grade (A+ to F) with expectancy in R and average setup score.
      </p>
    </div>
  )
}
