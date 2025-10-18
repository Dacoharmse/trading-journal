'use client'

import * as React from 'react'
import type { ScatterPoint } from '@/lib/analytics-selectors'
import { cn } from '@/lib/utils'

interface HoldTimeVsRScatterProps {
  data: ScatterPoint[]
}

export function HoldTimeVsRScatter({ data }: HoldTimeVsRScatterProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<ScatterPoint | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No hold time vs R data available
        </p>
      </div>
    )
  }

  const maxR = Math.max(...data.map((d) => Math.abs(d.r)), 1)
  const maxHold = Math.max(...data.map((d) => d.hold), 60)

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Hold Time vs R Multiple
      </h2>

      <div className="relative h-64 border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40">
        {/* Zero R line */}
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-400 dark:border-neutral-600" />

        {/* Y axis */}
        <div className="absolute inset-y-0 left-0 flex w-12 flex-col justify-between py-2 text-xs text-neutral-600 dark:text-neutral-400">
          <span>+{maxR.toFixed(0)}R</span>
          <span>0R</span>
          <span>-{maxR.toFixed(0)}R</span>
        </div>

        {/* Plot area */}
        <div className="relative ml-12 h-full">
          {data.map((point, i) => {
            const x = (point.hold / maxHold) * 100
            const y = 50 - (point.r / maxR) * 50

            return (
              <div
                key={i}
                className={cn(
                  'absolute h-2 w-2 -tranneutral-x-1 -tranneutral-y-1 rounded-full transition-all hover:scale-150',
                  point.r > 0
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-red-500 dark:bg-red-400'
                )}
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                title={`${point.date} ${point.symbol} ${point.playbookName || ''} ${point.r.toFixed(2)}R (${point.hold}m)`}
              />
            )
          })}
        </div>

        {/* X axis */}
        <div className="absolute inset-x-12 bottom-0 flex justify-between pb-1 text-xs text-neutral-600 dark:text-neutral-400">
          <span>0m</span>
          <span>{(maxHold / 2).toFixed(0)}m</span>
          <span>{maxHold.toFixed(0)}m</span>
        </div>
      </div>

      {hoveredPoint && (
        <div className="rounded border border-neutral-200 bg-neutral-100 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-800">
          <div className="font-medium text-neutral-900 dark:text-neutral-50">
            {hoveredPoint.date} - {hoveredPoint.symbol}
          </div>
          {hoveredPoint.playbookName && (
            <div className="text-neutral-600 dark:text-neutral-400">
              Playbook: {hoveredPoint.playbookName}
            </div>
          )}
          <div className="mt-1 flex gap-4">
            <span
              className={cn(
                'font-semibold',
                hoveredPoint.r > 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              )}
            >
              {hoveredPoint.r > 0 ? '+' : ''}
              {hoveredPoint.r.toFixed(2)}R
            </span>
            <span className="text-neutral-600 dark:text-neutral-400">
              {hoveredPoint.hold}min hold
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
        Scatter plot showing hold time vs R multiple. Hover over points for details.
      </p>
    </div>
  )
}
