'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import type { Trade } from '@/types/supabase'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TradeAnalysisChartProps {
  trades: Trade[]
}

export function TradeAnalysisChart({ trades }: TradeAnalysisChartProps) {
  const chartData = React.useMemo(() => {
    // Sort trades by closed date
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(a.closed_at || a.exit_date || '').getTime()
      const dateB = new Date(b.closed_at || b.exit_date || '').getTime()
      return dateA - dateB
    })

    let cumulativePnl = 0
    let cumulativeR = 0

    return sortedTrades.map((trade, index) => {
      cumulativePnl += trade.pnl
      cumulativeR += trade.r_multiple || 0

      const date = trade.closed_at || trade.exit_date || ''
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      return {
        index: index + 1,
        date: formattedDate,
        fullDate: date,
        pnl: trade.pnl,
        cumulativePnl: Number(cumulativePnl.toFixed(2)),
        cumulativeR: Number(cumulativeR.toFixed(2)),
        symbol: trade.symbol,
        direction: trade.direction,
      }
    })
  }, [trades])

  const finalPnl = chartData.length > 0 ? chartData[chartData.length - 1].cumulativePnl : 0
  const finalR = chartData.length > 0 ? chartData[chartData.length - 1].cumulativeR : 0
  const isPositive = finalPnl >= 0

  if (trades.length === 0) {
    return (
      <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg p-8">
        <div className="text-center text-neutral-500 dark:text-neutral-400">
          No trades to display. Adjust your filters to see the chart.
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Cumulative Performance
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Track your edge over time
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Total P&L</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                ${finalPnl.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Total R</div>
              <div className={`text-2xl font-bold ${
                finalR >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {finalR >= 0 ? '+' : ''}{finalR.toFixed(1)}R
              </div>
            </div>
          </div>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="date"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: string, props: any) => {
                  if (name === 'cumulativePnl') {
                    return [`$${Number(value).toLocaleString()}`, 'Cumulative P&L']
                  }
                  return value
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload
                    return `Trade #${data.index} - ${data.symbol} ${data.direction.toUpperCase()}`
                  }
                  return label
                }}
              />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="cumulativePnl"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth={3}
                dot={{
                  fill: '#fff',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span>Profitable Period</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>Drawdown Period</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
