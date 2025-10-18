'use client'

import type { KPIs } from '@/lib/analytics-selectors'
import { cn } from '@/lib/utils'

interface ExpectancyLadderProps {
  kpis: KPIs
}

export function ExpectancyLadder({ kpis }: ExpectancyLadderProps) {
  const { winRate, avgWinR, avgLossR, expectancyR } = kpis

  const maxBar = Math.max(avgWinR, avgLossR, 1)

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Expectancy Ladder
      </h2>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-200">Win Rate</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
              {(winRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400"
              style={{ width: `${winRate * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-200">Avg Win (R)</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
              +{avgWinR.toFixed(2)}R
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full bg-green-500 dark:bg-green-400"
              style={{ width: `${(avgWinR / maxBar) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              Avg Loss (R)
            </span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
              -{avgLossR.toFixed(2)}R
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full bg-red-500 dark:bg-red-400"
              style={{ width: `${(avgLossR / maxBar) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mt-4 rounded-md border p-3 text-center',
          expectancyR > 0
            ? 'border-emerald-300/60 bg-emerald-100/70 dark:border-emerald-700/60 dark:bg-emerald-900/30'
            : 'border-red-300/60 bg-red-100/70 dark:border-red-700/60 dark:bg-red-900/30'
        )}
      >
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
          Expectancy
        </div>
        <div
          className={cn(
            'mt-1 text-2xl font-bold',
            expectancyR > 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-700 dark:text-red-300'
          )}
        >
          {expectancyR > 0 ? '+' : ''}
          {expectancyR.toFixed(3)}R
        </div>
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          {(winRate * 100).toFixed(1)}% × {avgWinR.toFixed(2)}R − {((1 - winRate) * 100).toFixed(1)}% ×{' '}
          {avgLossR.toFixed(2)}R
        </div>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
        Expectancy formula: Win% × AvgWinR − (1 − Win%) × |AvgLossR|
      </p>
    </div>
  )
}
