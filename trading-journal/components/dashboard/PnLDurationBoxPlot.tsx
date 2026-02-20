'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Trade } from '@/types/trade'

interface PnLDurationBoxPlotProps {
  trades: Trade[]
  currency?: string
}

interface BoxPlotData {
  label: string
  minMinutes: number
  maxMinutes: number | null
  trades: Trade[]
  q1: number
  median: number
  q3: number
  min: number
  max: number
  count: number
}

function calculateQuartiles(values: number[]): { q1: number; median: number; q3: number; min: number; max: number } {
  if (values.length === 0) return { q1: 0, median: 0, q3: 0, min: 0, max: 0 }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  const min = sorted[0]
  const max = sorted[n - 1]

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  const lowerHalf = sorted.slice(0, Math.floor(n / 2))
  const upperHalf = n % 2 === 0 ? sorted.slice(n / 2) : sorted.slice(Math.floor(n / 2) + 1)

  const q1 = lowerHalf.length > 0
    ? lowerHalf.length % 2 === 0
      ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
      : lowerHalf[Math.floor(lowerHalf.length / 2)]
    : median

  const q3 = upperHalf.length > 0
    ? upperHalf.length % 2 === 0
      ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
      : upperHalf[Math.floor(upperHalf.length / 2)]
    : median

  return { q1, median, q3, min, max }
}

export function PnLDurationBoxPlot({ trades, currency = 'USD' }: PnLDurationBoxPlotProps) {
  const boxPlotData = React.useMemo(() => {
    const bands: Omit<BoxPlotData, 'trades' | 'q1' | 'median' | 'q3' | 'min' | 'max' | 'count'>[] = [
      { label: '47s', minMinutes: 0, maxMinutes: 1 },
      { label: '3m 21s', minMinutes: 1, maxMinutes: 5 },
      { label: '7m 24s', minMinutes: 5, maxMinutes: 15 },
      { label: '13m 23s', minMinutes: 15, maxMinutes: 30 },
      { label: '39m 14s', minMinutes: 30, maxMinutes: null },
    ]

    return bands.map(band => {
      const bandTrades = trades.filter(trade => {
        if (!trade.exit_date) return false

        const entry = new Date(trade.entry_date)
        const exit = new Date(trade.exit_date)
        const durationMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60)

        if (band.maxMinutes === null) {
          return durationMinutes > band.minMinutes
        }
        return durationMinutes > band.minMinutes && durationMinutes <= band.maxMinutes
      })

      const pnlValues = bandTrades.map(t => t.pnl)
      const quartiles = calculateQuartiles(pnlValues)

      return {
        ...band,
        trades: bandTrades,
        ...quartiles,
        count: bandTrades.length,
      }
    })
  }, [trades])

  const allPnLs = trades.filter(t => t.exit_date).map(t => t.pnl)
  const maxPnL = Math.max(...allPnLs.map(p => Math.abs(p)), 100)
  const yScale = 250 / (maxPnL * 2) // Scale to fit in 250px height

  const formatCurrency = (value: number) => {
    if (currency === 'R') return `${value.toFixed(2)}R`
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `${value.toFixed(2)}`
    }
  }

  if (trades.filter(t => t.exit_date).length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">PnL Distribution by Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-12">
            No closed trades to analyze
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">PnL Distribution by Duration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-72">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-muted-foreground pr-2 text-right">
            <span>{formatCurrency(maxPnL)}</span>
            <span>{formatCurrency(maxPnL / 2)}</span>
            <span>{formatCurrency(0)}</span>
            <span>{formatCurrency(-maxPnL / 2)}</span>
            <span>{formatCurrency(-maxPnL)}</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-16 right-0 top-0 bottom-8">
            <svg className="w-full h-full" viewBox="0 0 500 250" preserveAspectRatio="xMidYMid meet">
              {/* Zero line */}
              <line
                x1="0"
                y1="125"
                x2="500"
                y2="125"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="text-yellow-500/50"
              />

              {/* Grid lines */}
              {[0, 62.5, 125, 187.5, 250].map((y, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={y}
                  x2="500"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                  className="text-muted-foreground/20"
                />
              ))}

              {/* Box plots */}
              {boxPlotData.map((band, idx) => {
                const x = 50 + idx * 100
                const boxWidth = 50

                if (band.count === 0) return null

                // Convert PnL values to Y coordinates (125 is center/zero)
                const yMin = 125 - band.min * yScale
                const yMax = 125 - band.max * yScale
                const yQ1 = 125 - band.q1 * yScale
                const yQ3 = 125 - band.q3 * yScale
                const yMedian = 125 - band.median * yScale

                // Clamp values
                const clamp = (v: number) => Math.max(0, Math.min(250, v))

                return (
                  <g key={band.label}>
                    {/* Whisker line (min to max) */}
                    <line
                      x1={x}
                      y1={clamp(yMin)}
                      x2={x}
                      y2={clamp(yMax)}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-neutral-400 dark:text-neutral-500"
                    />

                    {/* Min whisker cap */}
                    <line
                      x1={x - 10}
                      y1={clamp(yMin)}
                      x2={x + 10}
                      y2={clamp(yMin)}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-neutral-400 dark:text-neutral-500"
                    />

                    {/* Max whisker cap */}
                    <line
                      x1={x - 10}
                      y1={clamp(yMax)}
                      x2={x + 10}
                      y2={clamp(yMax)}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-neutral-400 dark:text-neutral-500"
                    />

                    {/* Box (Q1 to Q3) */}
                    <rect
                      x={x - boxWidth / 2}
                      y={Math.min(clamp(yQ1), clamp(yQ3))}
                      width={boxWidth}
                      height={Math.abs(clamp(yQ3) - clamp(yQ1)) || 2}
                      fill={band.median >= 0 ? '#22c55e' : '#ef4444'}
                      opacity="0.6"
                      stroke={band.median >= 0 ? '#16a34a' : '#dc2626'}
                      strokeWidth="1"
                    />

                    {/* Median line */}
                    <line
                      x1={x - boxWidth / 2}
                      y1={clamp(yMedian)}
                      x2={x + boxWidth / 2}
                      y2={clamp(yMedian)}
                      stroke={band.median >= 0 ? '#15803d' : '#b91c1c'}
                      strokeWidth="2"
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="absolute left-16 right-0 bottom-0 h-8 flex justify-around items-center text-xs text-muted-foreground">
            {boxPlotData.map(band => (
              <span key={band.label} className="text-center">
                {band.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
