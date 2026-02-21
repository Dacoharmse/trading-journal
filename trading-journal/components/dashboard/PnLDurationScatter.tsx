'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Trade } from '@/types/trade'

interface PnLDurationScatterProps {
  trades: Trade[]
  currency?: string
}

export function PnLDurationScatter({ trades, currency = 'USD' }: PnLDurationScatterProps) {
  const scatterData = React.useMemo(() => {
    return trades
      .filter(trade => trade.exit_date || trade.closed_at)
      .map(trade => {
        const exitStr = (trade.exit_date || trade.closed_at)!
        const entryDate = new Date(trade.entry_date)
        const exitDate = new Date(exitStr)
        const holdMinutes = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60)

        return {
          holdMinutes,
          pnl: trade.pnl,
          symbol: trade.symbol,
          strategy: trade.strategy,
          date: exitStr,
        }
      })
  }, [trades])

  const maxHold = Math.max(...scatterData.map(d => d.holdMinutes), 60)
  const maxPnL = Math.max(...scatterData.map(d => Math.abs(d.pnl)), 100)

  const formatHoldTime = (mins: number) => {
    if (mins < 1) return `${Math.round(mins * 60)}s`
    if (mins < 60) return `${Math.round(mins)}m`
    if (mins < 1440) return `${Math.round(mins / 60)}m`
    return `${(mins / 1440).toFixed(1)}d`
  }

  const formatCurrency = (value: number) => {
    if (currency === 'R') return `${value.toFixed(1)}R`
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `${value.toFixed(0)}`
    }
  }

  if (scatterData.length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">PnL by Trade Duration</CardTitle>
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
        <CardTitle className="text-sm font-semibold">PnL by Trade Duration</CardTitle>
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

              {/* Scatter points */}
              {scatterData.map((point, idx) => {
                const x = (point.holdMinutes / maxHold) * 480 + 10
                const y = 125 - (point.pnl / maxPnL) * 125

                return (
                  <g key={idx} className="group">
                    <circle
                      cx={x}
                      cy={Math.max(5, Math.min(245, y))}
                      r="5"
                      fill={point.pnl >= 0 ? '#22c55e' : '#ef4444'}
                      opacity="0.7"
                      className="hover:opacity-100 transition-opacity cursor-pointer"
                    />
                    {/* Tooltip */}
                    <foreignObject
                      x={Math.max(0, Math.min(x - 60, 380))}
                      y={Math.max(0, y - 70)}
                      width="120"
                      height="60"
                      className="pointer-events-none"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-neutral-900 text-white text-xs rounded shadow-lg p-2">
                          <div className="font-bold">{point.symbol}</div>
                          <div>Hold: {formatHoldTime(point.holdMinutes)}</div>
                          <div className={point.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatCurrency(point.pnl)}
                          </div>
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="absolute left-16 right-0 bottom-0 h-8 flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>0s</span>
            <span>{formatHoldTime(maxHold * 0.25)}</span>
            <span>{formatHoldTime(maxHold * 0.5)}</span>
            <span>{formatHoldTime(maxHold * 0.75)}</span>
            <span>{formatHoldTime(maxHold)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
