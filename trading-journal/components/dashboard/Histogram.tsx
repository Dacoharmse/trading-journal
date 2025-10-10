"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { calculateR } from "@/lib/trade-stats"

interface HistogramProps {
  trades: Trade[]
}

export function Histogram({ trades }: HistogramProps) {
  const bins = React.useMemo(() => {
    const rValues = trades
      .map(calculateR)
      .filter((r): r is number => r !== null)

    if (rValues.length === 0) return []

    // Create bins from -5R to +5R
    const binSize = 0.5
    const binCount = 20 // -5 to +5
    const binArray: Array<{ min: number; max: number; count: number; trades: number[] }> = []

    for (let i = 0; i < binCount; i++) {
      const min = -5 + i * binSize
      const max = min + binSize
      binArray.push({ min, max, count: 0, trades: [] })
    }

    // Distribute R values into bins
    rValues.forEach((r, idx) => {
      const binIndex = Math.floor((r + 5) / binSize)
      const clampedIndex = Math.max(0, Math.min(binCount - 1, binIndex))
      binArray[clampedIndex].count++
      binArray[clampedIndex].trades.push(idx)
    })

    return binArray
  }, [trades])

  const maxCount = Math.max(...bins.map(b => b.count), 1)

  const getTotalR = () => {
    const rValues = trades.map(calculateR).filter((r): r is number => r !== null)
    return rValues.reduce((sum, r) => sum + r, 0)
  }

  const getWinRate = () => {
    const rValues = trades.map(calculateR).filter((r): r is number => r !== null)
    const wins = rValues.filter(r => r > 0).length
    return rValues.length > 0 ? (wins / rValues.length) * 100 : 0
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">R Distribution</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Total R: <span className="font-bold">{getTotalR().toFixed(1)}R</span>
              {' | '}
              Win Rate: <span className="font-bold">{getWinRate().toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {bins.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            No R data available. Trades need entry price, exit price, and stop loss.
          </div>
        ) : (
          <div className="h-64 relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-muted-foreground pr-2 text-right">
              <span>{maxCount}</span>
              <span>{Math.floor(maxCount / 2)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-8 right-0 top-0 bottom-8">
              <div className="h-full flex items-end justify-around gap-0.5">
                {bins.map((bin, idx) => {
                  const height = (bin.count / maxCount) * 100
                  const isZeroBin = bin.min <= 0 && bin.max > 0
                  const isPositive = bin.min >= 0

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end group relative"
                    >
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t transition-all hover:opacity-80 ${
                          isZeroBin
                            ? 'bg-slate-500'
                            : isPositive
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        } ${isZeroBin ? 'ring-2 ring-yellow-500' : ''}`}
                        style={{ height: `${height}%` }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {bin.min.toFixed(1)}R to {bin.max.toFixed(1)}R<br />
                          {bin.count} trade{bin.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Zero line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-yellow-500 z-10"
                style={{ left: `${(5 / 10) * 100}%` }}
              >
                <span className="absolute top-0 left-2 text-xs font-bold text-yellow-600">
                  0R
                </span>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-8 right-0 bottom-0 h-8 flex items-center justify-between text-xs text-muted-foreground">
              <span>-5R</span>
              <span>0R</span>
              <span>+5R</span>
            </div>
          </div>
        )}

        {/* Screen reader description */}
        <div className="sr-only">
          R value distribution histogram.
          Total R: {getTotalR().toFixed(1)}.
          Win rate: {getWinRate().toFixed(1)}%.
          {bins.map((bin, idx) =>
            bin.count > 0 ? `${bin.min.toFixed(1)}R to ${bin.max.toFixed(1)}R: ${bin.count} trades. ` : ''
          ).join('')}
        </div>
      </CardContent>
    </Card>
  )
}
