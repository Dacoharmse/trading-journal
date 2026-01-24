'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts'
import type { Trade } from '@/types/supabase'
import type { AnalyticsFilters } from './AdvancedFilters'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface WinRateCorrelationChartProps {
  allTrades: Trade[]
  filteredTrades: Trade[]
  filters: AnalyticsFilters
}

export function WinRateCorrelationChart({ allTrades, filteredTrades, filters }: WinRateCorrelationChartProps) {
  // Calculate win rate metrics
  const metrics = React.useMemo(() => {
    const calculateWinRate = (trades: Trade[]) => {
      if (trades.length === 0) return 0
      const wins = trades.filter(t => t.pnl > 0).length
      return (wins / trades.length) * 100
    }

    const calculateAvgR = (trades: Trade[]) => {
      if (trades.length === 0) return 0
      const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
      return totalR / trades.length
    }

    const calculateProfitFactor = (trades: Trade[]) => {
      const wins = trades.filter(t => t.pnl > 0)
      const losses = trades.filter(t => t.pnl < 0)
      const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0)
      const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))
      return totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0
    }

    const allWinRate = calculateWinRate(allTrades)
    const filteredWinRate = calculateWinRate(filteredTrades)
    const allAvgR = calculateAvgR(allTrades)
    const filteredAvgR = calculateAvgR(filteredTrades)
    const allProfitFactor = calculateProfitFactor(allTrades)
    const filteredProfitFactor = calculateProfitFactor(filteredTrades)

    return {
      allWinRate,
      filteredWinRate,
      winRateDiff: filteredWinRate - allWinRate,
      allAvgR,
      filteredAvgR,
      avgRDiff: filteredAvgR - allAvgR,
      allProfitFactor,
      filteredProfitFactor,
      profitFactorDiff: filteredProfitFactor - allProfitFactor,
      tradeCount: filteredTrades.length,
      totalTradeCount: allTrades.length,
    }
  }, [allTrades, filteredTrades])

  // Generate cumulative win rate data over time for both datasets
  const chartData = React.useMemo(() => {
    const generateCumulativeData = (trades: Trade[], label: string) => {
      const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(a.closed_at || a.exit_date || '').getTime()
        const dateB = new Date(b.closed_at || b.exit_date || '').getTime()
        return dateA - dateB
      })

      let wins = 0
      let total = 0

      return sortedTrades.map((trade, index) => {
        total++
        if (trade.pnl > 0) wins++

        const winRate = (wins / total) * 100

        return {
          index: index + 1,
          [`winRate_${label}`]: Number(winRate.toFixed(2)),
          date: new Date(trade.closed_at || trade.exit_date || '').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }
      })
    }

    // Generate data for all trades
    const allData = generateCumulativeData(allTrades, 'all')
    const filteredData = generateCumulativeData(filteredTrades, 'filtered')

    // Merge the two datasets
    const maxLength = Math.max(allData.length, filteredData.length)
    const merged = []

    for (let i = 0; i < maxLength; i++) {
      const point: any = { index: i + 1 }

      if (i < allData.length) {
        point.winRate_all = allData[i].winRate_all
        point.date_all = allData[i].date
      }

      if (i < filteredData.length) {
        point.winRate_filtered = filteredData[i].winRate_filtered
        point.date_filtered = filteredData[i].date
      }

      merged.push(point)
    }

    return merged
  }, [allTrades, filteredTrades])

  const isFilteredBetter = metrics.winRateDiff > 0
  const hasSignificantDifference = Math.abs(metrics.winRateDiff) > 5

  return (
    <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Win Rate Correlation
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              See how your filters impact performance vs. your overall baseline
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">All Trades</div>
              <div className="text-xl font-bold text-neutral-700 dark:text-neutral-300">
                {metrics.allWinRate.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {metrics.totalTradeCount} trades
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Filtered</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                isFilteredBetter ? 'text-green-600' : 'text-red-600'
              }`}>
                {isFilteredBetter ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {metrics.filteredWinRate.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {metrics.tradeCount} trades
              </div>
            </div>

            <div className={`px-4 py-3 rounded-lg border-2 ${
              hasSignificantDifference
                ? isFilteredBetter
                  ? 'bg-green-50 border-green-600 dark:bg-green-900/20 dark:border-green-600'
                  : 'bg-red-50 border-red-600 dark:bg-red-900/20 dark:border-red-600'
                : 'bg-neutral-50 border-neutral-300 dark:bg-neutral-800/20 dark:border-neutral-600'
            }`}>
              <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Difference</div>
              <div className={`text-2xl font-bold ${
                hasSignificantDifference
                  ? isFilteredBetter ? 'text-green-600' : 'text-red-600'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}>
                {metrics.winRateDiff > 0 ? '+' : ''}{metrics.winRateDiff.toFixed(1)}%
              </div>
              <div className="text-xs mt-1">
                <span className={`font-medium ${
                  Math.abs(metrics.avgRDiff) > 0.1
                    ? metrics.avgRDiff > 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}>
                  {metrics.avgRDiff > 0 ? '+' : ''}{metrics.avgRDiff.toFixed(2)}R avg
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[300px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="index"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                label={{ value: 'Trade Number', position: 'insideBottom', offset: -5, fontSize: 12 }}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: string) => {
                  const label = name === 'winRate_all' ? 'All Trades' : 'Filtered'
                  return [`${Number(value).toFixed(1)}%`, label]
                }}
                labelFormatter={(label) => `Trade #${label}`}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => value === 'winRate_all' ? 'All Trades (Baseline)' : 'Filtered Trades'}
              />
              <ReferenceLine y={50} stroke="#6B7280" strokeDasharray="3 3" label={{ value: '50%', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="winRate_all"
                stroke="#9CA3AF"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="winRate_filtered"
                stroke={isFilteredBetter ? '#10B981' : '#EF4444'}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="text-center">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Profit Factor</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                {metrics.allProfitFactor.toFixed(2)}
              </span>
              <span className="text-sm text-neutral-400">→</span>
              <span className={`text-lg font-bold ${
                metrics.profitFactorDiff > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.filteredProfitFactor.toFixed(2)}
              </span>
            </div>
            <div className={`text-xs mt-1 ${
              metrics.profitFactorDiff > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.profitFactorDiff > 0 ? '+' : ''}{metrics.profitFactorDiff.toFixed(2)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Avg R Multiple</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                {metrics.allAvgR.toFixed(2)}R
              </span>
              <span className="text-sm text-neutral-400">→</span>
              <span className={`text-lg font-bold ${
                metrics.avgRDiff > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.filteredAvgR.toFixed(2)}R
              </span>
            </div>
            <div className={`text-xs mt-1 ${
              metrics.avgRDiff > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.avgRDiff > 0 ? '+' : ''}{metrics.avgRDiff.toFixed(2)}R
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Sample Size</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                {metrics.totalTradeCount}
              </span>
              <span className="text-sm text-neutral-400">→</span>
              <span className="text-lg font-bold text-blue-600">
                {metrics.tradeCount}
              </span>
            </div>
            <div className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">
              {((metrics.tradeCount / metrics.totalTradeCount) * 100).toFixed(0)}% of trades
            </div>
          </div>
        </div>

        {/* Insights */}
        {hasSignificantDifference && (
          <div className={`mt-4 p-3 rounded-lg ${
            isFilteredBetter
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {isFilteredBetter ? (
                <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">
                <div className={`font-semibold mb-1 ${isFilteredBetter ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {isFilteredBetter ? '✅ Edge Identified!' : '⚠️ Negative Edge Detected'}
                </div>
                <div className={isFilteredBetter ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}>
                  {isFilteredBetter
                    ? `Your selected filters show a ${Math.abs(metrics.winRateDiff).toFixed(1)}% improvement in win rate. This combination represents a strong edge in your strategy.`
                    : `Your selected filters show a ${Math.abs(metrics.winRateDiff).toFixed(1)}% decrease in win rate. Consider avoiding or removing these conditions from your strategy.`
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
