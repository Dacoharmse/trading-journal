"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { calculateR, calculateExpectancyR } from "@/lib/trade-stats"
import { ArrowUpDown } from "lucide-react"

type Metric = 'netR' | 'winRate' | 'expectancyR' | 'pnl'

interface BreakdownBarsProps {
  trades: Trade[]
  type: 'dow' | 'symbol' | 'strategy'
  units: 'currency' | 'r'
  currency: string
}

export function BreakdownBars({ trades, type, units, currency }: BreakdownBarsProps) {
  const [metric, setMetric] = React.useState<Metric>('netR')
  const [sortBy, setSortBy] = React.useState<'name' | 'value'>('value')

  const data = React.useMemo(() => {
    let grouped: Map<string, Trade[]>

    if (type === 'dow') {
      // Group by day of week
      grouped = new Map()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      trades.forEach(trade => {
        const date = new Date(trade.exit_date || trade.entry_date)
        const dayName = days[date.getDay()]
        if (!grouped.has(dayName)) {
          grouped.set(dayName, [])
        }
        grouped.get(dayName)!.push(trade)
      })
    } else if (type === 'symbol') {
      // Group by symbol
      grouped = new Map()
      trades.forEach(trade => {
        const symbol = trade.symbol || 'Unknown'
        if (!grouped.has(symbol)) {
          grouped.set(symbol, [])
        }
        grouped.get(symbol)!.push(trade)
      })
    } else {
      // Group by strategy
      grouped = new Map()
      trades.forEach(trade => {
        const strategy = trade.strategy || 'No Strategy'
        if (!grouped.has(strategy)) {
          grouped.set(strategy, [])
        }
        grouped.get(strategy)!.push(trade)
      })
    }

    // Calculate metrics for each group
    const results = Array.from(grouped.entries()).map(([name, groupTrades]) => {
      const totalTrades = groupTrades.length
      const wins = groupTrades.filter(t => t.pnl > 0).length
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

      const netR = groupTrades.reduce((sum, t) => sum + (calculateR(t) || 0), 0)
      const expectancyR = calculateExpectancyR(groupTrades)
      const pnl = groupTrades.reduce((sum, t) => sum + t.pnl, 0)

      return {
        name,
        totalTrades,
        winRate,
        netR,
        expectancyR,
        pnl,
      }
    })

    // Sort
    if (sortBy === 'value') {
      results.sort((a, b) => {
        const aVal = metric === 'netR' ? a.netR :
                     metric === 'winRate' ? a.winRate :
                     metric === 'expectancyR' ? a.expectancyR :
                     a.pnl
        const bVal = metric === 'netR' ? b.netR :
                     metric === 'winRate' ? b.winRate :
                     metric === 'expectancyR' ? b.expectancyR :
                     b.pnl
        return bVal - aVal
      })
    } else {
      results.sort((a, b) => a.name.localeCompare(b.name))
    }

    return results
  }, [trades, type, metric, sortBy])

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

  const formatValue = (item: typeof data[0]) => {
    if (metric === 'netR') return `${item.netR.toFixed(1)}R`
    if (metric === 'winRate') return `${item.winRate.toFixed(1)}%`
    if (metric === 'expectancyR') return `${item.expectancyR.toFixed(2)}R`
    return formatCurrency(item.pnl)
  }

  const getValue = (item: typeof data[0]) => {
    if (metric === 'netR') return item.netR
    if (metric === 'winRate') return item.winRate
    if (metric === 'expectancyR') return item.expectancyR
    return item.pnl
  }

  const maxValue = Math.max(...data.map(getValue), 0)
  const minValue = Math.min(...data.map(getValue), 0)
  const range = maxValue - minValue || 1

  const getTitle = () => {
    if (type === 'dow') return 'Performance by Day of Week'
    if (type === 'symbol') return 'Performance by Symbol'
    return 'Performance by Strategy'
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{getTitle()}</CardTitle>
          <div className="flex items-center gap-2">
            {/* Metric selector */}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
              className="px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="netR">Net R</option>
              <option value="winRate">Win Rate</option>
              <option value="expectancyR">Expectancy</option>
              <option value="pnl">P&L</option>
            </select>

            {/* Sort toggle */}
            <button
              onClick={() => setSortBy(s => s === 'name' ? 'value' : 'name')}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={`Sort by ${sortBy === 'name' ? 'value' : 'name'}`}
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {data.map((item) => {
            const value = getValue(item)
            const isPositive = value >= 0
            const barWidth = Math.abs((value / range) * 100)

            const isExploratory = item.totalTrades < 30

            return (
              <div key={item.name} className={`space-y-1 ${isExploratory ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      isExploratory
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      n={item.totalTrades}
                      {isExploratory && ' • exploratory'}
                    </span>
                  </div>
                  <span className={`font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatValue(item)}
                  </span>
                </div>
                <div className="h-6 bg-muted/30 rounded-full overflow-hidden">
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

          {data.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No data available for this breakdown
            </div>
          )}
        </div>

        {/* Screen reader description */}
        <div className="sr-only">
          {getTitle()} showing {metric}.
          {data.map(item => `${item.name}: ${formatValue(item)} from ${item.totalTrades} trades. `).join(' ')}
        </div>
      </CardContent>
    </Card>
  )
}
