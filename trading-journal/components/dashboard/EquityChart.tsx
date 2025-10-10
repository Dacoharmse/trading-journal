"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { calculateR, calculateMaxDrawdownR } from "@/lib/trade-stats"
import { TrendingUp } from "lucide-react"

interface EquityChartProps {
  trades: Trade[]
  units: 'currency' | 'r'
  currency: string
}

export function EquityChart({ trades, units, currency }: EquityChartProps) {
  const [timeRange, setTimeRange] = React.useState<'week' | 'month'>('month')

  // Calculate equity curve data with markers
  const equityCurve = React.useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const dateA = new Date(a.exit_date || a.entry_date).getTime()
      const dateB = new Date(b.exit_date || b.entry_date).getTime()
      return dateA - dateB
    })

    const now = new Date()
    const cutoffDays = timeRange === 'week' ? 7 : 30
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000)

    const filtered = sorted.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date)
      return tradeDate >= cutoffDate
    })

    let cumulativeValue = 0
    let peak = 0
    let peakIndex = -1
    let ddStartIndex = -1
    let ddEndIndex = -1
    let maxDD = 0

    const points: Array<{
      date: string
      value: number
      cumulative: number
      drawdown: number
      trade: Trade
    }> = []

    // Track best/worst trades
    let bestTradeIndex = -1
    let worstTradeIndex = -1
    let bestR = -Infinity
    let worstR = Infinity

    filtered.forEach((trade, idx) => {
      const value = units === 'r' ? (calculateR(trade) || 0) : trade.pnl
      const r = calculateR(trade) || 0

      cumulativeValue += value

      // Track best/worst by R
      if (r > bestR) {
        bestR = r
        bestTradeIndex = idx
      }
      if (r < worstR) {
        worstR = r
        worstTradeIndex = idx
      }

      // Track drawdown
      if (cumulativeValue > peak) {
        peak = cumulativeValue
        peakIndex = idx
      }

      const drawdown = peak - cumulativeValue
      if (drawdown > maxDD) {
        maxDD = drawdown
        ddStartIndex = peakIndex
        ddEndIndex = idx
      }

      points.push({
        date: new Date(trade.exit_date || trade.entry_date).toISOString(),
        value,
        cumulative: cumulativeValue,
        drawdown: -drawdown,
        trade
      })
    })

    // Find first recovery to new high after max DD
    let recoveryIndex = -1
    if (ddEndIndex >= 0) {
      const ddPeak = points[ddStartIndex]?.cumulative || 0
      for (let i = ddEndIndex + 1; i < points.length; i++) {
        if (points[i].cumulative > ddPeak) {
          recoveryIndex = i
          break
        }
      }
    }

    return {
      points,
      markers: {
        bestTradeIndex,
        worstTradeIndex,
        ddStartIndex,
        ddEndIndex,
        recoveryIndex,
        bestR,
        worstR,
      }
    }
  }, [trades, units, timeRange])

  // Calculate max drawdown info
  const drawdownInfo = React.useMemo(() => {
    return calculateMaxDrawdownR(trades)
  }, [trades])

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `$${value.toFixed(0)}`
    }
  }

  const formatValue = (value: number) => {
    return units === 'r' ? `${value.toFixed(1)}R` : formatCurrency(value)
  }

  if (equityCurve.points.length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trades in this period</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { points, markers } = equityCurve

  const maxValue = Math.max(...points.map(d => d.cumulative), 0)
  const minValue = Math.min(...points.map(d => Math.min(d.cumulative, d.drawdown)), 0)
  const range = maxValue - minValue || 1

  const maxDD = units === 'r' ? drawdownInfo.maxDrawdownR : drawdownInfo.maxDrawdownCurrency

  return (
    <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Equity Curve</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Max DD: {formatValue(maxDD)}
              {drawdownInfo.peakDate && drawdownInfo.troughDate && (
                <span className="ml-2">
                  ({new Date(drawdownInfo.peakDate).toLocaleDateString()} → {new Date(drawdownInfo.troughDate).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'week' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'month' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-muted-foreground pr-2 text-right">
            <span>{formatValue(maxValue)}</span>
            <span>0</span>
            <span>{formatValue(minValue)}</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-12 right-0 top-0 bottom-0">
            <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
              {/* Zero line */}
              <line
                x1="0"
                y1={((maxValue - 0) / range) * 300}
                x2="1000"
                y2={((maxValue - 0) / range) * 300}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="text-muted-foreground/30"
              />

              {/* Drawdown area (red) */}
              {points.length > 1 && (
                <path
                  d={`
                    M 0,${((maxValue - 0) / range) * 300}
                    ${points.map((point, i) => {
                      const x = (i / (points.length - 1)) * 1000
                      const y = ((maxValue - Math.min(point.drawdown, 0)) / range) * 300
                      return `L ${x},${y}`
                    }).join(' ')}
                    L 1000,${((maxValue - 0) / range) * 300}
                    Z
                  `}
                  fill="rgba(239, 68, 68, 0.1)"
                  stroke="none"
                />
              )}

              {/* Equity curve line */}
              {points.length > 1 && (
                <polyline
                  points={points.map((point, i) => {
                    const x = (i / (points.length - 1)) * 1000
                    const y = ((maxValue - point.cumulative) / range) * 300
                    return `${x},${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={points[points.length - 1].cumulative >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}
                />
              )}

              {/* Markers */}
              {/* Best Trade (Trophy) */}
              {markers.bestTradeIndex >= 0 && (
                <g>
                  <circle
                    cx={(markers.bestTradeIndex / (points.length - 1)) * 1000}
                    cy={((maxValue - points[markers.bestTradeIndex].cumulative) / range) * 300}
                    r="5"
                    fill="rgb(34, 197, 94)"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={(markers.bestTradeIndex / (points.length - 1)) * 1000}
                    y={((maxValue - points[markers.bestTradeIndex].cumulative) / range) * 300 - 12}
                    textAnchor="middle"
                    className="text-[10px] font-bold"
                  >
                    🏆
                  </text>
                </g>
              )}

              {/* Worst Trade (Explosion) */}
              {markers.worstTradeIndex >= 0 && (
                <g>
                  <circle
                    cx={(markers.worstTradeIndex / (points.length - 1)) * 1000}
                    cy={((maxValue - points[markers.worstTradeIndex].cumulative) / range) * 300}
                    r="5"
                    fill="rgb(239, 68, 68)"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={(markers.worstTradeIndex / (points.length - 1)) * 1000}
                    y={((maxValue - points[markers.worstTradeIndex].cumulative) / range) * 300 - 12}
                    textAnchor="middle"
                    className="text-[10px] font-bold"
                  >
                    💥
                  </text>
                </g>
              )}

              {/* Max DD Start (Trending Down) */}
              {markers.ddStartIndex >= 0 && (
                <g>
                  <circle
                    cx={(markers.ddStartIndex / (points.length - 1)) * 1000}
                    cy={((maxValue - points[markers.ddStartIndex].cumulative) / range) * 300}
                    r="4"
                    fill="rgb(249, 115, 22)"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <text
                    x={(markers.ddStartIndex / (points.length - 1)) * 1000}
                    y={((maxValue - points[markers.ddStartIndex].cumulative) / range) * 300 - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold"
                  >
                    📉
                  </text>
                </g>
              )}

              {/* Max DD End (Trough) */}
              {markers.ddEndIndex >= 0 && (
                <g>
                  <circle
                    cx={(markers.ddEndIndex / (points.length - 1)) * 1000}
                    cy={((maxValue - points[markers.ddEndIndex].cumulative) / range) * 300}
                    r="5"
                    fill="rgb(220, 38, 38)"
                    stroke="white"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <text
                    x={(markers.ddEndIndex / (points.length - 1)) * 1000}
                    y={((maxValue - points[markers.ddEndIndex].cumulative) / range) * 300 + 18}
                    textAnchor="middle"
                    className="fill-red-600 dark:fill-red-500 text-[9px] font-bold"
                  >
                    Max DD
                  </text>
                </g>
              )}

              {/* Recovery Point (Check) */}
              {markers.recoveryIndex >= 0 && (
                <g>
                  <circle
                    cx={(markers.recoveryIndex / (points.length - 1)) * 1000}
                    cy={((maxValue - points[markers.recoveryIndex].cumulative) / range) * 300}
                    r="4"
                    fill="rgb(34, 197, 94)"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <text
                    x={(markers.recoveryIndex / (points.length - 1)) * 1000}
                    y={((maxValue - points[markers.recoveryIndex].cumulative) / range) * 300 - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold"
                  >
                    ✅
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Current value indicator */}
          <div className="absolute bottom-0 right-0 text-right">
            <div className={`text-2xl font-bold ${points[points.length - 1].cumulative >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              {formatValue(points[points.length - 1].cumulative)}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>🏆</span>
            <span>Best trade ({markers.bestR > 0 ? '+' : ''}{markers.bestR.toFixed(1)}R)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💥</span>
            <span>Worst trade ({markers.worstR.toFixed(1)}R)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📉</span>
            <span>DD start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📍</span>
            <span>DD low</span>
          </div>
          {markers.recoveryIndex >= 0 && (
            <div className="flex items-center gap-1.5">
              <span>✅</span>
              <span>Recovery</span>
            </div>
          )}
        </div>

        {/* Screen reader description */}
        <div className="sr-only">
          Equity curve showing cumulative {units === 'r' ? 'R' : 'profit and loss'} over {timeRange}.
          Current value: {formatValue(points[points.length - 1].cumulative)}.
          Maximum drawdown: {formatValue(maxDD)}.
          Best trade: {markers.bestR.toFixed(1)}R.
          Worst trade: {markers.worstR.toFixed(1)}R.
        </div>
      </CardContent>
    </Card>
  )
}
