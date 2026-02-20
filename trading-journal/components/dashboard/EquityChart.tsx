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

  const { chartData, markers, drawdownInfo } = React.useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const dateA = new Date(a.exit_date || a.entry_date).getTime()
      const dateB = new Date(b.exit_date || b.entry_date).getTime()
      return dateA - dateB
    })

    const now = new Date()
    const cutoffDays = timeRange === 'week' ? 7 : 30
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000)

    const filtered = sorted.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date)
      return tradeDate >= cutoffDate
    })

    let cumulativeValue = 0
    let peak = 0
    let peakIndex = -1
    let ddStartIndex = -1
    let ddEndIndex = -1
    let maxDD = 0
    let bestTradeIndex = -1
    let worstTradeIndex = -1
    let bestR = -Infinity
    let worstR = Infinity

    const points: Array<{
      label: string
      cumulative: number
      marker?: string
    }> = []

    filtered.forEach((trade, idx) => {
      const value = units === 'r' ? (calculateR(trade) || 0) : trade.pnl
      const r = calculateR(trade) || 0
      cumulativeValue += value

      if (r > bestR) { bestR = r; bestTradeIndex = idx }
      if (r < worstR) { worstR = r; worstTradeIndex = idx }

      if (cumulativeValue > peak) { peak = cumulativeValue; peakIndex = idx }

      const drawdown = peak - cumulativeValue
      if (drawdown > maxDD) {
        maxDD = drawdown
        ddStartIndex = peakIndex
        ddEndIndex = idx
      }

      const tradeDate = new Date(trade.exit_date || trade.entry_date)
      points.push({
        label: tradeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative: +cumulativeValue.toFixed(4),
      })
    })

    // Mark special points
    const markerSet = new Set<number>()
    if (bestTradeIndex >= 0) markerSet.add(bestTradeIndex)
    if (worstTradeIndex >= 0) markerSet.add(worstTradeIndex)
    if (ddStartIndex >= 0) markerSet.add(ddStartIndex)
    if (ddEndIndex >= 0) markerSet.add(ddEndIndex)

    // Find recovery
    let recoveryIndex = -1
    if (ddEndIndex >= 0) {
      const ddPeak = points[ddStartIndex]?.cumulative || 0
      for (let i = ddEndIndex + 1; i < points.length; i++) {
        if (points[i].cumulative > ddPeak) { recoveryIndex = i; break }
      }
    }

    // Add start point at 0
    const chartData = [
      { label: '', cumulative: 0 },
      ...points,
    ]

    return {
      chartData,
      markers: { bestTradeIndex, worstTradeIndex, ddStartIndex, ddEndIndex, recoveryIndex, bestR, worstR },
      drawdownInfo: calculateMaxDrawdownR(trades),
    }
  }, [trades, units, timeRange])

  const maxDD = units === 'r' ? drawdownInfo.maxDrawdownR : drawdownInfo.maxDrawdownCurrency

  const dataPoints = chartData.slice(1) // exclude the leading 0
  const currentValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].cumulative : 0
  const isPositive = currentValue >= 0

  if (dataPoints.length === 0) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-card backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trades in this period</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom dot renderer — shows emoji for special points, nothing otherwise
  const renderDot = (props: any) => {
    const { cx, cy, index } = props
    const dataIndex = index - 1 // offset for the leading 0 start point

    if (index === 0 || dataIndex < 0) return <g key={`dot-${index}`} />

    const emojis: string[] = []
    if (dataIndex === markers.bestTradeIndex) emojis.push('🏆')
    if (dataIndex === markers.worstTradeIndex) emojis.push('💥')
    if (dataIndex === markers.ddStartIndex && dataIndex !== markers.bestTradeIndex) emojis.push('📉')
    if (dataIndex === markers.ddEndIndex && dataIndex !== markers.worstTradeIndex) emojis.push('📍')
    if (dataIndex === markers.recoveryIndex) emojis.push('✅')

    if (emojis.length === 0) return <g key={`dot-${index}`} />

    return (
      <text
        key={`dot-${index}`}
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fontSize="14"
        dominantBaseline="auto"
      >
        {emojis.join('')}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null
    const pt = payload[0].payload
    if (!pt.label) return null
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
        <p className="text-muted-foreground font-medium mb-0.5">{pt.label}</p>
        <p className={`font-bold text-sm ${pt.cumulative >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatValue(pt.cumulative)}
        </p>
      </div>
    )
  }

  const gradientId = isPositive ? 'equityPos' : 'equityNeg'
  const strokeColor = isPositive ? '#22c55e' : '#ef4444'

  return (
    <Card className="border-0 bg-white/60 dark:bg-card backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Equity Curve</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Max DD: {formatValue(maxDD)}
            </div>
          </div>
          <div className="flex gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'week' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'month' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="equityPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="equityNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.03} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={renderDot}
                activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Current value overlay */}
          <div className="absolute bottom-6 right-10 text-right pointer-events-none">
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {formatValue(currentValue)}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>🏆</span>
            <span>Best trade ({markers.bestR > -Infinity ? `${markers.bestR > 0 ? '+' : ''}${markers.bestR.toFixed(1)}R` : '--'})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💥</span>
            <span>Worst trade ({markers.worstR < Infinity ? `${markers.worstR.toFixed(1)}R` : '--'})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📉</span>
            <span>DD start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📍</span>
            <span>DD low</span>
          </div>
          {markers.recoveryIndex >= 0 && (
            <div className="flex items-center gap-1.5">
              <span>✅</span>
              <span>Recovery</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
