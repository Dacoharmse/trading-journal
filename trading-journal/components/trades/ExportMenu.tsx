'use client'

import React from 'react'
import { Download, X, FileJson, FileSpreadsheet } from 'lucide-react'
import type { Trade } from '@/types/supabase'
import { calculateR, formatPnL, formatR, calculateHoldTime, formatHoldTime } from '@/lib/trades-selectors'

interface ExportMenuProps {
  open: boolean
  onClose: () => void
  trades: Trade[]
  visibleColumns: Set<string>
  units: 'currency' | 'r'
  displayCurrency?: string
}

export function ExportMenu({ open, onClose, trades, visibleColumns, units, displayCurrency }: ExportMenuProps) {
  const handleExportCSV = () => {
    const headers = getHeaders()
    const rows = trades.map((trade) => getRow(trade))

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    downloadFile(csv, 'trades.csv', 'text/csv')
    onClose()
  }

  const handleExportJSON = () => {
    const data = trades.map((trade) => {
      const row: Record<string, any> = {}
      const headers = getHeaders()
      const values = getRow(trade)

      headers.forEach((header, index) => {
        row[header] = values[index]
      })

      return row
    })

    const json = JSON.stringify(data, null, 2)
    downloadFile(json, 'trades.json', 'application/json')
    onClose()
  }

  const getHeaders = (): string[] => {
    const headers: string[] = []

    if (visibleColumns.has('date')) headers.push('Date')
    if (visibleColumns.has('account')) headers.push('Account')
    if (visibleColumns.has('symbol')) headers.push('Symbol')
    if (visibleColumns.has('direction')) headers.push('Direction')
    if (visibleColumns.has('entry_price')) headers.push('Entry Price')
    if (visibleColumns.has('stop_price')) headers.push('Stop Loss')
    if (visibleColumns.has('exit_price')) headers.push('Exit Price')
    if (visibleColumns.has('size')) headers.push('Size')
    if (visibleColumns.has('pnl_currency')) {
      headers.push(units === 'r' ? 'Net R' : `P&L (${displayCurrency || 'Currency'})`)
    }
    if (visibleColumns.has('r_multiple')) headers.push('R Multiple')
    if (visibleColumns.has('strategy')) headers.push('Strategy')
    if (visibleColumns.has('confluences')) headers.push('Confluences')
    if (visibleColumns.has('session')) headers.push('Session')
    if (visibleColumns.has('hold_time')) headers.push('Hold Time')
    if (visibleColumns.has('mae_r')) headers.push('MAE (R)')
    if (visibleColumns.has('mfe_r')) headers.push('MFE (R)')
    if (visibleColumns.has('entry_time')) headers.push('Entry Time')
    if (visibleColumns.has('exit_time')) headers.push('Exit Time')
    if (visibleColumns.has('fees')) headers.push('Fees')
    if (visibleColumns.has('tags')) headers.push('Tags')
    if (visibleColumns.has('rule_breaks')) headers.push('Rule Breaks')
    if (visibleColumns.has('notes')) headers.push('Notes')

    // Always include original currency and R in hidden columns
    headers.push('Original Currency', 'Original P&L', 'Original R')

    return headers
  }

  const getRow = (trade: Trade): string[] => {
    const row: string[] = []

    if (visibleColumns.has('date')) row.push(trade.exit_date || trade.entry_date || 'N/A')
    if (visibleColumns.has('account')) row.push(trade.account_id || 'N/A')
    if (visibleColumns.has('symbol')) row.push(trade.symbol || 'N/A')
    if (visibleColumns.has('direction')) row.push(trade.direction || 'N/A')
    if (visibleColumns.has('entry_price')) row.push(trade.entry_price?.toString() || 'N/A')
    if (visibleColumns.has('stop_price')) row.push(trade.stop_price?.toString() || 'N/A')
    if (visibleColumns.has('exit_price')) row.push(trade.exit_price?.toString() || 'N/A')
    if (visibleColumns.has('size')) row.push(trade.size?.toString() || 'N/A')
    if (visibleColumns.has('pnl_currency')) {
      if (units === 'r') {
        const r = calculateR(trade)
        row.push(r !== null ? r.toFixed(2) : 'N/A')
      } else {
        row.push(trade.pnl?.toString() || 'N/A')
      }
    }
    if (visibleColumns.has('r_multiple')) {
      const r = calculateR(trade)
      row.push(r !== null ? r.toFixed(2) : 'N/A')
    }
    if (visibleColumns.has('strategy')) row.push(trade.strategy || 'N/A')
    if (visibleColumns.has('confluences')) row.push(trade.confluences || 'N/A')
    if (visibleColumns.has('session')) row.push(trade.session || 'N/A')
    if (visibleColumns.has('hold_time')) {
      const holdTime = calculateHoldTime(trade)
      row.push(holdTime !== null ? formatHoldTime(holdTime) : 'N/A')
    }
    if (visibleColumns.has('mae_r')) row.push(trade.mae_r?.toString() || 'N/A')
    if (visibleColumns.has('mfe_r')) row.push(trade.mfe_r?.toString() || 'N/A')
    if (visibleColumns.has('entry_time')) row.push(trade.entry_time || 'N/A')
    if (visibleColumns.has('exit_time')) row.push(trade.exit_time || 'N/A')
    if (visibleColumns.has('fees')) {
      const fees = (trade.commission || 0) + (trade.swap || 0) + (trade.slippage || 0)
      row.push(fees.toString())
    }
    if (visibleColumns.has('tags')) row.push(trade.tags || 'N/A')
    if (visibleColumns.has('rule_breaks')) row.push(trade.rule_breaks || 'N/A')
    if (visibleColumns.has('notes')) row.push(trade.notes || 'N/A')

    // Always include original currency and R
    row.push(trade.currency || 'N/A')
    row.push(trade.pnl?.toString() || 'N/A')
    const r = calculateR(trade)
    row.push(r !== null ? r.toFixed(2) : 'N/A')

    return row
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Export Trades</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Export {trades.length} trade{trades.length !== 1 ? 's' : ''} in your preferred format.
          </p>

          <button
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white">CSV</div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Compatible with Excel, Google Sheets
              </div>
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <FileJson className="w-5 h-5 text-neutral-600" />
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white">JSON</div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                For developers and data analysis
              </div>
            </div>
          </button>

          <div className="text-xs text-neutral-500 dark:text-neutral-500 space-y-1">
            <p>Export includes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All visible columns as currently configured</li>
              <li>Values converted to {units === 'r' ? 'R multiples' : displayCurrency || 'currency'}</li>
              <li>Original currency and R values (hidden columns)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
