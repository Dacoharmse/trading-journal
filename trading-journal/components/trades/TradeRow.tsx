'use client'

import React from 'react'
import { Paperclip } from 'lucide-react'
import type { Trade, Account } from '@/types/supabase'
import {
  calculateR,
  formatPnL,
  formatR,
  calculateHoldTime,
  formatHoldTime,
  getDirectionIcon,
  getPnLColorClass,
  getDirectionColorClass,
  parseConfluences,
  formatChips,
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
}: TradeRowProps) {
  const r = calculateR(trade)
  const holdTime = calculateHoldTime(trade)
  const confluences = parseConfluences(trade.confluences)
  const { visible: visibleConfluences, overflow: overflowConfluences } = formatChips(confluences, 2)

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
          {trade.exit_date || trade.entry_date || 'N/A'}
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

      {/* Entry Price */}
      {visibleColumns.has('entry_price') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.entry_price?.toFixed(2) || 'N/A'}
        </td>
      )}

      {/* Stop Loss */}
      {visibleColumns.has('stop_price') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.stop_price?.toFixed(2) || 'N/A'}
        </td>
      )}

      {/* Exit Price */}
      {visibleColumns.has('exit_price') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {trade.exit_price?.toFixed(2) || 'N/A'}
        </td>
      )}

      {/* Size */}
      {visibleColumns.has('size') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {(trade.quantity ?? trade.size)?.toFixed(2) || 'N/A'}
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

      {/* Strategy */}
      {visibleColumns.has('strategy') && (
        <td className="px-4 py-3">
          {trade.strategy && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
              {trade.strategy}
            </span>
          )}
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

      {/* Confluences */}
      {visibleColumns.has('confluences') && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 flex-wrap">
            {visibleConfluences.map((conf, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900/30 text-neutral-700 dark:text-neutral-400"
              >
                {conf}
              </span>
            ))}
            {overflowConfluences > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                +{overflowConfluences}
              </span>
            )}
          </div>
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

      {/* Hold Time */}
      {visibleColumns.has('hold_time') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white whitespace-nowrap">
          {formatHoldTime(holdTime)}
        </td>
      )}

      {/* MAE (R) */}
      {visibleColumns.has('mae_r') && (
        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {trade.mae_r !== null && trade.mae_r !== undefined ? formatR(trade.mae_r) : 'N/A'}
        </td>
      )}

      {/* MFE (R) */}
      {visibleColumns.has('mfe_r') && (
        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {trade.mfe_r !== null && trade.mfe_r !== undefined ? formatR(trade.mfe_r) : 'N/A'}
        </td>
      )}

      {/* Entry Time */}
      {visibleColumns.has('entry_time') && (
        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
          {trade.entry_time || 'N/A'}
        </td>
      )}

      {/* Exit Time */}
      {visibleColumns.has('exit_time') && (
        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
          {trade.exit_time || 'N/A'}
        </td>
      )}

      {/* Fees */}
      {visibleColumns.has('fees') && (
        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">
          {((trade.commission || 0) + (trade.swap || 0) + (trade.slippage || 0)).toFixed(2)}
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
    </tr>
  )
}
