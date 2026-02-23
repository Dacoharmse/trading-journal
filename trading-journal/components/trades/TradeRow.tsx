'use client'

import React from 'react'
import { Paperclip, Edit3, Trash2 } from 'lucide-react'
import type { Trade, Account } from '@/types/supabase'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  calculateR,
  formatPnL,
  formatR,
  calculateHoldTime,
  formatHoldTime,
  getDirectionIcon,
  getPnLColorClass,
  getDirectionColorClass,
} from '@/lib/trades-selectors'
import { getGradeColor, formatScore } from '@/lib/playbook-scoring'
import { cn } from '@/lib/utils'

interface TradeRowProps {
  trade: Trade
  account: Account | undefined
  playbookName: string | null
  playbookCategory: string | null
  visibleColumns: Set<string>
  units: 'currency' | 'r'
  displayCurrency?: string
  isSelected: boolean
  onSelect: (id: string) => void
  onClick: (trade: Trade) => void
  onEdit: (trade: Trade) => void
  onDelete: (trade: Trade) => void
}

export function TradeRow({
  trade,
  account,
  playbookName,
  playbookCategory,
  visibleColumns,
  units,
  displayCurrency,
  isSelected,
  onSelect,
  onClick,
  onEdit,
  onDelete,
}: TradeRowProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const r = calculateR(trade)
  const holdTime = calculateHoldTime(trade)

  const pnlValue = units === 'r' ? r : trade.pnl
  const pnlDisplay = units === 'r' ? formatR(r) : formatPnL(trade.pnl, displayCurrency || account?.currency || 'USD')

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking checkbox
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return
    }
    onClick(trade)
  }

  return (
    <>
    <tr
      onClick={handleRowClick}
      className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-neutral-50 dark:bg-neutral-950/20' : ''
      }`}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 sticky left-0 bg-white dark:bg-neutral-950 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(trade.id)}
          className="w-4 h-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
        />
      </td>

      {/* Date */}
      {visibleColumns.has('date') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white whitespace-nowrap">
          {(() => {
            const raw = (trade.exit_date || trade.entry_date || '').split('T')[0]
            if (!raw) return 'N/A'
            const [y, m, d] = raw.split('-').map(Number)
            if (!y || !m || !d) return raw
            return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          })()}
        </td>
      )}

      {/* Account */}
      {visibleColumns.has('account') && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-900 dark:text-white">{account?.name || 'Unknown'}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {account?.currency || trade.currency}
            </span>
          </div>
        </td>
      )}

      {/* Symbol */}
      {visibleColumns.has('symbol') && (
        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-white">
          {trade.symbol}
        </td>
      )}

      {/* Direction */}
      {visibleColumns.has('direction') && (
        <td className="px-4 py-3">
          <span className={`text-sm font-medium ${getDirectionColorClass(trade)}`}>
            {getDirectionIcon(trade.direction)} {trade.direction}
          </span>
        </td>
      )}

      {/* Entry Time */}
      {visibleColumns.has('entry_time') && (
        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
          {trade.open_time || trade.entry_time || '—'}
        </td>
      )}

      {/* Lots */}
      {visibleColumns.has('size') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {(trade.size ?? trade.quantity)?.toFixed(2) || '—'}
        </td>
      )}

      {/* Stop (pips) — shows actual stop, falls back to planned */}
      {visibleColumns.has('stop_pips') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {(trade.actual_stop_pips ?? trade.stop_pips) != null
            ? (trade.actual_stop_pips ?? trade.stop_pips)!.toFixed(1)
            : '—'}
        </td>
      )}

      {/* TP (pips) — shows actual TP, falls back to planned */}
      {visibleColumns.has('target_pips') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {(trade.actual_target_pips ?? trade.target_pips) != null
            ? (trade.actual_target_pips ?? trade.target_pips)!.toFixed(1)
            : '—'}
        </td>
      )}

      {/* Planned Stop (pips) — optional column */}
      {visibleColumns.has('planned_stop_pips') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.stop_pips != null ? trade.stop_pips.toFixed(1) : '—'}
        </td>
      )}

      {/* Planned TP (pips) — optional column */}
      {visibleColumns.has('planned_target_pips') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.target_pips != null ? trade.target_pips.toFixed(1) : '—'}
        </td>
      )}

      {/* MAE */}
      {visibleColumns.has('mae_pips') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.mae_pips != null ? trade.mae_pips.toFixed(1) : '—'}
        </td>
      )}

      {/* MFE */}
      {visibleColumns.has('mfe_pips') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.mfe_pips != null ? trade.mfe_pips.toFixed(1) : '—'}
        </td>
      )}

      {/* Exit Time */}
      {visibleColumns.has('exit_time') && (
        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
          {trade.close_time || trade.exit_time || '—'}
        </td>
      )}

      {/* P&L */}
      {visibleColumns.has('pnl_currency') && (
        <td className="px-4 py-3">
          <span className={`text-sm font-medium ${getPnLColorClass(pnlValue || 0)}`}>
            {pnlDisplay}
          </span>
        </td>
      )}

      {/* R Multiple */}
      {visibleColumns.has('r_multiple') && (
        <td className="px-4 py-3">
          <span className={`text-sm font-medium ${getPnLColorClass(r || 0)}`}>
            {formatR(r)}
          </span>
        </td>
      )}

      {/* Playbook */}
      {visibleColumns.has('playbook') && (
        <td className="px-4 py-3">
          {playbookName ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {playbookName}
              </span>
              {playbookCategory && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {playbookCategory}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">—</span>
          )}
        </td>
      )}

      {/* Setup Grade */}
      {visibleColumns.has('setup_grade') && (
        <td className="px-4 py-3">
          {trade.setup_grade ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                getGradeColor(trade.setup_grade)
              )}
            >
              {trade.setup_grade}
            </span>
          ) : (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">—</span>
          )}
        </td>
      )}

      {/* Setup Score */}
      {visibleColumns.has('setup_score') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {typeof trade.setup_score === 'number' ? formatScore(trade.setup_score) : '—'}
        </td>
      )}

      {/* Session */}
      {visibleColumns.has('session') && (
        <td className="px-4 py-3">
          {trade.session && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 capitalize">
              {trade.session}
            </span>
          )}
        </td>
      )}

      {/* Session Hour */}
      {visibleColumns.has('session_hour') && (
        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
          {trade.session_hour || '—'}
        </td>
      )}

      {/* Hold Time */}
      {visibleColumns.has('hold_time') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white whitespace-nowrap">
          {formatHoldTime(holdTime)}
        </td>
      )}

      {/* Outcome */}
      {visibleColumns.has('outcome') && (
        <td className="px-4 py-3">
          {trade.outcome ? (
            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
              trade.outcome === 'win'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : trade.outcome === 'loss'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}>
              {trade.outcome}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">—</span>
          )}
        </td>
      )}

      {/* Tags */}
      {visibleColumns.has('tags') && (
        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
          {trade.tags || 'N/A'}
        </td>
      )}

      {/* Rule Breaks */}
      {visibleColumns.has('rule_breaks') && (
        <td className="px-4 py-3">
          {trade.rule_breaks && (
            <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              {trade.rule_breaks}
            </span>
          )}
        </td>
      )}

      {/* Notes */}
      {visibleColumns.has('notes') && (
        <td className="px-4 py-3 max-w-xs">
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            {trade.notes || 'N/A'}
          </div>
        </td>
      )}

      {/* Attachments */}
      {visibleColumns.has('attachments') && (
        <td className="px-4 py-3">
          {trade.attachments && (
            <Paperclip className="w-4 h-4 text-neutral-400" />
          )}
        </td>
      )}

      {/* Actions */}
      <td className="px-4 py-3 sticky right-0 bg-white dark:bg-neutral-950 z-10">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(trade) }}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit trade"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteOpen(true)
            }}
            className="p-1.5 rounded text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete trade"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>

    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete trade?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the trade for <strong>{trade.symbol}</strong>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(trade)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
