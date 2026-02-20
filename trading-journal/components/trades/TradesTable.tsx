'use client'

import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { Trade, Account, Playbook } from '@/types/supabase'
import { TradeRow } from './TradeRow'
import { useTradesFilters } from '@/stores/trades-filters'
import {
  calculateProfitFactor,
  calculateExpectancy,
  calculateWinRate,
  calculateTotalPnL,
  calculateTotalR,
  formatPnL,
  formatR,
} from '@/lib/trades-selectors'

type PlaybookSummary = Pick<Playbook, 'id' | 'name' | 'category'>

interface TradesTableProps {
  trades: Trade[]
  accounts: Account[]
  playbooks: PlaybookSummary[]
  visibleColumns: Set<string>
  units: 'currency' | 'r'
  displayCurrency?: string
  onTradeClick: (trade: Trade) => void
}

const COLUMN_HEADERS: Record<string, string> = {
  date: 'Date',
  account: 'Account',
  symbol: 'Symbol',
  direction: 'Direction',
  entry_time: 'Entry Time',
  size: 'Lots',
  stop_pips: 'Stop (pips)',
  target_pips: 'TP (pips)',
  exit_time: 'Exit Time',
  pnl_currency: 'P&L',
  r_multiple: 'R',
  playbook: 'Playbook',
  setup_grade: 'Setup Grade',
  setup_score: 'Setup Score',
  session: 'Session',
  session_hour: 'Session Hour',
  hold_time: 'Hold Time',
  outcome: 'Outcome',
  // Optional columns
  entry_price: 'Entry Price',
  stop_price: 'Stop Loss',
  exit_price: 'Exit Price',
  strategy: 'Strategy',
  confluences: 'Confluences',
  mae_r: 'MAE (R)',
  mfe_r: 'MFE (R)',
  fees: 'Fees',
  tags: 'Tags',
  rule_breaks: 'Rule Breaks',
  notes: 'Notes',
  attachments: 'Files',
}

export function TradesTable({
  trades,
  accounts,
  playbooks,
  visibleColumns,
  units,
  displayCurrency,
  onTradeClick,
}: TradesTableProps) {
  const { filters, setSortColumn, toggleTradeSelection, selectAllTrades, clearSelection } = useTradesFilters()
  const { sortColumn, sortDirection, selectedTradeIds } = filters

  const selectedTradeIdsSet = React.useMemo(() => new Set(selectedTradeIds), [selectedTradeIds])

  const playbookLookup = React.useMemo(() => {
    const map = new Map<string, PlaybookSummary>()
    playbooks.forEach((pb) => {
      map.set(pb.id, pb)
    })
    return map
  }, [playbooks])

  const allSelected = trades.length > 0 && trades.every((t) => selectedTradeIdsSet.has(t.id))
  const someSelected = trades.some((t) => selectedTradeIdsSet.has(t.id)) && !allSelected

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection()
    } else {
      selectAllTrades(trades.map((t) => t.id))
    }
  }

  const handleSort = (column: string) => {
    setSortColumn(column)
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  // Calculate footer metrics
  const profitFactor = calculateProfitFactor(trades)
  const expectancy = calculateExpectancy(trades)
  const winRate = calculateWinRate(trades)
  const totalPnL = calculateTotalPnL(trades)
  const totalR = calculateTotalR(trades)

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-neutral-400 dark:text-neutral-600 mb-4">
          <svg
            className="w-24 h-24 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          No trades found
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Start by adding your first trade or adjust your filters
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              {/* Checkbox column */}
              <th className="px-4 py-3 text-left sticky left-0 bg-neutral-50 dark:bg-neutral-900 z-30">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                />
              </th>

              {/* Dynamic columns */}
              {Array.from(visibleColumns).map((column) => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {COLUMN_HEADERS[column] || column}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white dark:bg-neutral-950">
            {trades.map((trade) => {
              const account = accounts.find((a) => a.id === trade.account_id)
              const playbookInfo = trade.playbook_id
                ? playbookLookup.get(trade.playbook_id)
                : undefined
              return (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  account={account}
                  playbookName={playbookInfo?.name ?? null}
                  playbookCategory={playbookInfo?.category ?? null}
                  visibleColumns={visibleColumns}
                  units={units}
                  displayCurrency={displayCurrency}
                  isSelected={selectedTradeIdsSet.has(trade.id)}
                  onSelect={toggleTradeSelection}
                  onClick={onTradeClick}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with summary stats */}
      <div className="sticky bottom-0 z-10 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <span className="text-neutral-600 dark:text-neutral-400">
              <strong className="text-neutral-900 dark:text-white">{trades.length}</strong> trades
            </span>

            {units === 'currency' && (
              <span className="text-neutral-600 dark:text-neutral-400">
                Total: <strong className={totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {formatPnL(totalPnL, displayCurrency || 'USD')}
                </strong>
              </span>
            )}

            <span className="text-neutral-600 dark:text-neutral-400">
              Total R: <strong className={totalR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {formatR(totalR)}
              </strong>
            </span>

            <span className="text-neutral-600 dark:text-neutral-400">
              Win Rate: <strong className="text-neutral-900 dark:text-white">
                {winRate !== null ? `${winRate.toFixed(1)}%` : 'N/A'}
              </strong>
            </span>

            <span className="text-neutral-600 dark:text-neutral-400">
              PF (R): <strong className={
                profitFactor !== null && profitFactor >= 1.5
                  ? 'text-green-600 dark:text-green-400'
                  : profitFactor !== null && profitFactor >= 1
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              }>
                {profitFactor !== null && profitFactor !== Infinity
                  ? profitFactor.toFixed(2)
                  : 'N/A'}
              </strong>
            </span>

            <span className="text-neutral-600 dark:text-neutral-400">
              Expectancy (R): <strong className={
                expectancy !== null && expectancy > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }>
                {expectancy !== null ? formatR(expectancy) : 'N/A'}
              </strong>
            </span>
          </div>

          {selectedTradeIds.length > 0 && (
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
              {selectedTradeIds.length} selected
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
