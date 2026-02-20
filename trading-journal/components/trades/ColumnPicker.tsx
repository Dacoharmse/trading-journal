'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useTradesFilters } from '@/stores/trades-filters'

interface ColumnPickerProps {
  open: boolean
  onClose: () => void
}

const AVAILABLE_COLUMNS = [
  // Default visible — matches user's desired column set
  { id: 'date', label: 'Date', default: true },
  { id: 'account', label: 'Account', default: true },
  { id: 'symbol', label: 'Symbol', default: true },
  { id: 'direction', label: 'Direction', default: true },
  { id: 'entry_time', label: 'Entry Time', default: true },
  { id: 'size', label: 'Lots', default: true },
  { id: 'stop_pips', label: 'Stops (pips)', default: true },
  { id: 'target_pips', label: 'TP (pips)', default: true },
  { id: 'exit_time', label: 'Exit Time', default: true },
  { id: 'pnl_currency', label: 'P&L', default: true },
  { id: 'r_multiple', label: 'R', default: true },
  { id: 'playbook', label: 'Playbook', default: true },
  { id: 'setup_grade', label: 'Setup Grade', default: true },
  { id: 'setup_score', label: 'Setup Score', default: true },
  { id: 'session', label: 'Session', default: true },
  { id: 'session_hour', label: 'Session Hour', default: true },
  { id: 'hold_time', label: 'Hold Time', default: true },
  { id: 'outcome', label: 'Outcome', default: true },
  // Optional / hidden by default
  { id: 'planned_stop_pips', label: 'Planned Stop (pips)', default: false },
  { id: 'planned_target_pips', label: 'Planned TP (pips)', default: false },
  { id: 'tags', label: 'Tags', default: false },
  { id: 'rule_breaks', label: 'Rule Breaks', default: false },
  { id: 'notes', label: 'Notes', default: false },
  { id: 'attachments', label: 'Attachments', default: false },
]

export function ColumnPicker({ open, onClose }: ColumnPickerProps) {
  const visibleColumnsArray = useTradesFilters((state) => state.filters.visibleColumns)
  const { toggleColumn, setVisibleColumns } = useTradesFilters()

  const visibleColumns = React.useMemo(() => new Set(visibleColumnsArray), [visibleColumnsArray])

  const handleReset = () => {
    const defaultColumns = AVAILABLE_COLUMNS.filter((col) => col.default).map((col) => col.id)
    setVisibleColumns(defaultColumns)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Customize Columns</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column List */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {AVAILABLE_COLUMNS.map((column) => (
              <label
                key={column.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.has(column.id)}
                  onChange={() => toggleColumn(column.id)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{column.label}</span>
                {column.default && (
                  <span className="ml-auto text-xs text-neutral-400">(default)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
