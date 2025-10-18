'use client'

import * as React from 'react'
import type { HistogramBucket } from '@/lib/analytics-selectors'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DistributionsProps {
  rHist: HistogramBucket[]
  maeHist: HistogramBucket[]
  mfeHist: HistogramBucket[]
  holdHist: HistogramBucket[]
}

export function Distributions({ rHist, maeHist, mfeHist, holdHist }: DistributionsProps) {
  const renderRHistogram = () => {
    if (rHist.length === 0) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          No R data available
        </div>
      )
    }

    const maxCount = Math.max(...rHist.map((b) => b.count), 1)

    return (
      <div className="space-y-2">
        <div className="flex h-48 items-end gap-0.5">
          {rHist.map((bucket, i) => {
            const height = (bucket.count / maxCount) * 100
            const isZeroR = bucket.min <= 0 && bucket.max > 0
            const isPositive = bucket.min > 0

            return (
              <div
                key={i}
                className="relative flex-1"
                title={`${bucket.bin}: ${bucket.count} trades`}
              >
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isZeroR && 'bg-neutral-600 dark:bg-neutral-400',
                    isPositive && !isZeroR && 'bg-emerald-500 dark:bg-emerald-400',
                    !isPositive && !isZeroR && 'bg-red-500 dark:bg-red-400'
                  )}
                  style={{ height: `${height}%` }}
                />
                {(bucket.min === 1 || bucket.min === 2) && (
                  <div className="absolute inset-0 border-l-2 border-dashed border-amber-400 dark:border-amber-500" />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
          <span>−R</span>
          <span className="font-medium">0R</span>
          <span>+R</span>
        </div>
      </div>
    )
  }

  const renderGenericHistogram = (hist: HistogramBucket[], label: string) => {
    if (hist.length === 0) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          No {label} data available
        </div>
      )
    }

    const maxCount = Math.max(...hist.map((b) => b.count), 1)

    return (
      <div className="space-y-2">
        <div className="flex h-48 items-end gap-0.5">
          {hist.map((bucket, i) => {
            const height = (bucket.count / maxCount) * 100

            return (
              <div
                key={i}
                className="relative flex-1"
                title={`${bucket.bin}: ${bucket.count} trades`}
              >
                <div
                  className="w-full rounded-t bg-neutral-500 transition-all dark:bg-neutral-400"
                  style={{ height: `${height}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="text-center text-xs text-neutral-600 dark:text-neutral-400">
          Distribution of {label}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Distributions</h2>

      <Tabs defaultValue="r">
        <TabsList>
          <TabsTrigger value="r">R Multiple</TabsTrigger>
          <TabsTrigger value="mae">MAE</TabsTrigger>
          <TabsTrigger value="mfe">MFE</TabsTrigger>
          <TabsTrigger value="hold">Hold Time</TabsTrigger>
        </TabsList>

        <TabsContent value="r" className="mt-4">
          {renderRHistogram()}
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400" role="status">
            R distribution with 0R solid, +1R and +2R marked (dashed lines).
          </p>
        </TabsContent>

        <TabsContent value="mae" className="mt-4">
          {renderGenericHistogram(maeHist, 'MAE')}
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400" role="status">
            Maximum Adverse Excursion (MAE) distribution.
          </p>
        </TabsContent>

        <TabsContent value="mfe" className="mt-4">
          {renderGenericHistogram(mfeHist, 'MFE')}
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400" role="status">
            Maximum Favorable Excursion (MFE) distribution.
          </p>
        </TabsContent>

        <TabsContent value="hold" className="mt-4">
          <div className="space-y-3">
            {holdHist.map((bucket, i) => {
              const maxCount = Math.max(...holdHist.map((b) => b.count), 1)
              const width = (bucket.count / maxCount) * 100

              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                      {bucket.bin}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {bucket.count} trades
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full bg-purple-500 dark:bg-purple-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400" role="status">
            Hold time distribution in buckets: ≤5m, 5–15m, 15–60m, 1–4h, &gt;4h.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
