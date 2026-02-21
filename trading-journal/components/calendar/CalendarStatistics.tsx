"use client"

import * as React from "react"
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
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      cardBg: "bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-950/20 dark:to-blue-900/10",
      border: "border-blue-200/60 dark:border-blue-800/40",
    },
    {
      icon: BarChart3,
      label: "Total Trades",
      value: statistics.totalTrades.toString(),
      color: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      cardBg: "bg-gradient-to-br from-purple-50/80 to-purple-100/40 dark:from-purple-950/20 dark:to-purple-900/10",
      border: "border-purple-200/60 dark:border-purple-800/40",
    },
    {
      icon: Package,
      label: "Total Lots Used",
      value: statistics.totalLots,
      color: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      cardBg: "bg-gradient-to-br from-orange-50/80 to-orange-100/40 dark:from-orange-950/20 dark:to-orange-900/10",
      border: "border-orange-200/60 dark:border-orange-800/40",
    },
    {
      icon: TrendingUp,
      label: "Biggest Win",
      value: formatValue(statistics.biggestWin),
      color: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-900/40",
      cardBg: "bg-gradient-to-br from-green-50/80 to-green-100/40 dark:from-green-950/20 dark:to-green-900/10",
      border: "border-green-200/60 dark:border-green-800/40",
    },
    {
      icon: TrendingDown,
      label: "Biggest Loss",
      value: formatValue(statistics.biggestLoss),
      color: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900/40",
      cardBg: "bg-gradient-to-br from-red-50/80 to-red-100/40 dark:from-red-950/20 dark:to-red-900/10",
      border: "border-red-200/60 dark:border-red-800/40",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className={`rounded-xl border backdrop-blur-sm p-4 ${stat.cardBg} ${stat.border}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${stat.iconBg} shrink-0`}>
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
          </div>
        )
      })}
    </div>
  )
}
