"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { calculateR, calculateExpectancyR } from "@/lib/trade-stats"

type Metric = 'winRate' | 'expectancyR' | 'netR'

interface SessionHeatmapProps {
  trades: Trade[]
}

export function SessionHeatmap({ trades }: SessionHeatmapProps) {
  const [metric, setMetric] = React.useState<Metric>('winRate')

  // Define sessions by hour (UTC adjusted for user's timezone)
  const getSession = (hour: number) => {
    // Asia: 00:00-08:00, London: 08:00-16:00, NY: 16:00-24:00
    if (hour >= 0 && hour < 8) return 'Asia'
    if (hour >= 8 && hour < 16) return 'London'
    return 'NY'
  }

  const heatmapData = React.useMemo(() => {
    // Create 24-hour x 3-session grid
    const grid: Array<Array<{
      hour: number
      session: string
      trades: Trade[]
      winRate: number
      expectancyR: number
      netR: number
    }>> = []

    const sessions = ['Asia', 'London', 'NY']

    sessions.forEach(session => {
      const row: typeof grid[0] = []

      for (let hour = 0; hour < 24; hour++) {
        const hourTrades = trades.filter(trade => {
          const date = new Date(trade.exit_date || trade.entry_date)
          const tradeHour = date.getHours()
          const tradeSession = getSession(tradeHour)
          return tradeHour === hour && tradeSession === session
        })

        const totalTrades = hourTrades.length
        const wins = hourTrades.filter(t => t.pnl > 0).length
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
        const expectancyR = calculateExpectancyR(hourTrades)
        const netR = hourTrades.reduce((sum, t) => sum + (calculateR(t) || 0), 0)

        row.push({
          hour,
          session,
          trades: hourTrades,
          winRate,
          expectancyR,
          netR,
        })
      }

      grid.push(row)
    })

    return grid
  }, [trades])

  const getValue = (cell: typeof heatmapData[0][0]) => {
    if (metric === 'winRate') return cell.winRate
    if (metric === 'expectancyR') return cell.expectancyR
    return cell.netR
  }

  const allValues = heatmapData.flat().map(getValue)
  const maxValue = Math.max(...allValues, 0)
  const minValue = Math.min(...allValues, 0)
  const range = maxValue - minValue || 1

  const getColor = (cell: typeof heatmapData[0][0]) => {
    if (cell.trades.length === 0) return 'bg-muted/10'

    const value = getValue(cell)
    const intensity = Math.abs((value - minValue) / range)

    if (value > 0) {
      if (intensity > 0.75) return 'bg-green-600'
      if (intensity > 0.5) return 'bg-green-500'
      if (intensity > 0.25) return 'bg-green-400'
      return 'bg-green-300'
    } else {
      if (intensity > 0.75) return 'bg-red-600'
      if (intensity > 0.5) return 'bg-red-500'
      if (intensity > 0.25) return 'bg-red-400'
      return 'bg-red-300'
    }
  }

  const formatValue = (value: number) => {
    if (metric === 'winRate') return `${value.toFixed(0)}%`
    if (metric === 'expectancyR') return `${value.toFixed(2)}R`
    return `${value.toFixed(1)}R`
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg h-full overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Hour/Session Performance</CardTitle>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="winRate">Win Rate</option>
            <option value="expectancyR">Expectancy R</option>
            <option value="netR">Net R</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="pb-6 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible pb-2">
          <div className="min-w-[600px] relative">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-16" /> {/* Session label space */}
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                  {i.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1">
              {heatmapData.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-1">
                  <div className="w-16 text-xs font-medium text-muted-foreground">
                    {row[0].session}
                  </div>
                  {row.map((cell, cellIdx) => {
                    // For Asia (first row), show tooltip below; others show above
                    const isFirstRow = rowIdx === 0
                    const tooltipPosition = isFirstRow
                      ? "top-full mt-2"
                      : "bottom-full mb-2"

                    return (
                      <div
                        key={cellIdx}
                        className={`flex-1 aspect-square rounded-sm ${getColor(cell)} transition-all hover:scale-110 hover:shadow-lg cursor-pointer relative group z-10`}
                        title={`${cell.session} ${cell.hour}:00 - ${cell.trades.length} trades, ${formatValue(getValue(cell))}`}
                      >
                        {/* Tooltip */}
                        <div className={`absolute ${tooltipPosition} left-1/2 transform -translate-x-1/2 px-3 py-2 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-medium rounded-md shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] border border-neutral-800 dark:border-neutral-200`}>
                          <div className="font-semibold">{cell.session} {cell.hour.toString().padStart(2, '0')}:00</div>
                          <div className="text-neutral-300 dark:text-neutral-600">{cell.trades.length} trade{cell.trades.length !== 1 ? 's' : ''}</div>
                          <div className="font-bold text-sm">{formatValue(getValue(cell))}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
              <span>Worse</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-red-600" />
                <div className="w-4 h-4 rounded-sm bg-red-400" />
                <div className="w-4 h-4 rounded-sm bg-muted/10" />
                <div className="w-4 h-4 rounded-sm bg-green-400" />
                <div className="w-4 h-4 rounded-sm bg-green-600" />
              </div>
              <span>Better</span>
            </div>
          </div>
        </div>

        {/* Screen reader description */}
        <div className="sr-only">
          Session heatmap showing {metric} by hour of day across Asia, London, and New York trading sessions.
        </div>
      </CardContent>
    </Card>
  )
}
