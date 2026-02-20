"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { Trade } from "@/types/trade"
import type { DailyStats } from "@/lib/calendar-utils"
import { formatCurrency } from "@/lib/fx-converter"
import { calculateR } from "@/lib/trade-stats"

interface DailyDrawerProps {
  open: boolean
  onClose: () => void
  date: Date | null
  stats: DailyStats | undefined
  currency: string
}

export function DailyDrawer({ open, onClose, date, stats, currency }: DailyDrawerProps) {
  const formattedDate = date?.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const sortedTrades = React.useMemo(() => {
    if (!stats) return []
    return [...stats.tradesList].sort((a, b) => {
      const timeA = a.open_time || a.entry_date
      const timeB = b.open_time || b.entry_date
      return timeA.localeCompare(timeB)
    })
  }, [stats])

  if (!date || !stats) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{formattedDate}</SheetTitle>
          <SheetDescription>
            {stats.trades} {stats.trades === 1 ? 'trade' : 'trades'} • Win Rate: {stats.winRate.toFixed(0)}%
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Daily Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Net P&L</p>
              <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(stats.totalPnL, currency)}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Net R</p>
              <p className={`text-2xl font-bold ${stats.totalR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.totalR > 0 ? '+' : ''}{stats.totalR.toFixed(2)}R
              </p>
            </div>
          </div>

          {/* Trade List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Trades</h3>
            {sortedTrades.map((trade) => {
              const r = calculateR(trade) || 0
              const entryTime = trade.open_time
                ? trade.open_time.substring(0, 5)
                : '—'

              return (
                <div
                  key={trade.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{trade.symbol}</span>
                        <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                          {trade.trade_type}
                        </Badge>
                        {trade.strategy && (
                          <Badge variant="outline" className="text-xs">
                            {trade.strategy}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{entryTime}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${trade.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(trade.pnl, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r > 0 ? '+' : ''}{r.toFixed(2)}R
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs pt-2 border-t border-border/50">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">{trade.entry_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Exit</p>
                      <p className="font-medium">{trade.exit_price?.toFixed(2) || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Qty</p>
                      <p className="font-medium">{trade.quantity}</p>
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">Notes:</p>
                      <p className="text-xs mt-1">{trade.notes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
