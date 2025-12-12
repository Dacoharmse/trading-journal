"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, TrendingUp, TrendingDown, BarChart3, Package } from "lucide-react"
import { formatCurrency } from "@/lib/fx-converter"
import { type DailyStats } from "@/lib/calendar-utils"

interface CalendarStatisticsProps {
  dailyStats: Map<string, DailyStats>
  displayUnit: 'currency' | 'r'
  currency: string
}

export function CalendarStatistics({
  dailyStats,
  displayUnit,
  currency,
}: CalendarStatisticsProps) {
  const statistics = React.useMemo(() => {
    let totalTrades = 0
    let totalLots = 0
    let biggestWin = 0
    let biggestLoss = 0
    let tradingDays = 0

    dailyStats.forEach((stats) => {
      if (stats.trades > 0) {
        tradingDays++
        totalTrades += stats.trades

        stats.tradesList.forEach(trade => {
          // Add up lot sizes
          totalLots += trade.lot_size || 0

          // Track biggest win/loss
          const value = displayUnit === 'r' ? (trade.pnl / (trade.risk || 1)) : trade.pnl

          if (value > biggestWin) {
            biggestWin = value
          }
          if (value < biggestLoss) {
            biggestLoss = value
          }
        })
      }
    })

    return {
      tradingDays,
      totalTrades,
      totalLots: totalLots.toFixed(2),
      biggestWin,
      biggestLoss: Math.abs(biggestLoss),
    }
  }, [dailyStats, displayUnit])

  const formatValue = (value: number) => {
    if (displayUnit === 'r') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}R`
    }
    return formatCurrency(value, currency)
  }

  const stats = [
    {
      icon: Calendar,
      label: "Number of days",
      value: statistics.tradingDays.toString(),
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      icon: BarChart3,
      label: "Total Trades",
      value: statistics.totalTrades.toString(),
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      icon: Package,
      label: "Total Lots Used",
      value: statistics.totalLots,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      icon: TrendingUp,
      label: "Biggest Win",
      value: formatValue(statistics.biggestWin),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      icon: TrendingDown,
      label: "Biggest Loss",
      value: formatValue(statistics.biggestLoss),
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-lg font-bold ${stat.color} truncate`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
