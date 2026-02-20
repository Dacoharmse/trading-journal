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
  const inMonth = isCurrentMonth(date, currentMonth)
  const isTodayDate = isToday(date)
  const hasData = !!stats && inMonth

  const value = displayUnit === 'r' ? stats?.totalR || 0 : stats?.totalPnL || 0
  const colorClass = hasData ? getPnLColor(value, maxAbsValue) : ''

  const formattedValue = React.useMemo(() => {
    if (!hasData) return null
    if (displayUnit === 'r') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}R`
    } else {
      const symbol = getCurrencySymbol(currency as any)
      const sign = value < 0 ? '-' : ''
      return `${sign}${symbol}${Math.abs(value).toFixed(0)}`
    }
  }, [hasData, displayUnit, value, currency])

  const bgClass = hasData
    ? colorClass
    : inMonth
      ? 'bg-neutral-50 dark:bg-neutral-900/30'
      : 'bg-neutral-50/20 dark:bg-neutral-900/10'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onDateClick(date, stats)}
            className={`
              min-h-[84px] flex flex-col p-2 transition-all text-left w-full
              ${bgClass}
              ${!inMonth ? 'opacity-25' : ''}
              ${isHighlightedBest ? 'outline outline-2 outline-amber-400 outline-offset-[-2px]' : ''}
              ${hasData ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'}
            `}
          >
            {/* Day number */}
            <div className="flex justify-start">
              <span
                className={`
                  text-xs font-semibold leading-none w-6 h-6 flex items-center justify-center rounded-full
                  ${isTodayDate
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : ''
                  }
                `}
              >
                {dayNumber}
              </span>
            </div>

            {/* P&L and trade count */}
            {formattedValue && (
              <div className="mt-auto flex flex-col gap-0.5">
                <span className="text-sm font-bold leading-tight">
                  {formattedValue}
                </span>
                <span className="text-[10px] opacity-70 leading-none">
                  {stats!.trades} {stats!.trades === 1 ? 'trade' : 'trades'}
                </span>
              </div>
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
