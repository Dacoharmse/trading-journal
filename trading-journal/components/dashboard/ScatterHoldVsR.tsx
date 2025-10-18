"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { calculateR } from "@/lib/trade-stats"

interface ScatterHoldVsRProps {
  trades: Trade[]
}

export function ScatterHoldVsR({ trades }: ScatterHoldVsRProps) {
  const scatterData = React.useMemo(() => {
    return trades
      .map(trade => {
        const r = calculateR(trade)
        if (!r || !trade.exit_date) return null

        const entryDate = new Date(trade.entry_date)
        const exitDate = new Date(trade.exit_date)
        const holdMinutes = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60)

        return {
          holdMinutes,
          r,
          symbol: trade.symbol,
          strategy: trade.strategy,
          date: trade.exit_date,
          trade,
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  }, [trades])

  const maxHold = Math.max(...scatterData.map(d => d.holdMinutes), 1)
  const maxR = Math.max(...scatterData.map(d => Math.abs(d.r)), 1)

  const formatHoldTime = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`
    if (mins < 1440) return `${(mins / 60).toFixed(1)}h`
    return `${(mins / 1440).toFixed(1)}d`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Hold Time vs R</CardTitle>
      </CardHeader>

      <CardContent>
        {scatterData.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            No data available. Trades need exit times, entry/exit prices, and stop loss.
          </div>
        ) : (
          <div className="h-64 relative">
            {/* Y-axis (R) labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-muted-foreground pr-2 text-right">
              <span>+{maxR.toFixed(0)}R</span>
              <span>0R</span>
              <span>-{maxR.toFixed(0)}R</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-12 right-0 top-0 bottom-8">
              <svg className="w-full h-full" viewBox="0 0 1000 300">
                {/* Grid lines */}
                <line
                  x1="0"
                  y1="150"
                  x2="1000"
                  y2="150"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-muted-foreground/20"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="300"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-muted-foreground/20"
                />

                {/* Zero line (horizontal) */}
                <line
                  x1="0"
                  y1="150"
                  x2="1000"
                  y2="150"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-yellow-500/50"
                />

                {/* Scatter points */}
                {scatterData.map((point, idx) => {
                  const x = (point.holdMinutes / maxHold) * 1000
                  const y = 150 - (point.r / maxR) * 150

                  return (
                    <g key={idx} className="group">
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={point.r >= 0 ? '#22c55e' : '#ef4444'}
                        opacity="0.7"
                        className="hover:opacity-100 hover:scale-150 transition-all cursor-pointer"
                      />
                      {/* Tooltip */}
                      <foreignObject
                        x={x - 75}
                        y={y - 60}
                        width="150"
                        height="50"
                        className="pointer-events-none"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-neutral-900 text-white text-xs rounded shadow-lg p-2 whitespace-nowrap">
                            <div className="font-bold">{point.symbol}</div>
                            <div>{formatDate(point.date)}</div>
                            <div>Hold: {formatHoldTime(point.holdMinutes)}</div>
                            <div>R: {point.r.toFixed(2)}R</div>
                            {point.strategy && <div className="text-xs opacity-75">{point.strategy}</div>}
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* X-axis (Hold Time) labels */}
            <div className="absolute left-12 right-0 bottom-0 h-8 flex items-center justify-between text-xs text-muted-foreground">
              <span>0m</span>
              <span>{formatHoldTime(maxHold / 2)}</span>
              <span>{formatHoldTime(maxHold)}</span>
            </div>
          </div>
        )}

        {/* Screen reader description */}
        <div className="sr-only">
          Scatter plot showing relationship between hold time and R multiples.
          {scatterData.length} trades plotted.
          Average hold time: {formatHoldTime(scatterData.reduce((sum, d) => sum + d.holdMinutes, 0) / scatterData.length)}.
        </div>
      </CardContent>
    </Card>
  )
}
