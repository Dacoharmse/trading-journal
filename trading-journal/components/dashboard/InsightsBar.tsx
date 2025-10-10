"use client"

import * as React from "react"
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react"
import type { Trade } from "@/types/trade"
import { calculateR } from "@/lib/trade-stats"

interface InsightsBarProps {
  trades: Trade[]
}

interface Insight {
  text: string
  type: 'positive' | 'negative' | 'neutral'
  score: number // Higher = more significant
}

export function InsightsBar({ trades }: InsightsBarProps) {
  const insights = React.useMemo(() => {
    const results: Insight[] = []

    if (trades.length < 15) {
      return [{
        text: "Collecting data... Insights available after 15+ trades",
        type: 'neutral' as const,
        score: 0,
      }]
    }

    // Analyze by hour
    const hourlyPerformance = new Map<number, { trades: Trade[]; totalR: number }>()

    trades.forEach(trade => {
      const date = new Date(trade.exit_date || trade.entry_date)
      const hour = date.getHours()
      const r = calculateR(trade) || 0

      if (!hourlyPerformance.has(hour)) {
        hourlyPerformance.set(hour, { trades: [], totalR: 0 })
      }

      const hourData = hourlyPerformance.get(hour)!
      hourData.trades.push(trade)
      hourData.totalR += r
    })

    // Find best and worst hours with n >= 15
    let bestHour: { hour: number; expectancy: number; n: number } | null = null
    let worstHour: { hour: number; expectancy: number; n: number } | null = null

    hourlyPerformance.forEach((data, hour) => {
      if (data.trades.length >= 15) {
        const expectancy = data.totalR / data.trades.length

        if (!bestHour || expectancy > bestHour.expectancy) {
          bestHour = { hour, expectancy, n: data.trades.length }
        }

        if (!worstHour || expectancy < worstHour.expectancy) {
          worstHour = { hour, expectancy, n: data.trades.length }
        }
      }
    })

    if (bestHour && bestHour.expectancy > 0.2) {
      results.push({
        text: `Best hour: ${bestHour.hour.toString().padStart(2, '0')}:00 (${bestHour.expectancy > 0 ? '+' : ''}${bestHour.expectancy.toFixed(2)}R, n=${bestHour.n})`,
        type: 'positive',
        score: bestHour.expectancy * bestHour.n,
      })
    }

    if (worstHour && worstHour.expectancy < -0.2) {
      results.push({
        text: `Avoid hour: ${worstHour.hour.toString().padStart(2, '0')}:00 (${worstHour.expectancy.toFixed(2)}R, n=${worstHour.n})`,
        type: 'negative',
        score: Math.abs(worstHour.expectancy) * worstHour.n,
      })
    }

    // Analyze by day of week
    const dowPerformance = new Map<number, { trades: Trade[]; totalR: number }>()
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    trades.forEach(trade => {
      const date = new Date(trade.exit_date || trade.entry_date)
      const dow = date.getDay()
      const r = calculateR(trade) || 0

      if (!dowPerformance.has(dow)) {
        dowPerformance.set(dow, { trades: [], totalR: 0 })
      }

      const dowData = dowPerformance.get(dow)!
      dowData.trades.push(trade)
      dowData.totalR += r
    })

    // Find worst day with n >= 15
    let worstDOW: { dow: number; expectancy: number; n: number } | null = null

    dowPerformance.forEach((data, dow) => {
      if (data.trades.length >= 15) {
        const expectancy = data.totalR / data.trades.length

        if (!worstDOW || expectancy < worstDOW.expectancy) {
          worstDOW = { dow, expectancy, n: data.trades.length }
        }
      }
    })

    if (worstDOW && worstDOW.expectancy < -0.15) {
      results.push({
        text: `Avoid ${dowNames[worstDOW.dow]} (${worstDOW.expectancy.toFixed(2)}R, n=${worstDOW.n})`,
        type: 'negative',
        score: Math.abs(worstDOW.expectancy) * worstDOW.n,
      })
    }

    // Analyze by symbol
    const symbolPerformance = new Map<string, { trades: Trade[]; totalR: number }>()

    trades.forEach(trade => {
      const r = calculateR(trade) || 0

      if (!symbolPerformance.has(trade.symbol)) {
        symbolPerformance.set(trade.symbol, { trades: [], totalR: 0 })
      }

      const symbolData = symbolPerformance.get(trade.symbol)!
      symbolData.trades.push(trade)
      symbolData.totalR += r
    })

    // Find best symbol with n >= 15
    let bestSymbol: { symbol: string; expectancy: number; n: number } | null = null

    symbolPerformance.forEach((data, symbol) => {
      if (data.trades.length >= 15) {
        const expectancy = data.totalR / data.trades.length

        if (!bestSymbol || expectancy > bestSymbol.expectancy) {
          bestSymbol = { symbol, expectancy, n: data.trades.length }
        }
      }
    })

    if (bestSymbol && bestSymbol.expectancy > 0.25) {
      results.push({
        text: `Best symbol: ${bestSymbol.symbol} (${bestSymbol.expectancy > 0 ? '+' : ''}${bestSymbol.expectancy.toFixed(2)}R, n=${bestSymbol.n})`,
        type: 'positive',
        score: bestSymbol.expectancy * bestSymbol.n,
      })
    }

    // Analyze by strategy
    const strategyPerformance = new Map<string, { trades: Trade[]; totalR: number }>()

    trades.forEach(trade => {
      if (!trade.strategy) return

      const r = calculateR(trade) || 0

      if (!strategyPerformance.has(trade.strategy)) {
        strategyPerformance.set(trade.strategy, { trades: [], totalR: 0 })
      }

      const stratData = strategyPerformance.get(trade.strategy)!
      stratData.trades.push(trade)
      stratData.totalR += r
    })

    // Find worst strategy with n >= 20
    let worstStrategy: { strategy: string; expectancy: number; n: number } | null = null

    strategyPerformance.forEach((data, strategy) => {
      if (data.trades.length >= 20) {
        const expectancy = data.totalR / data.trades.length

        if (!worstStrategy || expectancy < worstStrategy.expectancy) {
          worstStrategy = { strategy, expectancy, n: data.trades.length }
        }
      }
    })

    if (worstStrategy && worstStrategy.expectancy < -0.1) {
      results.push({
        text: `Review strategy: ${worstStrategy.strategy} (${worstStrategy.expectancy.toFixed(2)}R, n=${worstStrategy.n})`,
        type: 'negative',
        score: Math.abs(worstStrategy.expectancy) * worstStrategy.n,
      })
    }

    // Sort by score and take top 2
    return results.sort((a, b) => b.score - a.score).slice(0, 2)
  }, [trades])

  if (insights.length === 0) {
    return null
  }

  return (
    <div className="sticky top-16 z-30 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-amber-950/30 border-y border-amber-200 dark:border-amber-900 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-8 py-3">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {insight.type === 'positive' && (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
                {insight.type === 'negative' && (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <span className={`font-medium ${
                  insight.type === 'positive'
                    ? 'text-green-900 dark:text-green-100'
                    : insight.type === 'negative'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {insight.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
