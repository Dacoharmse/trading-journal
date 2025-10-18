'use client'

import type { EquityPoint } from '@/lib/backtest-selectors'
import { cn } from '@/lib/utils'

interface EquityCurveChartProps {
  data: EquityPoint[]
}

export function EquityCurveChart({ data }: EquityCurveChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No equity data available</p>
      </div>
    )
  }

  const maxR = Math.max(...data.map((d) => d.cumulativeR), 0)
  const minR = Math.min(...data.map((d) => d.cumulativeR), 0)
  const range = Math.max(Math.abs(maxR), Math.abs(minR), 1)

  const points = data.map((point, i) => {
    const x = (i / (data.length - 1 || 1)) * 100
    const y = 50 - (point.cumulativeR / range) * 45
    return { x, y, ...point }
  })

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="space-y-3">
      <div className="relative h-64 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Zero line */}
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeDasharray="2 2"
            className="text-neutral-400 dark:text-neutral-600"
            vectorEffect="non-scaling-stroke"
          />

          {/* Equity curve */}
          <path
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn(
              data[data.length - 1].cumulativeR > 0
                ? 'text-emerald-500 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400'
            )}
            vectorEffect="non-scaling-stroke"
          />

          {/* Area fill */}
          <path
            d={`${pathData} L 100 50 L 0 50 Z`}
            className={cn(
              data[data.length - 1].cumulativeR > 0
                ? 'fill-emerald-500/10 dark:fill-emerald-400/10'
                : 'fill-red-500/10 dark:fill-red-400/10'
            )}
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute inset-y-0 left-0 flex w-16 flex-col justify-between py-4 text-xs text-neutral-600 dark:text-neutral-400">
          <span>+{maxR.toFixed(1)}R</span>
          <span>0R</span>
          <span>-{Math.abs(minR).toFixed(1)}R</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
        <span>{data[0]?.date}</span>
        <span
          className={cn(
            'font-semibold',
            data[data.length - 1].cumulativeR > 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-700 dark:text-red-300'
          )}
        >
          Final: {data[data.length - 1].cumulativeR > 0 ? '+' : ''}
          {data[data.length - 1].cumulativeR.toFixed(2)}R
        </span>
        <span>{data[data.length - 1]?.date}</span>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
        Cumulative R equity curve over {data.length} backtested trades
      </p>
    </div>
  )
}
