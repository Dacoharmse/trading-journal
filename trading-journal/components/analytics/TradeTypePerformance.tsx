'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react'

interface Trade {
  id: string
  direction: 'long' | 'short'
  pnl: number
  r_multiple?: number | null
  playbook_id?: string | null
}

interface Playbook {
  id: string
  name: string
  trade_type?: 'continuation' | 'reversal' | null
  direction?: 'buy' | 'sell' | 'both' | null
}

interface TradeTypePerformanceProps {
  trades: Trade[]
  playbooks: Playbook[]
}

interface PerformanceMetrics {
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  totalR: number
  avgR: number
  expectancy: number
}

function calculateMetrics(trades: Trade[]): PerformanceMetrics {
  const totalTrades = trades.length
  const wins = trades.filter(t => t.pnl > 0).length
  const losses = trades.filter(t => t.pnl < 0).length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
  const avgR = totalTrades > 0 ? totalR / totalTrades : 0

  // Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const avgWinR = wins > 0
    ? trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + (t.r_multiple || 0), 0) / wins
    : 0
  const avgLossR = losses > 0
    ? Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + (t.r_multiple || 0), 0) / losses)
    : 0
  const expectancy = (winRate / 100) * avgWinR - ((100 - winRate) / 100) * avgLossR

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnL,
    totalR,
    avgR,
    expectancy,
  }
}

function MetricCard({
  title,
  metrics,
  icon: Icon,
  color,
  subMetrics,
}: {
  title: string
  metrics: PerformanceMetrics
  icon: React.ElementType
  color: 'blue' | 'purple' | 'emerald' | 'red'
  subMetrics?: { label: string; metrics: PerformanceMetrics; color: 'emerald' | 'red' }[]
}) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30',
    purple: 'border-purple-200 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/30',
    emerald: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/30',
    red: 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/30',
  }

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className={cn('rounded-xl border p-4', colorClasses[color])}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('h-5 w-5', iconColorClasses[color])} />
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <span className="ml-auto text-sm text-neutral-500 dark:text-neutral-400">
          {metrics.totalTrades} trades
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Win Rate</div>
          <div className={cn(
            'text-lg font-bold',
            metrics.winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}>
            {metrics.winRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Total R</div>
          <div className={cn(
            'text-lg font-bold',
            metrics.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}>
            {metrics.totalR >= 0 ? '+' : ''}{metrics.totalR.toFixed(2)}R
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Avg R</div>
          <div className={cn(
            'text-lg font-bold',
            metrics.avgR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}>
            {metrics.avgR >= 0 ? '+' : ''}{metrics.avgR.toFixed(2)}R
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Expectancy</div>
          <div className={cn(
            'text-lg font-bold',
            metrics.expectancy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}>
            {metrics.expectancy >= 0 ? '+' : ''}{metrics.expectancy.toFixed(2)}R
          </div>
        </div>
      </div>

      {/* Sub-metrics breakdown (Buy vs Sell) */}
      {subMetrics && subMetrics.length > 0 && (
        <div className="border-t border-neutral-200/50 dark:border-neutral-700/50 pt-3 mt-3">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
            Direction Breakdown
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subMetrics.map((sub) => (
              <div
                key={sub.label}
                className={cn(
                  'rounded-lg border p-2',
                  sub.color === 'emerald'
                    ? 'border-emerald-200/70 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20'
                    : 'border-red-200/70 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/20'
                )}
              >
                <div className="flex items-center gap-1 mb-1">
                  {sub.color === 'emerald' ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {sub.label}
                  </span>
                  <span className="ml-auto text-xs text-neutral-500">
                    {sub.metrics.totalTrades}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-sm font-bold',
                    sub.metrics.winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {sub.metrics.winRate.toFixed(0)}%
                  </span>
                  <span className={cn(
                    'text-xs',
                    sub.metrics.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {sub.metrics.totalR >= 0 ? '+' : ''}{sub.metrics.totalR.toFixed(1)}R
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function TradeTypePerformance({ trades, playbooks }: TradeTypePerformanceProps) {
  // Create a map of playbook id to playbook
  const playbookMap = React.useMemo(() => {
    const map = new Map<string, Playbook>()
    playbooks.forEach(p => map.set(p.id, p))
    return map
  }, [playbooks])

  // Categorize trades by playbook trade type
  const categorizedTrades = React.useMemo(() => {
    const continuationTrades: Trade[] = []
    const reversalTrades: Trade[] = []
    const uncategorizedTrades: Trade[] = []

    trades.forEach(trade => {
      if (!trade.playbook_id) {
        uncategorizedTrades.push(trade)
        return
      }
      const playbook = playbookMap.get(trade.playbook_id)
      if (!playbook?.trade_type) {
        uncategorizedTrades.push(trade)
        return
      }
      if (playbook.trade_type === 'continuation') {
        continuationTrades.push(trade)
      } else if (playbook.trade_type === 'reversal') {
        reversalTrades.push(trade)
      }
    })

    return { continuationTrades, reversalTrades, uncategorizedTrades }
  }, [trades, playbookMap])

  // Calculate metrics for each category
  const continuationMetrics = React.useMemo(
    () => calculateMetrics(categorizedTrades.continuationTrades),
    [categorizedTrades.continuationTrades]
  )
  const reversalMetrics = React.useMemo(
    () => calculateMetrics(categorizedTrades.reversalTrades),
    [categorizedTrades.reversalTrades]
  )

  // Calculate buy/sell breakdown for continuations
  const continuationBuys = categorizedTrades.continuationTrades.filter(t => t.direction === 'long')
  const continuationSells = categorizedTrades.continuationTrades.filter(t => t.direction === 'short')
  const continuationBuyMetrics = calculateMetrics(continuationBuys)
  const continuationSellMetrics = calculateMetrics(continuationSells)

  // Calculate buy/sell breakdown for reversals
  const reversalBuys = categorizedTrades.reversalTrades.filter(t => t.direction === 'long')
  const reversalSells = categorizedTrades.reversalTrades.filter(t => t.direction === 'short')
  const reversalBuyMetrics = calculateMetrics(reversalBuys)
  const reversalSellMetrics = calculateMetrics(reversalSells)

  // Determine which is better: continuations or reversals
  const continuationScore = continuationMetrics.expectancy * Math.sqrt(continuationMetrics.totalTrades)
  const reversalScore = reversalMetrics.expectancy * Math.sqrt(reversalMetrics.totalTrades)
  const betterType = continuationScore > reversalScore ? 'continuation' : 'reversal'

  // Overall buy vs sell
  const allBuys = trades.filter(t => t.direction === 'long')
  const allSells = trades.filter(t => t.direction === 'short')
  const buyMetrics = calculateMetrics(allBuys)
  const sellMetrics = calculateMetrics(allSells)
  const betterDirection = buyMetrics.expectancy > sellMetrics.expectancy ? 'buys' : 'sells'

  // Check if we have any categorized trades
  const hasCategorizedTrades = categorizedTrades.continuationTrades.length > 0 || categorizedTrades.reversalTrades.length > 0

  if (!hasCategorizedTrades) {
    return (
      <div className="rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-neutral-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Trade Type Performance
          </h2>
        </div>
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
          <p className="mb-2">No trade type data available yet.</p>
          <p className="text-sm">
            Set the <strong>Trade Type</strong> (Continuation/Reversal) on your playbooks to see performance breakdown.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-neutral-500" />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Trade Type Performance
        </h2>
      </div>

      {/* Summary Insight */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Insight:</strong> You perform better with{' '}
          <span className="font-bold capitalize">{betterType}</span> trades
          {hasCategorizedTrades && (
            <>
              {' '}and overall better with <span className="font-bold">{betterDirection}</span>
            </>
          )}
          . Focus on your strengths to maximize returns.
        </p>
      </div>

      {/* Trade Type Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {continuationMetrics.totalTrades > 0 && (
          <MetricCard
            title="Continuations"
            metrics={continuationMetrics}
            icon={TrendingUp}
            color="blue"
            subMetrics={[
              { label: 'Buys', metrics: continuationBuyMetrics, color: 'emerald' },
              { label: 'Sells', metrics: continuationSellMetrics, color: 'red' },
            ]}
          />
        )}

        {reversalMetrics.totalTrades > 0 && (
          <MetricCard
            title="Reversals"
            metrics={reversalMetrics}
            icon={TrendingDown}
            color="purple"
            subMetrics={[
              { label: 'Buys', metrics: reversalBuyMetrics, color: 'emerald' },
              { label: 'Sells', metrics: reversalSellMetrics, color: 'red' },
            ]}
          />
        )}
      </div>

      {/* Overall Direction Comparison */}
      <div className="mt-6 pt-4 border-t border-neutral-200/50 dark:border-neutral-700/50">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Overall Direction Performance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            'rounded-lg border p-3',
            buyMetrics.expectancy > sellMetrics.expectancy
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
              : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/50'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Buys (Long)</span>
              {buyMetrics.expectancy > sellMetrics.expectancy && (
                <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400">BETTER</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-xs text-neutral-500">Trades</div>
                <div className="font-semibold">{buyMetrics.totalTrades}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Win Rate</div>
                <div className={cn('font-semibold', buyMetrics.winRate >= 50 ? 'text-emerald-600' : 'text-red-600')}>
                  {buyMetrics.winRate.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Total R</div>
                <div className={cn('font-semibold', buyMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {buyMetrics.totalR >= 0 ? '+' : ''}{buyMetrics.totalR.toFixed(1)}R
                </div>
              </div>
            </div>
          </div>

          <div className={cn(
            'rounded-lg border p-3',
            sellMetrics.expectancy > buyMetrics.expectancy
              ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'
              : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/50'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Sells (Short)</span>
              {sellMetrics.expectancy > buyMetrics.expectancy && (
                <span className="ml-auto text-xs font-bold text-red-600 dark:text-red-400">BETTER</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-xs text-neutral-500">Trades</div>
                <div className="font-semibold">{sellMetrics.totalTrades}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Win Rate</div>
                <div className={cn('font-semibold', sellMetrics.winRate >= 50 ? 'text-emerald-600' : 'text-red-600')}>
                  {sellMetrics.winRate.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Total R</div>
                <div className={cn('font-semibold', sellMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {sellMetrics.totalR >= 0 ? '+' : ''}{sellMetrics.totalR.toFixed(1)}R
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
