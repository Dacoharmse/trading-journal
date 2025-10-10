"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Account } from "@/types/account"
import { TradeStats } from "@/types/trade"
import { Target, TrendingDown, TrendingUp } from "lucide-react"

interface AccountMetersProps {
  account: Account
  stats: TradeStats
  currency: string
}

export function AccountMeters({ account, stats, currency }: AccountMetersProps) {
  const isPropAccount = account.accountType === 'prop-firm'

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

  // Calculate prop firm metrics
  const currentBalance = account.metrics?.currentBalance || 0
  const startingBalance = account.metrics?.startingBalance || account.startingBalance || 0
  const profitTarget = account.profitTarget || 0
  const maxDrawdown = account.maxDrawdown || 0
  const dailyDrawdown = account.dailyDrawdown || 0

  const currentProfit = currentBalance - startingBalance
  const profitProgress = profitTarget > 0 ? (currentProfit / profitTarget) * 100 : 0

  const currentDrawdown = account.metrics?.currentDrawdown || 0
  const drawdownProgress = maxDrawdown > 0 ? (Math.abs(currentDrawdown) / maxDrawdown) * 100 : 0

  const phase = account.phase || 'Phase 1'

  return (
    <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{account.name}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {account.broker}
            </div>
          </div>
          {isPropAccount && (
            <span className="px-3 py-1 text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full">
              {phase}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
          <div className={`text-2xl font-bold ${currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(currentBalance)}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentProfit >= 0 ? '+' : ''}{formatCurrency(currentProfit)} (
            {((currentProfit / startingBalance) * 100).toFixed(1)}%)
          </div>
        </div>

        {/* Prop Firm Metrics */}
        {isPropAccount && profitTarget > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">Profit Target</span>
              </div>
              <span className="font-semibold">
                {formatCurrency(currentProfit)} / {formatCurrency(profitTarget)}
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  profitProgress >= 100
                    ? 'bg-green-600'
                    : profitProgress >= 75
                    ? 'bg-green-500'
                    : profitProgress >= 50
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(profitProgress, 100)}%` }}
              />
            </div>
            <div className="text-xs text-right text-muted-foreground mt-1">
              {profitProgress.toFixed(1)}%
            </div>
          </div>
        )}

        {/* Max Drawdown */}
        {isPropAccount && maxDrawdown > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-muted-foreground">Max Drawdown</span>
              </div>
              <span className="font-semibold text-red-600">
                {formatCurrency(Math.abs(currentDrawdown))} / {formatCurrency(maxDrawdown)}
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  drawdownProgress >= 90
                    ? 'bg-red-600'
                    : drawdownProgress >= 70
                    ? 'bg-red-500'
                    : drawdownProgress >= 50
                    ? 'bg-orange-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(drawdownProgress, 100)}%` }}
              />
            </div>
            <div className="text-xs text-right text-muted-foreground mt-1">
              {drawdownProgress.toFixed(1)}%
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
          <div>
            <div className="text-xs text-muted-foreground">Total Trades</div>
            <div className="text-lg font-semibold">{stats.total_trades}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <div className={`text-lg font-semibold ${stats.win_rate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.win_rate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Profit Factor</div>
            <div className="text-lg font-semibold">
              {stats.profit_factor.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Net P&L</div>
            <div className={`text-lg font-semibold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.net_profit)}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        {isPropAccount && (
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              {profitProgress >= 100 ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-600">Target Hit! 🎉</span>
                </>
              ) : drawdownProgress >= 100 ? (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-red-600">Limit Breached</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground">In Progress</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
