'use client'

import type { Backtest } from '@/lib/backtest-selectors'
import { calculateRecommendedMetrics } from '@/lib/backtest-selectors'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RecommendedMetricsProps {
  backtests: Backtest[]
}

export function RecommendedMetrics({ backtests }: RecommendedMetricsProps) {
  const recommended = calculateRecommendedMetrics(backtests)

  if (!recommended) {
    return (
      <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-4 dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Recommended Trade Metrics
        </h2>
        <div className="rounded border border-amber-200/70 bg-amber-50/70 p-4 text-center dark:border-amber-800/60 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Add planned metrics to your backtests to see recommendations
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Record your planned SL, TP, and R:R for each trade
          </p>
        </div>
      </div>
    )
  }

  const { slPips, tpPips, rr, sampleSize, confidence } = recommended

  const confidenceConfig = {
    low: {
      label: 'Low Confidence',
      color:
        'border-amber-300/60 bg-amber-100/60 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-300',
      description: 'Need more data (n<10)',
    },
    medium: {
      label: 'Medium Confidence',
      color:
        'border-amber-300/60 bg-amber-100/60 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-300',
      description: 'Getting reliable (n≥10)',
    },
    high: {
      label: 'High Confidence',
      color:
        'border-emerald-300/60 bg-emerald-100/60 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-300',
      description: 'Strong data (n≥30)',
    },
  }

  const config = confidenceConfig[confidence]

  return (
    <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-4 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Recommended Trade Metrics
        </h2>
        <Badge variant="secondary" className={cn('text-xs', config.color)}>
          {config.label}
        </Badge>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-200/70 bg-neutral-50/50 p-3 dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Stop Loss
          </div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {slPips.toFixed(1)}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">pips</div>
        </div>

        <div className="rounded-lg border border-neutral-200/70 bg-neutral-50/50 p-3 dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Take Profit
          </div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {tpPips.toFixed(1)}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">pips</div>
        </div>

        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-800/60 dark:bg-emerald-900/50">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Risk:Reward
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-50">
            {rr.toFixed(1)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">R:R</div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
        <p>
          <strong className="text-neutral-700 dark:text-neutral-300">Based on:</strong> {sampleSize}{' '}
          backtested {sampleSize === 1 ? 'trade' : 'trades'} with planned metrics
        </p>
        <p>
          <strong className="text-neutral-700 dark:text-neutral-300">Method:</strong> Median values
          (more robust against outliers)
        </p>
        {confidence === 'low' && (
          <p className="text-amber-600 dark:text-amber-400">
            ⚠️ Add more backtests for more reliable recommendations
          </p>
        )}
      </div>
    </div>
  )
}
