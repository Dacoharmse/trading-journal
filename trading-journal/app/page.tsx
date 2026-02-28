"use client"

import * as React from "react"
import { useShallow } from "zustand/react/shallow"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { LayoutDashboard, RotateCcw, Check } from "lucide-react"
import { useTradeStore, useAccountStore } from "@/stores"
import { useDashboardFilters, computeDateRange } from "@/stores/dashboard-filters"
import { useDashboardLayout } from "@/stores/dashboard-layout"
import { calculateTradeStats, calculateR } from "@/lib/trade-stats"
import { convertPnL } from "@/lib/fx-converter"
import { createClient } from "@/lib/supabase/client"
import type { Trade } from "@/types/trade"
import {
  FilterBar,
  KpiRow,
  CalendarHeatmap,
  EquityChart,
  BreakdownBars,
  SessionHeatmap,
  Histogram,
  ScatterHoldVsR,
  AccountMeters,
  ExpectancyLadder,
  StreakWidget,
  InsightsBar,
  HoldTimeBands,
  TradeTypeWidget,
  PnLDurationBoxPlot,
  PnLDurationScatter,
  EmotionalStateWidget,
} from "@/components/dashboard"
import { SortableWidget } from "@/components/dashboard/SortableWidget"

interface PlaybookForWidget {
  id: string
  name: string
  trade_type?: 'continuation' | 'reversal' | null
  direction?: 'buy' | 'sell' | 'both' | null
}

export const WIDGET_DEFS: { id: string; label: string }[] = [
  { id: 'kpi',              label: 'KPI Row' },
  { id: 'edge',             label: 'Edge Analysis' },
  { id: 'calendar-equity',  label: 'Calendar & Equity' },
  { id: 'breakdowns',       label: 'Performance Breakdowns' },
  { id: 'session',          label: 'Session Heatmap' },
  { id: 'emotional',        label: 'Emotional State' },
  { id: 'distribution',     label: 'Distribution Charts' },
  { id: 'pnl-duration',     label: 'PnL by Duration' },
  { id: 'accounts',         label: 'Account Overview' },
]

export default function Home() {
  const trades = useTradeStore((state) => state.trades)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  const [playbooks, setPlaybooks] = React.useState<PlaybookForWidget[]>([])

  const filters = useDashboardFilters(useShallow((state) => state.filters))
  const { dateRange: dateRangePreset, customStartDate, customEndDate } = filters

  const dateRange = React.useMemo(
    () => computeDateRange(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate]
  )

  // Layout store
  const { widgetOrder, hiddenWidgets, isEditMode, setWidgetOrder, toggleWidget, setEditMode, resetLayout } =
    useDashboardLayout()

  React.useEffect(() => {
    void fetchTrades()
    void fetchAccounts()

    const fetchPlaybooks = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('playbooks')
        .select('id, name, trade_type, direction')
        .eq('active', true)
      if (data) setPlaybooks(data as PlaybookForWidget[])
    }
    void fetchPlaybooks()
  }, [fetchTrades, fetchAccounts])

  const filteredTrades = React.useMemo(() => {
    let result = trades

    const { start, end } = dateRange
    result = result.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date)
      return tradeDate >= start && tradeDate <= end
    })

    if (filters.accountId !== 'all') {
      result = result.filter(t => t.account_id === filters.accountId)
    }

    if (filters.symbols.length > 0) {
      result = result.filter(t => filters.symbols.includes(t.symbol))
    }

    if (filters.strategies.length > 0) {
      result = result.filter(t => t.strategy && filters.strategies.includes(t.strategy))
    }

    if (filters.session !== 'all') {
      result = result.filter(trade => {
        const hour = new Date(trade.exit_date || trade.entry_date).getHours()
        if (filters.session === 'asia') return hour >= 0 && hour < 8
        if (filters.session === 'london') return hour >= 8 && hour < 16
        if (filters.session === 'ny') return hour >= 16
        return true
      })
    }

    if (filters.excludeOutliers && result.length > 0) {
      const pnls = result.map(t => t.pnl)
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length
      const std = Math.sqrt(pnls.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnls.length)
      result = result.filter(t => Math.abs(t.pnl - mean) <= 3 * std)
    }

    return result
  }, [trades, filters, dateRange])

  const normalizedTrades = React.useMemo(() => {
    return filteredTrades.map(trade => {
      const tradeAccount = accounts.find(a => a.id === trade.account_id)
      const tradeCurrency = tradeAccount?.currency || 'USD'

      let pnlDisplay: number
      let displayUnit: string

      if (filters.units === 'r') {
        pnlDisplay = calculateR(trade) || 0
        displayUnit = 'R'
      } else {
        if (filters.accountId === 'all') {
          pnlDisplay = convertPnL(trade.pnl, tradeCurrency, filters.baseCurrency, trade.exit_date || trade.entry_date)
          displayUnit = filters.baseCurrency
        } else {
          pnlDisplay = trade.pnl
          displayUnit = tradeCurrency
        }
      }

      return { ...trade, pnlDisplay, displayUnit, originalCurrency: tradeCurrency }
    })
  }, [filteredTrades, filters.units, filters.accountId, filters.baseCurrency, accounts])

  const stats = React.useMemo(() => {
    const tradesForStats = normalizedTrades.map(t => ({ ...t, pnl: t.pnlDisplay }))
    return calculateTradeStats(tradesForStats)
  }, [normalizedTrades])

  const displayCurrency = React.useMemo(() => {
    if (filters.units === 'r') return 'R'
    if (filters.accountId !== 'all') {
      const account = accounts.find(a => a.id === filters.accountId)
      return account?.currency || 'USD'
    }
    return filters.baseCurrency
  }, [filters.accountId, filters.units, filters.baseCurrency, accounts])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id as string)
      const newIndex = widgetOrder.indexOf(over.id as string)
      setWidgetOrder(arrayMove(widgetOrder, oldIndex, newIndex))
    }
  }

  // Widget render functions
  function renderWidget(id: string): React.ReactNode {
    switch (id) {
      case 'kpi':
        return (
          <KpiRow
            trades={filteredTrades}
            netPnL={stats.net_profit ?? 0}
            winRate={stats.win_rate ?? 0}
            profitFactor={stats.profit_factor ?? 0}
            avgWin={stats.avg_win ?? 0}
            avgLoss={stats.avg_loss ?? 0}
            avgHoldMins={stats.avg_trade_duration ? stats.avg_trade_duration * 60 : undefined}
            currency={displayCurrency}
            units={filters.units}
          />
        )

      case 'edge':
        return (
          <div className="grid gap-4 lg:grid-cols-4">
            <ExpectancyLadder trades={filteredTrades} />
            <StreakWidget
              trades={normalizedTrades as Trade[]}
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
            <TradeTypeWidget trades={filteredTrades} playbooks={playbooks} />
            <HoldTimeBands trades={filteredTrades} />
          </div>
        )

      case 'calendar-equity':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <CalendarHeatmap trades={normalizedTrades as Trade[]} currency={displayCurrency} />
            <EquityChart
              trades={normalizedTrades as Trade[]}
              units={filters.units}
              currency={displayCurrency}
            />
          </div>
        )

      case 'breakdowns':
        return (
          <div className="grid gap-4 lg:grid-cols-3">
            <BreakdownBars trades={filteredTrades} type="dow" units={filters.units} currency={displayCurrency} />
            <BreakdownBars trades={filteredTrades} type="symbol" units={filters.units} currency={displayCurrency} />
            <BreakdownBars trades={filteredTrades} type="playbook" units={filters.units} currency={displayCurrency} playbooks={playbooks} />
          </div>
        )

      case 'session':
        return <SessionHeatmap trades={filteredTrades} />

      case 'emotional':
        return <EmotionalStateWidget trades={filteredTrades} />

      case 'distribution':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Histogram trades={filteredTrades} />
            <ScatterHoldVsR trades={filteredTrades} />
          </div>
        )

      case 'pnl-duration':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <PnLDurationBoxPlot trades={filteredTrades} currency={displayCurrency} />
            <PnLDurationScatter trades={filteredTrades} currency={displayCurrency} />
          </div>
        )

      case 'accounts':
        return (
          <div>
            {filters.accountId !== 'all' && accounts.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-3">
                {accounts
                  .filter(a => a.id === filters.accountId)
                  .map(account => {
                    const accountTrades = trades.filter(t => t.account_id === account.id)
                    const accountStats = calculateTradeStats(accountTrades)
                    return (
                      <AccountMeters key={account.id} account={account} stats={accountStats} currency={account.currency} />
                    )
                  })}
              </div>
            )}
            {filters.accountId === 'all' && accounts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-foreground">Account Overview</h2>
                <div className="grid gap-4 lg:grid-cols-3">
                  {accounts.map(account => {
                    const accountTrades = trades.filter(t => t.account_id === account.id)
                    const accountStats = calculateTradeStats(accountTrades)
                    return (
                      <AccountMeters key={account.id} account={account} stats={accountStats} currency={account.currency} />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#080808] dark:to-[#111111]">
      <FilterBar />
      <InsightsBar trades={filteredTrades} />

      <div className="p-8 space-y-6">
        {/* Currency Display Badge */}
        {filters.accountId === 'all' && filters.units === 'currency' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-lg">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              All Accounts • Display in: {filters.baseCurrency}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              (P&L converted using FX rates)
            </span>
          </div>
        )}

        {/* Layout controls */}
        <div className="flex items-center justify-end gap-2">
          {isEditMode && (
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Layout
            </button>
          )}
          <button
            onClick={() => setEditMode(!isEditMode)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              isEditMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
            ].join(' ')}
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Done
              </>
            ) : (
              <>
                <LayoutDashboard className="w-3.5 h-3.5" />
                Edit Layout
              </>
            )}
          </button>
        </div>

        {/* Modular widget grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {widgetOrder.map(id => {
                const def = WIDGET_DEFS.find(w => w.id === id)
                if (!def) return null
                const isHidden = hiddenWidgets.includes(id)
                return (
                  <SortableWidget
                    key={id}
                    id={id}
                    label={def.label}
                    isEditMode={isEditMode}
                    isHidden={isHidden}
                    onToggle={() => toggleWidget(id)}
                  >
                    {renderWidget(id)}
                  </SortableWidget>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
