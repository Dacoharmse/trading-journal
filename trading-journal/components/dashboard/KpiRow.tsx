"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gauge } from "./Gauge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, TrendingUp, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { Trade } from "@/types/trade"
import {
  calculateNetR,
  calculateExpectancyR,
  calculateRecoveryFactorR,
  calculateDayWinPct,
} from "@/lib/trade-stats"

interface KpiRowProps {
  trades: Trade[]
  netPnL: number
  winRate: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  avgHoldMins: number | undefined
  currency: string
  units: 'currency' | 'r'
}

export function KpiRow({
  trades,
  netPnL,
  winRate,
  profitFactor,
  avgWin,
  avgLoss,
  avgHoldMins,
  currency,
  units,
}: KpiRowProps) {
  const netR = calculateNetR(trades)
  const expectancyR = calculateExpectancyR(trades)
  const recoveryFactorR = calculateRecoveryFactorR(trades)
  const dayWinPct = calculateDayWinPct(trades)

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

  const formatHoldTime = (mins: number | undefined) => {
    if (!mins) return '0m'
    if (mins < 60) return `${Math.round(mins)}m`
    if (mins < 1440) return `${Math.round(mins / 60)}h`
    return `${Math.round(mins / 1440)}d`
  }

  // Empty state
  if (trades.length === 0) {
    return (
      <div className="grid gap-4 grid-cols-1">
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No trades match your filters</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try expanding the date range or add your first trade to get started
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/trades"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Add Trade
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {/* Net P&L */}
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Net P&L
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Net P&L</p>
                  <p className="text-xs mb-2">Total profit/loss after fees across all trades.</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Formula:</strong> ΣP&L - ΣFees
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-3xl font-bold ${netPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {units === 'currency' ? formatCurrency(netPnL) : `${netR.toFixed(1)}R`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {units === 'currency' ? `${netR.toFixed(1)}R` : formatCurrency(netPnL)}
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Win Rate
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Win Rate</p>
                  <p className="text-xs mb-2">Percentage of trades that were profitable.</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Formula:</strong> (Winning Trades / Total Trades) × 100
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Higher is better, but must be balanced with Avg Win/Loss ratio.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{winRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {trades.length} trades
              </div>
            </div>
            <Gauge value={winRate} size={60} strokeWidth={6} color={winRate >= 50 ? "#22c55e" : "#ef4444"} showValue={false} />
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Profit Factor
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Profit Factor</p>
                  <p className="text-xs mb-2">Ratio of total wins to total losses.</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Formula:</strong> ΣWins / |ΣLosses|
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-red-500">&lt;1</span> = losing edge,{' '}
                    <span className="text-amber-500">1-1.5</span> = marginal,{' '}
                    <span className="text-green-500">&gt;1.5</span> = solid edge
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between">
            <div className="text-3xl font-bold">{profitFactor.toFixed(2)}</div>
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={profitFactor < 1 ? "#ef4444" : profitFactor < 1.5 ? "#f59e0b" : "#22c55e"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(profitFactor / 3, 1) * 251.2} 251.2`}
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Day Win % */}
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Day Win %
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Day Win %</p>
                  <p className="text-xs mb-2">% of days with net positive P&L in the selected period.</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Formula:</strong> (Green Days / Total Days) × 100
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Measures consistency. Ideal range: 50-70%.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between">
            <div className="text-3xl font-bold">{dayWinPct.toFixed(1)}%</div>
            <Gauge value={dayWinPct} size={60} strokeWidth={6} color={dayWinPct >= 50 ? "#22c55e" : "#ef4444"} showValue={false} />
          </CardContent>
        </Card>

        {/* Avg Win vs Loss */}
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Avg Win/Loss
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Avg Win/Loss</p>
                  <p className="text-xs mb-2">Comparison of average winning vs losing trade size.</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Ratio:</strong> Avg Win / |Avg Loss|
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Higher ratio (&gt;2.0) allows for lower win rate while staying profitable.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600 font-medium">Win</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(avgWin)}</span>
              </div>
              <div className="flex gap-1">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${(avgWin / (avgWin + Math.abs(avgLoss))) * 100}%` }}
                />
                <div
                  className="h-2 bg-red-500 rounded-full"
                  style={{ width: `${(Math.abs(avgLoss) / (avgWin + Math.abs(avgLoss))) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-600 font-medium">Loss</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(avgLoss)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expectancy & Recovery */}
        <Card className="border-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Expectancy (R)</span>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Expectancy (R)</p>
                  <p className="text-xs mb-2">Avg R per trade. Positive = edge.</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Formula:</strong> (Win% × AvgWinR) − ((1−Win%) × |AvgLossR|)
                  </p>
                </TooltipContent>
              </Tooltip>
              <span className={`text-lg font-bold ${expectancyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {expectancyR >= 0 ? '+' : ''}{expectancyR.toFixed(2)}R
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Recovery</span>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">Recovery Factor</p>
                  <p className="text-xs mb-2">Measures how efficiently you recover from drawdowns.</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Formula:</strong> Net R / |Max DD R|
                  </p>
                </TooltipContent>
              </Tooltip>
              <span className="text-lg font-bold text-foreground">
                {recoveryFactorR.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Avg Hold</span>
              <span className="text-sm font-medium text-foreground">
                {formatHoldTime(avgHoldMins)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
