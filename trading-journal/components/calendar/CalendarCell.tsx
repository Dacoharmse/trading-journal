"use client"

import * as React from "react"
import { getPnLColor, isToday, isCurrentMonth, type DailyStats } from "@/lib/calendar-utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCurrency, getCurrencySymbol } from "@/lib/fx-converter"

interface CalendarCellProps {
  date: Date
  stats: DailyStats | undefined
  currentMonth: number
  displayUnit: 'currency' | 'r'
  currency: string
  maxAbsValue: number
  isHighlightedBest?: boolean
  onDateClick: (date: Date, stats: DailyStats | undefined) => void
}

export function CalendarCell({
  date,
  stats,
  currentMonth,
  displayUnit,
  currency,
  maxAbsValue,
  isHighlightedBest,
  onDateClick,
}: CalendarCellProps) {
  const dayNumber = date.getDate()
  const isInCurrentMonth = isCurrentMonth(date, currentMonth)
  const isTodayDate = isToday(date)

  const value = displayUnit === 'r' ? stats?.totalR || 0 : stats?.totalPnL || 0
  const colorClass = stats ? getPnLColor(value, maxAbsValue) : 'bg-neutral-50 dark:bg-neutral-900/50'

  const formattedValue = React.useMemo(() => {
    if (!stats) return null

    if (displayUnit === 'r') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}R`
    } else {
      const symbol = getCurrencySymbol(currency as any)
      return `${symbol}${Math.abs(value).toFixed(0)}`
    }
  }, [stats, displayUnit, value, currency])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onDateClick(date, stats)}
            className={`
              aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
              ${colorClass}
              ${isInCurrentMonth ? 'opacity-100' : 'opacity-30'}
              ${isTodayDate ? 'ring-2 ring-neutral-500 ring-offset-2 dark:ring-offset-neutral-900' : ''}
              ${isHighlightedBest ? 'ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-neutral-900' : ''}
              ${stats ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : 'cursor-default'}
            `}
          >
            {/* Day Number */}
            <span className={`text-xs ${isInCurrentMonth ? '' : 'text-muted-foreground/50'}`}>
              {dayNumber}
            </span>

            {/* P&L Value */}
            {formattedValue && (
              <span className="text-xs font-semibold mt-0.5">
                {formattedValue}
              </span>
            )}

            {/* Trade Count Indicator */}
            {stats && stats.trades > 0 && (
              <span className="text-[10px] opacity-70 mt-0.5">
                {stats.trades} {stats.trades === 1 ? 'trade' : 'trades'}
              </span>
            )}
          </button>
        </TooltipTrigger>

        {stats && (
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">
                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <div className="space-y-0.5">
                <p>Trades: {stats.trades}</p>
                <p className={stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                  P&L: {formatCurrency(stats.totalPnL, currency)}
                </p>
                <p className={stats.totalR >= 0 ? 'text-green-500' : 'text-red-500'}>
                  Net R: {stats.totalR > 0 ? '+' : ''}{stats.totalR.toFixed(2)}R
                </p>
                <p>Win Rate: {stats.winRate.toFixed(0)}%</p>
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
