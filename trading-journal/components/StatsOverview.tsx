"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TradeStats } from "@/types/trade"

interface StatsOverviewProps {
  stats: TradeStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    return formatted
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_trades}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.winning_trades || 0} wins, {stats.losing_trades || 0} losses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.total_pnl)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Net: {formatCurrency(stats.net_profit || stats.total_pnl)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(stats.win_rate)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg Win: {formatCurrency(stats.avg_win)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Profit Factor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.profit_factor.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg Loss: {formatCurrency(Math.abs(stats.avg_loss))}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
