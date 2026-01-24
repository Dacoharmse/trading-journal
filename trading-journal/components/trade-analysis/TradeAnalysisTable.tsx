'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import type { Trade } from '@/types/supabase'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface TradeAnalysisTableProps {
  trades: Trade[]
}

export function TradeAnalysisTable({ trades }: TradeAnalysisTableProps) {
  const [sortField, setSortField] = React.useState<'date' | 'symbol' | 'pnl' | 'r'>('date')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  const sortedTrades = React.useMemo(() => {
    return [...trades].sort((a, b) => {
      let aVal, bVal

      switch (sortField) {
        case 'date':
          aVal = new Date(a.closed_at || a.exit_date || '').getTime()
          bVal = new Date(b.closed_at || b.exit_date || '').getTime()
          break
        case 'symbol':
          aVal = a.symbol
          bVal = b.symbol
          break
        case 'pnl':
          aVal = a.pnl
          bVal = b.pnl
          break
        case 'r':
          aVal = a.r_multiple || 0
          bVal = b.r_multiple || 0
          break
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
  }, [trades, sortField, sortDirection])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortHeader = ({ field, label }: { field: typeof sortField; label: string }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortField === field && (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        )}
      </div>
    </th>
  )

  if (trades.length === 0) {
    return (
      <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg p-8">
        <div className="text-center text-neutral-500 dark:text-neutral-400">
          No trades match your filters
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Filtered Trades ({trades.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <SortHeader field="date" label="Date" />
                <SortHeader field="symbol" label="Symbol" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Hour
                </th>
                <SortHeader field="pnl" label="P&L" />
                <SortHeader field="r" label="R Multiple" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Strategy
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortedTrades.map((trade) => {
                const date = new Date(trade.closed_at || trade.exit_date || '')
                const isWin = trade.pnl > 0

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {trade.symbol}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                        trade.direction === 'long'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {trade.direction === 'long' ? '▲ Long' : '▼ Short'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                      {trade.session || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                      {trade.session_hour || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${
                        isWin ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${
                        (trade.r_multiple || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.r_multiple !== null
                          ? `${trade.r_multiple >= 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R`
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                      {trade.strategy || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {trade.setup_grade && (
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded ${
                          trade.setup_grade === 'A+' || trade.setup_grade === 'A'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : trade.setup_grade === 'B'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : trade.setup_grade === 'C'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {trade.setup_grade}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
