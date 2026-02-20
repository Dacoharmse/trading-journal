"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@/types/trade"
import { calculateR, calculateMaxDrawdownR } from "@/lib/trade-stats"
import { TrendingUp } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface EquityChartProps {
  trades: Trade[]
  units: 'currency' | 'r'
  currency: string
}

export function EquityChart({ trades, units, currency }: EquityChartProps) {
  const [timeRange, setTimeRange] = React.useState<'week' | 'month'>('month')

  const formatValue = React.useCallback((value: number) => {
    if (units === 'r') return `${value.toFixed(1)}R`
    if (currency === 'R') return `${value.toFixed(0)}R`
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `$${value.toFixed(0)}`
    }
  }, [units, currency])

  const { chartData, summary, drawdownInfo } = React.useMemo(() => {
    const sorted = [...trades].sort((a, b) =>
      new Date(a.exit_date || a.entry_date).getTime() -
      new Date(b.exit_date || b.entry_date).getTime()
    )

    const now = new Date()
    const cutoffDays = timeRange === 'week' ? 7 : 30
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000)

    const filtered = sorted.filter(t =>
      new Date(t.exit_date || t.entry_date) >= cutoffDate
    )

    let cumulative = 0
    let peak = 0
    let maxDD = 0
    let wins = 0

    const points: Array<{ label: string; cumulative: number }> = []

    filtered.forEach(trade => {
      const value = units === 'r' ? (calculateR(trade) || 0) : trade.pnl
      cumulative += value
      if (value > 0) wins++
      if (cumulative > peak) peak = cumulative
      const dd = peak - cumulative
      if (dd > maxDD) maxDD = dd
      const d = new Date(trade.exit_date || trade.entry_date)
      points.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative: +cumulative.toFixed(4),
      })
    })

    // Prepend origin
    const chartData = [{ label: '', cumulative: 0 }, ...points]

    return {
      chartData,
      summary: {
        netValue: cumulative,
        maxDD,
        tradeCount: filtered.length,
        winRate: filtered.length > 0 ? (wins / filtered.length) * 100 : 0,
      },
      drawdownInfo: calculateMaxDrawdownR(trades),
    }
  }, [trades, units, timeRange])

  const dataPoints = chartData.slice(1)
  const isPositive = summary.netValue >= 0
  const maxDD = units === 'r' ? drawdownInfo.maxDrawdownR : drawdownInfo.maxDrawdownCurrency

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]?.payload?.label) return null
    const pt = payload[0].payload
    return (
      <div className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 shadow-xl text-xs">
        <p className="text-neutral-400 mb-1">{pt.label}</p>
        <p className={`font-semibold text-sm ${pt.cumulative >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatValue(pt.cumulative)}
        </p>
      </div>
    )
  }

  if (dataPoints.length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-52 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No trades in this period</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const strokeColor = isPositive ? '#10b981' : '#ef4444'
  const gradientId = isPositive ? 'eqGradPos' : 'eqGradNeg'

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Title + stats */}
          <div>
            <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net P&L</p>
                <p className={`text-lg font-bold leading-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatValue(summary.netValue)}
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Max DD</p>
                <p className="text-sm font-semibold text-red-400 leading-tight">
                  -{formatValue(maxDD)}
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Win Rate</p>
                <p className="text-sm font-semibold leading-tight">
                  {summary.winRate.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Time toggle */}
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 text-xs mt-1">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === 'week'
                  ? 'bg-white dark:bg-neutral-700 shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === 'month'
                  ? 'bg-white dark:bg-neutral-700 shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGradPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="eqGradNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-neutral-200 dark:text-neutral-700"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-neutral-400"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-neutral-400"
                axisLine={false}
                tickLine={false}
                width={54}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />

              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />

              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
