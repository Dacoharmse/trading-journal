'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InfoIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Trade } from '@/types/trade'

interface Playbook {
  id: string
  name: string
  trade_type?: 'continuation' | 'reversal' | null
  direction?: 'buy' | 'sell' | 'both' | null
}

interface TradeTypeWidgetProps {
  trades: Trade[]
  playbooks: Playbook[]
}

interface PerformanceMetrics {
  totalTrades: number
  wins: number
  winRate: number
  totalR: number
  avgR: number
  expectancy: number
}

function calculateMetrics(trades: Trade[]): PerformanceMetrics {
  const totalTrades = trades.length
  const wins = trades.filter(t => t.pnl > 0).length
  const losses = trades.filter(t => t.pnl < 0).length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
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
    winRate,
    totalR,
    avgR,
    expectancy,
  }
}

export function TradeTypeWidget({ trades, playbooks }: TradeTypeWidgetProps) {
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

    trades.forEach(trade => {
      if (!trade.playbook_id) return
      const playbook = playbookMap.get(trade.playbook_id)
      if (!playbook?.trade_type) return

      if (playbook.trade_type === 'continuation') {
        continuationTrades.push(trade)
      } else if (playbook.trade_type === 'reversal') {
        reversalTrades.push(trade)
      }
    })

    return { continuationTrades, reversalTrades }
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

  // Calculate buy/sell breakdown (trade_type: 'long' = buy, 'short' = sell)
  const continuationBuys = categorizedTrades.continuationTrades.filter(t => t.trade_type === 'long')
  const continuationSells = categorizedTrades.continuationTrades.filter(t => t.trade_type === 'short')
  const reversalBuys = categorizedTrades.reversalTrades.filter(t => t.trade_type === 'long')
  const reversalSells = categorizedTrades.reversalTrades.filter(t => t.trade_type === 'short')

  const continuationBuyMetrics = calculateMetrics(continuationBuys)
  const continuationSellMetrics = calculateMetrics(continuationSells)
  const reversalBuyMetrics = calculateMetrics(reversalBuys)
  const reversalSellMetrics = calculateMetrics(reversalSells)

  // Determine best performer
  const hasCategorizedTrades = categorizedTrades.continuationTrades.length > 0 || categorizedTrades.reversalTrades.length > 0

  const continuationScore = continuationMetrics.expectancy * Math.sqrt(continuationMetrics.totalTrades)
  const reversalScore = reversalMetrics.expectancy * Math.sqrt(reversalMetrics.totalTrades)
  const betterType = continuationScore > reversalScore ? 'continuation' : 'reversal'

  // Overall buy vs sell (trade_type: 'long' = buy, 'short' = sell)
  const allBuys = trades.filter(t => t.trade_type === 'long')
  const allSells = trades.filter(t => t.trade_type === 'short')
  const buyMetrics = calculateMetrics(allBuys)
  const sellMetrics = calculateMetrics(allSells)
  const betterDirection = buyMetrics.expectancy > sellMetrics.expectancy ? 'buys' : 'sells'

  if (!hasCategorizedTrades) {
    return (
      <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Trade Type Performance</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">
                    Set the <strong>Trade Type</strong> (Continuation/Reversal) on your playbooks to track performance by trade style.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-4 text-muted-foreground text-xs">
            <p>No trade type data yet.</p>
            <p className="mt-1 text-neutral-400">Set trade types in playbooks to enable.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Trade Type Performance</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  <strong>Continuations</strong>: Trend-following trades<br />
                  <strong>Reversals</strong>: Counter-trend trades<br /><br />
                  Score = Expectancy × √Trades<br />
                  Higher score = better edge with enough sample size.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Continuations vs Reversals */}
        <div className="grid grid-cols-2 gap-2">
          {/* Continuations */}
          <div className={cn(
            'rounded-lg border p-2.5',
            betterType === 'continuation'
              ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/40'
              : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/50'
          )}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                Continuations
              </span>
              {betterType === 'continuation' && (
                <span className="ml-auto text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  BEST
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Trades</span>
                <span className="font-semibold">{continuationMetrics.totalTrades}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Win Rate</span>
                <span className={cn(
                  'font-semibold',
                  continuationMetrics.winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {continuationMetrics.winRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Total R</span>
                <span className={cn(
                  'font-semibold',
                  continuationMetrics.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {continuationMetrics.totalR >= 0 ? '+' : ''}{continuationMetrics.totalR.toFixed(1)}R
                </span>
              </div>
            </div>
            {/* Buy/Sell mini breakdown */}
            {continuationMetrics.totalTrades > 0 && (
              <div className="mt-2 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-700/50 flex gap-2 text-[10px]">
                <div className="flex items-center gap-0.5">
                  <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
                  <span className={cn(
                    continuationBuyMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {continuationBuyMetrics.totalR >= 0 ? '+' : ''}{continuationBuyMetrics.totalR.toFixed(1)}R
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <ArrowDownRight className="h-2.5 w-2.5 text-red-500" />
                  <span className={cn(
                    continuationSellMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {continuationSellMetrics.totalR >= 0 ? '+' : ''}{continuationSellMetrics.totalR.toFixed(1)}R
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Reversals */}
          <div className={cn(
            'rounded-lg border p-2.5',
            betterType === 'reversal'
              ? 'border-purple-300 bg-purple-50/70 dark:border-purple-800 dark:bg-purple-950/40'
              : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/50'
          )}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                Reversals
              </span>
              {betterType === 'reversal' && (
                <span className="ml-auto text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  BEST
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Trades</span>
                <span className="font-semibold">{reversalMetrics.totalTrades}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Win Rate</span>
                <span className={cn(
                  'font-semibold',
                  reversalMetrics.winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {reversalMetrics.winRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Total R</span>
                <span className={cn(
                  'font-semibold',
                  reversalMetrics.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {reversalMetrics.totalR >= 0 ? '+' : ''}{reversalMetrics.totalR.toFixed(1)}R
                </span>
              </div>
            </div>
            {/* Buy/Sell mini breakdown */}
            {reversalMetrics.totalTrades > 0 && (
              <div className="mt-2 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-700/50 flex gap-2 text-[10px]">
                <div className="flex items-center gap-0.5">
                  <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
                  <span className={cn(
                    reversalBuyMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {reversalBuyMetrics.totalR >= 0 ? '+' : ''}{reversalBuyMetrics.totalR.toFixed(1)}R
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <ArrowDownRight className="h-2.5 w-2.5 text-red-500" />
                  <span className={cn(
                    reversalSellMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {reversalSellMetrics.totalR >= 0 ? '+' : ''}{reversalSellMetrics.totalR.toFixed(1)}R
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overall direction insight */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
            <span>Overall direction:</span>
            <span className="font-medium">
              Better at{' '}
              <span className={cn(
                'font-bold',
                betterDirection === 'buys' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {betterDirection === 'buys' ? 'Buys (Long)' : 'Sells (Short)'}
              </span>
            </span>
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px]">
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-neutral-600 dark:text-neutral-400">
                {buyMetrics.totalTrades} trades,{' '}
                <span className={cn(buyMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {buyMetrics.totalR >= 0 ? '+' : ''}{buyMetrics.totalR.toFixed(1)}R
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-red-500" />
              <span className="text-neutral-600 dark:text-neutral-400">
                {sellMetrics.totalTrades} trades,{' '}
                <span className={cn(sellMetrics.totalR >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {sellMetrics.totalR >= 0 ? '+' : ''}{sellMetrics.totalR.toFixed(1)}R
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
