'use client'

import React from 'react'
import { X, Edit3, Copy, Trash2, TrendingUp, TrendingDown, Clock, DollarSign, Target, AlertTriangle, Loader2, ZoomIn } from 'lucide-react'
import type { Trade, Account, PlaybookRule, PlaybookConfluence, PlaybookRubric } from '@/types/supabase'
import { EMOTIONAL_STATES } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import {
  calculateR,
  formatPnL,
  formatR,
  calculateHoldTime,
  formatHoldTime,
  calculateTotalFees,
  getDirectionIcon,
  getPnLColorClass,
  parseConfluences,
  parseTags,
} from '@/lib/trades-selectors'
import {
  scoreSetup,
  getDefaultRubric,
  getGradeColor,
  formatScore,
  type ScoreResult,
} from '@/lib/playbook-scoring'
import { cn } from '@/lib/utils'

/** Thumbnail grid for chart screenshots with click-to-enlarge lightbox */
function ChartImages({ label, urls }: { label: string; urls: string[] }) {
  const [lightbox, setLightbox] = React.useState<string | null>(null)

  if (urls.length === 0) return null

  return (
    <div className="mb-4">
      {label && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{label}</p>
      )}
      <div className={`grid gap-2 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {urls.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setLightbox(url)}
            className="relative group aspect-video rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${label} ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="w-8 h-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Chart"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

const CLOSE_REASON_LABELS: Record<string, string> = {
  tp_hit: 'Take Profit Hit',
  sl_hit: 'Stop Loss Hit',
  manual_close: 'Manual Close',
  partial_close: 'Partial Close',
  breakeven: 'Break-even',
  other: 'Other',
}

interface TradeDrawerProps {
  open: boolean
  trade: Trade | null
  account: Account | undefined
  playbookName: string | null
  playbookCategory: string | null
  onClose: () => void
  onEdit: (trade: Trade) => void
  onDuplicate: (trade: Trade) => void
  onDelete: (trade: Trade) => void
}

export function TradeDrawer({
  open,
  trade,
  account,
  playbookName,
  playbookCategory,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: TradeDrawerProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [scoreSummary, setScoreSummary] = React.useState<ScoreResult | null>(null)
  const [playbookLoading, setPlaybookLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    if (!open || !trade) {
      setScoreSummary(null)
      setPlaybookLoading(false)
      return
    }

    if (!trade.playbook_id) {
      setScoreSummary(null)
      setPlaybookLoading(false)
      return
    }

    const load = async () => {
      setPlaybookLoading(true)
      try {
        const [rulesResponse, confluenceResponse, rubricResponse] = await Promise.all([
          supabase
            .from('playbook_rules')
            .select('*')
            .eq('playbook_id', trade.playbook_id)
            .order('sort'),
          supabase
            .from('playbook_confluences')
            .select('*')
            .eq('playbook_id', trade.playbook_id)
            .order('sort'),
          supabase
            .from('playbook_rubric')
            .select('*')
            .eq('playbook_id', trade.playbook_id)
            .maybeSingle(),
        ])

        if (cancelled) return

        const rules = (rulesResponse.data as PlaybookRule[] | null) ?? []
        const confluenceList = (confluenceResponse.data as PlaybookConfluence[] | null) ?? []
        const rubric = (rubricResponse.data as PlaybookRubric | null) ?? null

        const rubricForScore = rubric
          ? rubric
          : {
              ...getDefaultRubric(),
              playbook_id: trade.playbook_id,
            }

        const rulesChecked =
          (trade.rules_checked as Record<string, boolean> | null) ?? {}
        const confluencesChecked =
          (trade.confluences_checked as Record<string, boolean> | null) ?? {}

        if (rules.length > 0 || confluenceList.length > 0) {
          const result = scoreSetup({
            rules: rules.map((rule) => ({
              id: rule.id,
              type: rule.type,
              weight: rule.weight,
            })),
            rulesChecked,
            confluences: confluenceList.map((conf) => ({
              id: conf.id,
              weight: conf.weight,
              primary: conf.primary_confluence,
            })),
            confChecked: confluencesChecked,
            rubric: rubricForScore,
          })
          setScoreSummary(result)
        } else {
          setScoreSummary(null)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load playbook details for trade drawer:', error)
          setScoreSummary(null)
        }
      } finally {
        if (!cancelled) {
          setPlaybookLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, trade?.playbook_id, trade?.rules_checked, trade?.confluences_checked, supabase, trade])

  if (!open || !trade) {
    return null
  }

  const r = calculateR(trade)
  const holdTime = calculateHoldTime(trade)
  const totalFees = calculateTotalFees(trade)
  const confluences = parseConfluences(trade.confluences)
  const tags = parseTags(trade.tags)

  const gradeDisplay = scoreSummary?.grade ?? trade.setup_grade ?? null
  const scoreDisplay =
    typeof scoreSummary?.score === 'number'
      ? scoreSummary.score
      : typeof trade.setup_score === 'number'
      ? trade.setup_score
      : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-950 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <span className={getPnLColorClass(r || 0)}>
                  {getDirectionIcon(trade.direction)}
                </span>
                {trade.symbol}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {account?.name} · {(trade.exit_date || trade.entry_date || '').split('T')[0]}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => onEdit(trade)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDuplicate(trade)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this trade?')) {
                  onDelete(trade)
                  onClose()
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Overview Section */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
              Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs mb-1">
                  <DollarSign className="w-4 h-4" />
                  P&L (Currency)
                </div>
                <div className={`text-2xl font-bold ${getPnLColorClass(trade.pnl)}`}>
                  {formatPnL(trade.pnl, account?.currency || trade.currency)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs mb-1">
                  <Target className="w-4 h-4" />
                  R Multiple
                </div>
                <div className={`text-2xl font-bold ${getPnLColorClass(r || 0)}`}>
                  {formatR(r)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs mb-1">
                  <Clock className="w-4 h-4" />
                  Hold Time
                </div>
                <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {formatHoldTime(holdTime)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs mb-1">
                  <DollarSign className="w-4 h-4" />
                  Fees/Slippage
                </div>
                <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {formatPnL(totalFees, account?.currency || trade.currency)}
                </div>
              </div>
            </div>
          </section>

          {/* Setup Quality */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
              Setup Quality
            </h3>
            {trade.playbook_id ? (
              playbookLoading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading playbook metrics…
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Playbook
                      </p>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {playbookName || 'Unknown playbook'}
                      </p>
                      {playbookCategory && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {playbookCategory}
                        </p>
                      )}
                    </div>
                    {gradeDisplay ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                          getGradeColor(gradeDisplay)
                        )}
                      >
                        {gradeDisplay}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">—</span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-white/70 dark:bg-neutral-950/40 p-3">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Setup Score</p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {scoreDisplay !== null ? formatScore(scoreDisplay) : '—'}
                      </p>
                    </div>
                    <div className="rounded-md bg-white/70 dark:bg-neutral-950/40 p-3">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Must Rules</p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {scoreSummary
                          ? `${scoreSummary.parts.mustHit}/${scoreSummary.parts.mustCount}`
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-md bg-white/70 dark:bg-neutral-950/40 p-3">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Primary Confluences</p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {scoreSummary
                          ? `${scoreSummary.parts.primaryConfHit}/${scoreSummary.parts.primaryConfCount}`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {scoreSummary && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md bg-white/60 dark:bg-neutral-950/30 p-3">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Should Rules</p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {`${scoreSummary.parts.shouldHit}/${scoreSummary.parts.shouldCount}`}
                        </p>
                      </div>
                      <div className="rounded-md bg-white/60 dark:bg-neutral-950/30 p-3">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Optional Rules</p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {`${scoreSummary.parts.optionalHit}/${scoreSummary.parts.optionalCount}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {scoreSummary?.parts.missedMust && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      Missed must-rule penalty applied.
                    </div>
                  )}
                </div>
              )
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No playbook was linked to this trade.
              </p>
            )}
          </section>

          {/* Trade Details */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
              Trade Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Direction</span>
                <span className="font-medium text-neutral-900 dark:text-white capitalize">
                  {getDirectionIcon(trade.direction)} {trade.direction}
                </span>
              </div>
              {/* Entry time */}
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Entry Time</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {(trade.entry_date || '').split('T')[0]}
                  {(trade.open_time || trade.entry_time) ? ` · ${trade.open_time || trade.entry_time}` : ''}
                </span>
              </div>
              {/* Exit time */}
              {trade.exit_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Exit Time</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {trade.exit_date.split('T')[0]}
                    {(trade.close_time || trade.exit_time) ? ` · ${trade.close_time || trade.exit_time}` : ''}
                  </span>
                </div>
              )}
              {/* Size */}
              {(trade.size ?? trade.quantity) != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Size (lots)</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {(trade.size ?? trade.quantity)?.toFixed(2)}
                  </span>
                </div>
              )}
              {/* Result pips */}
              {trade.pips != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Result (pips)</span>
                  <span className={`font-medium ${trade.pips >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {trade.pips >= 0 ? '+' : ''}{trade.pips.toFixed(1)}
                  </span>
                </div>
              )}
              {/* Stop distance */}
              {(trade.actual_stop_pips ?? trade.stop_pips) != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Stop Distance (pips)</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {(trade.actual_stop_pips ?? trade.stop_pips)!.toFixed(1)}
                    {trade.actual_stop_pips != null && trade.stop_pips != null && trade.actual_stop_pips !== trade.stop_pips && (
                      <span className="text-neutral-400 dark:text-neutral-500 text-xs ml-1">(planned: {trade.stop_pips.toFixed(1)})</span>
                    )}
                  </span>
                </div>
              )}
              {/* TP distance */}
              {(trade.actual_target_pips ?? trade.target_pips) != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">TP Distance (pips)</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {(trade.actual_target_pips ?? trade.target_pips)!.toFixed(1)}
                    {trade.actual_target_pips != null && trade.target_pips != null && trade.actual_target_pips !== trade.target_pips && (
                      <span className="text-neutral-400 dark:text-neutral-500 text-xs ml-1">(planned: {trade.target_pips.toFixed(1)})</span>
                    )}
                  </span>
                </div>
              )}
              {/* Planned R:R */}
              {trade.rr_planned != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Planned R:R</span>
                  <span className="font-medium text-neutral-900 dark:text-white">1:{trade.rr_planned.toFixed(2)}</span>
                </div>
              )}
              {/* Entry / Stop / Exit price — only shown if present */}
              {trade.entry_price != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Entry Price</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{trade.entry_price.toFixed(5)}</span>
                </div>
              )}
              {trade.stop_price != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Stop Loss Price</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{trade.stop_price.toFixed(5)}</span>
                </div>
              )}
              {trade.exit_price != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Exit Price</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{trade.exit_price.toFixed(5)}</span>
                </div>
              )}
              {trade.close_reason && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Close Reason</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {CLOSE_REASON_LABELS[trade.close_reason] ?? trade.close_reason}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* MAE/MFE — only shown when at least one value was recorded */}
          {(trade.mae_pips != null || trade.mfe_pips != null) && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                Excursion
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {trade.mae_pips != null && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-1">
                      <TrendingDown className="w-4 h-4" />
                      MAE (Max Adverse Excursion)
                    </div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {trade.mae_pips.toFixed(1)} pips
                    </div>
                  </div>
                )}
                {trade.mfe_pips != null && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
                      <TrendingUp className="w-4 h-4" />
                      MFE (Max Favorable Excursion)
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {trade.mfe_pips.toFixed(1)} pips
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Categorization */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
              Categorization
            </h3>
            <div className="space-y-3">
              {trade.strategy && (
                <div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 block mb-1">Strategy</span>
                  <span className="inline-block px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    {trade.strategy}
                  </span>
                </div>
              )}
              {trade.session && (
                <div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 block mb-1">Session</span>
                  <span className="inline-block px-3 py-1 rounded text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 capitalize">
                    {trade.session}
                  </span>
                </div>
              )}
              {trade.emotional_state && (
                <div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 block mb-1">Emotional State</span>
                  {(() => {
                    const stateInfo = EMOTIONAL_STATES.find(s => s.value === trade.emotional_state)
                    return stateInfo ? (
                      <span className={cn(
                        "inline-block px-3 py-1 rounded text-sm",
                        "bg-neutral-100 dark:bg-neutral-900/30",
                        stateInfo.color
                      )}>
                        {stateInfo.label}
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded text-sm bg-neutral-100 dark:bg-neutral-900/30 text-neutral-700 dark:text-neutral-400">
                        {trade.emotional_state}
                      </span>
                    )
                  })()}
                </div>
              )}
              {confluences.length > 0 && (
                <div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 block mb-2">Confluences</span>
                  <div className="flex flex-wrap gap-2">
                    {confluences.map((conf, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-sm bg-neutral-100 dark:bg-neutral-900/30 text-neutral-700 dark:text-neutral-400"
                      >
                        {conf}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 block mb-2">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Rule Breaks */}
          {trade.rule_breaks && (
            <section>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Rule Breaks
              </h3>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-900 dark:text-red-300">{trade.rule_breaks}</p>
              </div>
            </section>
          )}

          {/* Notes/Journaling */}
          {trade.notes && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                Notes
              </h3>
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {trade.notes}
                </p>
              </div>
            </section>
          )}

          {/* Emotions */}
          {trade.emotions && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                Emotions
              </h3>
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {trade.emotions}
                </p>
              </div>
            </section>
          )}

          {/* Mistakes */}
          {trade.mistakes && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                Mistakes & Lessons
              </h3>
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {trade.mistakes}
                </p>
              </div>
            </section>
          )}

          {/* Chart Evidence */}
          {(() => {
            const entryUrls: string[] = trade.media_urls ?? []
            const htfUrls: string[] = trade.htf_media_urls ?? []
            // Also handle legacy attachments JSON
            const legacyUrls: string[] = (() => {
              if (!trade.attachments) return []
              try { return JSON.parse(trade.attachments) } catch { return [] }
            })()
            if (trade.image_url) legacyUrls.unshift(trade.image_url)

            const hasCharts = entryUrls.length > 0 || htfUrls.length > 0 || legacyUrls.length > 0
            if (!hasCharts) return null

            return (
              <section>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                  Chart Evidence
                </h3>
                <ChartImages label="Entry Chart" urls={entryUrls} />
                {htfUrls.length > 0 && <ChartImages label="Analysis Chart (HTF)" urls={htfUrls} />}
                {legacyUrls.length > 0 && <ChartImages label="Screenshots" urls={legacyUrls} />}
              </section>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
