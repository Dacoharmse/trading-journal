"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Trade } from "@/types/trade"
import { calculateR } from "@/lib/trade-stats"
import { Clock } from "lucide-react"

interface HoldTimeBandsProps {
  trades: Trade[]
}

interface Band {
  label: string
  minMinutes: number
  maxMinutes: number | null
  trades: Trade[]
  medianR: number
  count: number
}

export function HoldTimeBands({ trades }: HoldTimeBandsProps) {
  const bands = React.useMemo(() => {
    const bandsConfig: Omit<Band, 'trades' | 'medianR' | 'count'>[] = [
      { label: '≤5m', minMinutes: 0, maxMinutes: 5 },
      { label: '5-15m', minMinutes: 5, maxMinutes: 15 },
      { label: '15-60m', minMinutes: 15, maxMinutes: 60 },
      { label: '1-4h', minMinutes: 60, maxMinutes: 240 },
      { label: '>4h', minMinutes: 240, maxMinutes: null },
    ]

    const results: Band[] = bandsConfig.map(config => {
      const bandTrades = trades.filter(trade => {
        if (!trade.exit_date) return false

        const entry = new Date(trade.entry_date)
        const exit = new Date(trade.exit_date)
        const durationMs = exit.getTime() - entry.getTime()
        const durationMinutes = durationMs / (1000 * 60)

        if (config.maxMinutes === null) {
          return durationMinutes > config.minMinutes
        }

        return durationMinutes > config.minMinutes && durationMinutes <= config.maxMinutes
      })

      // Calculate median R
      const rValues = bandTrades
        .map(t => calculateR(t))
        .filter((r): r is number => r !== null)
        .sort((a, b) => a - b)

      const medianR = rValues.length > 0
        ? rValues.length % 2 === 0
          ? (rValues[rValues.length / 2 - 1] + rValues[rValues.length / 2]) / 2
          : rValues[Math.floor(rValues.length / 2)]
        : 0

      return {
        ...config,
        trades: bandTrades,
        medianR: Number(medianR.toFixed(2)),
        count: bandTrades.length,
      }
    })

    return results
  }, [trades])

  const maxMedianR = Math.max(...bands.map(b => Math.abs(b.medianR)), 0.01)

  if (trades.length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hold Time vs Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-8">
            No closed trades to analyze
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Hold Time vs Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bands.map(band => {
            const barWidth = Math.abs((band.medianR / maxMedianR) * 100)
            const isPositive = band.medianR >= 0
            const isExploratory = band.count < 10

            return (
              <div key={band.label} className={`space-y-1 ${isExploratory ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground w-14">
                      {band.label}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      isExploratory
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      n={band.count}
                      {isExploratory && ' • low sample'}
                    </span>
                  </div>
                  <span className={`font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {band.medianR > 0 ? '+' : ''}{band.medianR.toFixed(2)}R
                  </span>
                </div>
                <div className="h-5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isPositive ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-muted-foreground">
            Median R by hold time bucket. Optimal hold time varies by strategy.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
