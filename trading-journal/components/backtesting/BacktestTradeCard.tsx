'use client'

import * as React from 'react'
import type { Backtest } from '@/lib/backtest-selectors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, Calendar, Edit2, Trash2, X } from 'lucide-react'

interface BacktestTradeCardProps {
  backtest: Backtest
  onEdit?: (backtest: Backtest) => void
  onDelete?: (backtest: Backtest) => void
}

export function BacktestTradeCard({ backtest, onEdit, onDelete }: BacktestTradeCardProps) {
  const [imageZoomed, setImageZoomed] = React.useState(false)
  const isWin = backtest.result_r > 0
  const date = new Date(backtest.entry_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
    <div className="overflow-hidden rounded-lg border border-neutral-200/70 bg-white/80 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      {/* Header */}
      <div className="border-b border-neutral-200/70 bg-neutral-50/50 p-3 dark:border-neutral-800/60 dark:bg-neutral-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                backtest.direction === 'long'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              )}
            >
              {backtest.direction === 'long' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                  {backtest.symbol}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    isWin
                      ? 'border-emerald-300/60 bg-emerald-100/60 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'border-red-300/60 bg-red-100/60 text-red-700 dark:border-red-700/60 dark:bg-red-900/40 dark:text-red-300'
                  )}
                >
                  {backtest.outcome || (isWin ? 'Win' : 'Loss')}
                </Badge>
                {backtest.setup_grade && (
                  <Badge variant="outline" className="text-xs">
                    Grade: {backtest.setup_grade}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {date}
                </span>
                {backtest.session && <span>{backtest.session}</span>}
              </div>
            </div>
          </div>

          {/* Result R and Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div
                className={cn(
                  'text-2xl font-bold',
                  isWin
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-red-700 dark:text-red-300'
                )}
              >
                {isWin ? '+' : ''}
                {backtest.result_r.toFixed(2)}R
              </div>
              {backtest.setup_score != null && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {(backtest.setup_score * 100).toFixed(0)}% setup
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(backtest)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(backtest)}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Image */}
      {backtest.chart_image && (
        <div className="border-b border-neutral-200/70 dark:border-neutral-800/60">
          <img
            src={backtest.chart_image}
            alt={`${backtest.symbol} chart`}
            className="h-auto w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
            style={{ maxHeight: '400px' }}
            onClick={() => setImageZoomed(true)}
            title="Click to zoom"
          />
        </div>
      )}

      {/* Metrics Grid */}
      {(backtest.sl_pips != null || backtest.tp_pips != null || backtest.rr != null) && (
        <div className="border-b border-neutral-200/70 p-3 dark:border-neutral-800/60">
          <div className="rounded border border-neutral-200/70 bg-neutral-50/50 p-2 dark:border-neutral-800/60 dark:bg-neutral-900/50">
            <div className="mb-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Trade Metrics
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {backtest.sl_pips != null && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">SL:</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">
                    {backtest.sl_pips.toFixed(1)} pips
                  </span>
                </div>
              )}
              {backtest.tp_pips != null && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">TP:</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">
                    {backtest.tp_pips.toFixed(1)} pips
                  </span>
                </div>
              )}
              {backtest.rr != null && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">R:R:</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                    {backtest.rr.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {backtest.notes && (
        <div className="border-t border-neutral-200/70 bg-neutral-50/30 p-3 dark:border-neutral-800/60 dark:bg-neutral-900/30">
          <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            Notes
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{backtest.notes}</p>
        </div>
      )}
    </div>

    {/* Image Zoom Dialog */}
    {backtest.chart_image && (
      <Dialog open={imageZoomed} onOpenChange={setImageZoomed}>
        <DialogContent className="p-0 overflow-hidden" style={{ width: '1835px', height: '1006px', maxWidth: '98vw', maxHeight: '98vh' }}>
          <DialogTitle className="sr-only">
            {backtest.symbol} Chart - {backtest.direction === 'long' ? 'Long' : 'Short'} - {date}
          </DialogTitle>
          <div className="relative h-full w-full">
            <button
              onClick={() => setImageZoomed(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-3 text-white transition-colors hover:bg-black/90"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={backtest.chart_image}
              alt={`${backtest.symbol} chart - full size`}
              className="h-full w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
