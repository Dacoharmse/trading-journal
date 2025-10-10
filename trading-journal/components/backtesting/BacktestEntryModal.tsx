'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { scoreSetup } from '@/lib/playbook-scoring'
import { uploadTradeMedia, compressImage } from '@/lib/storage'
import type { PlaybookRule, PlaybookConfluence, PlaybookRubric } from '@/types/supabase'
import type { Backtest } from '@/lib/backtest-selectors'

interface BacktestEntryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  playbookId: string
  userId: string
  rules: PlaybookRule[]
  confluences: PlaybookConfluence[]
  rubric: PlaybookRubric
  symbols: string[]
  editingBacktest?: Backtest | null
}

export function BacktestEntryModal({
  open,
  onClose,
  onSuccess,
  playbookId,
  userId,
  rules,
  confluences,
  rubric,
  symbols,
  editingBacktest,
}: BacktestEntryModalProps) {
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(false)
  const [symbol, setSymbol] = React.useState('')
  const [session, setSession] = React.useState<string>('')
  const [direction, setDirection] = React.useState<'long' | 'short'>('long')
  const [entryDate, setEntryDate] = React.useState(new Date().toISOString().split('T')[0])
  // Planned metrics
  const [plannedSlPips, setPlannedSlPips] = React.useState('')
  const [plannedTpPips, setPlannedTpPips] = React.useState('')
  const [plannedRR, setPlannedRR] = React.useState('')
  // Actual metrics
  const [actualSlPips, setActualSlPips] = React.useState('')
  const [actualTpPips, setActualTpPips] = React.useState('')
  const [actualRR, setActualRR] = React.useState('')
  // Legacy fields (kept for backward compatibility)
  const [stopPips, setStopPips] = React.useState('')
  const [targetPips, setTargetPips] = React.useState('')
  const [resultR, setResultR] = React.useState('')
  const [outcome, setOutcome] = React.useState<'win' | 'loss' | 'breakeven' | 'closed'>('win')
  const [chartImage, setChartImage] = React.useState('')
  const [chartPreview, setChartPreview] = React.useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const [notes, setNotes] = React.useState('')
  const [rulesChecked, setRulesChecked] = React.useState<Record<string, boolean>>({})
  const [confluencesChecked, setConfluencesChecked] = React.useState<Record<string, boolean>>(
    {}
  )

  // Populate fields when editing
  React.useEffect(() => {
    if (editingBacktest && open) {
      setSymbol(editingBacktest.symbol)
      setSession(editingBacktest.session || '')
      setDirection(editingBacktest.direction)
      setEntryDate(editingBacktest.entry_date)
      setPlannedSlPips(editingBacktest.planned_sl_pips?.toString() || '')
      setPlannedTpPips(editingBacktest.planned_tp_pips?.toString() || '')
      setPlannedRR(editingBacktest.planned_rr?.toString() || '')
      setActualSlPips(editingBacktest.actual_sl_pips?.toString() || '')
      setActualTpPips(editingBacktest.actual_tp_pips?.toString() || '')
      setActualRR(editingBacktest.actual_rr?.toString() || '')
      setStopPips(editingBacktest.stop_pips?.toString() || '')
      setTargetPips(editingBacktest.target_pips?.toString() || '')
      setResultR(editingBacktest.result_r.toString())
      setOutcome(editingBacktest.outcome || 'win')
      setChartImage(editingBacktest.chart_image || '')
      setChartPreview(editingBacktest.chart_image || null)
      setNotes(editingBacktest.notes || '')
      setRulesChecked((editingBacktest.rules_checked as Record<string, boolean>) || {})
      setConfluencesChecked((editingBacktest.confluences_checked as Record<string, boolean>) || {})
    } else if (open && !editingBacktest) {
      resetForm()
    }
  }, [editingBacktest, open])

  const score = React.useMemo(() => {
    return scoreSetup({
      rules: rules.map((r) => ({ id: r.id, type: r.type, weight: r.weight })),
      rulesChecked,
      confluences: confluences.map((c) => ({
        id: c.id,
        weight: c.weight,
        primary: c.primary_confluence,
      })),
      confChecked: confluencesChecked,
      rubric,
    })
  }, [rules, confluences, rulesChecked, confluencesChecked, rubric])

  const handleSubmit = async () => {
    if (!symbol || !resultR) return

    setLoading(true)
    try {
      const data = {
        symbol,
        session: session || null,
        direction,
        entry_date: entryDate,
        // Planned metrics
        planned_sl_pips: plannedSlPips ? Number(plannedSlPips) : null,
        planned_tp_pips: plannedTpPips ? Number(plannedTpPips) : null,
        planned_rr: plannedRR ? Number(plannedRR) : null,
        // Actual metrics
        actual_sl_pips: actualSlPips ? Number(actualSlPips) : null,
        actual_tp_pips: actualTpPips ? Number(actualTpPips) : null,
        actual_rr: actualRR ? Number(actualRR) : null,
        // Legacy fields
        stop_pips: stopPips ? Number(stopPips) : null,
        target_pips: targetPips ? Number(targetPips) : null,
        result_r: Number(resultR),
        outcome,
        chart_image: chartImage || null,
        setup_score: score.score,
        setup_grade: score.grade,
        notes: notes || null,
        rules_checked: rulesChecked,
        confluences_checked: confluencesChecked,
      }

      let error

      if (editingBacktest) {
        // Update existing backtest
        const result = await supabase
          .from('backtests')
          .update(data)
          .eq('id', editingBacktest.id)
        error = result.error
      } else {
        // Insert new backtest
        const result = await supabase.from('backtests').insert({
          user_id: userId,
          playbook_id: playbookId,
          ...data,
        })
        error = result.error
      }

      if (error) throw error

      onSuccess()
      resetForm()
      onClose()
    } catch (error) {
      console.error('Failed to save backtest:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = React.useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          setUploadingImage(true)
          try {
            // Compress image before upload
            const compressedFile = await compressImage(file)

            // Upload to Supabase storage
            const result = await uploadTradeMedia(compressedFile, userId, 'backtests')

            if (result.error) {
              console.error('Upload failed:', result.error)
              // Fallback: create local preview only
              const reader = new FileReader()
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string
                setChartPreview(dataUrl)
              }
              reader.readAsDataURL(file)
            } else {
              // Successfully uploaded
              setChartImage(result.url)
              setChartPreview(result.url)
            }
          } catch (error) {
            console.error('Failed to upload image:', error)
            // Fallback: create local preview
            const reader = new FileReader()
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string
              setChartPreview(dataUrl)
            }
            reader.readAsDataURL(file)
          } finally {
            setUploadingImage(false)
          }
        }
      }
    },
    [userId]
  )

  const resetForm = () => {
    setSymbol('')
    setSession('')
    setDirection('long')
    setEntryDate(new Date().toISOString().split('T')[0])
    setPlannedSlPips('')
    setPlannedTpPips('')
    setPlannedRR('')
    setActualSlPips('')
    setActualTpPips('')
    setActualRR('')
    setStopPips('')
    setTargetPips('')
    setResultR('')
    setOutcome('win')
    setChartImage('')
    setChartPreview(null)
    setNotes('')
    setRulesChecked({})
    setConfluencesChecked({})
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBacktest ? 'Edit' : 'Add'} Backtest Trade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Session</Label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia">Asia</SelectItem>
                  <SelectItem value="London">London</SelectItem>
                  <SelectItem value="NY">NY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'long' | 'short')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Entry Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>

          {/* Planned Metrics */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Planned Metrics (before trade)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">SL (pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={plannedSlPips}
                  onChange={(e) => setPlannedSlPips(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label className="text-xs">TP (pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={plannedTpPips}
                  onChange={(e) => setPlannedTpPips(e.target.value)}
                  placeholder="20"
                />
              </div>
              <div>
                <Label className="text-xs">R:R</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={plannedRR}
                  onChange={(e) => setPlannedRR(e.target.value)}
                  placeholder="2.0"
                />
              </div>
            </div>
          </div>

          {/* Actual Metrics */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Actual Results (what happened)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">SL (pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={actualSlPips}
                  onChange={(e) => setActualSlPips(e.target.value)}
                  placeholder="8"
                />
              </div>
              <div>
                <Label className="text-xs">TP (pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={actualTpPips}
                  onChange={(e) => setActualTpPips(e.target.value)}
                  placeholder="15"
                />
              </div>
              <div>
                <Label className="text-xs">R:R</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={actualRR}
                  onChange={(e) => setActualRR(e.target.value)}
                  placeholder="1.5"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Result (R) *</Label>
            <Input
              type="number"
              step="0.01"
              value={resultR}
              onChange={(e) => setResultR(e.target.value)}
              placeholder="1.5"
              required
            />
          </div>

          <div>
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as typeof outcome)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Chart Image</Label>
            <div
              className="relative mt-2 rounded-lg border-2 border-dashed border-slate-300 p-4 transition-colors hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
              onPaste={handlePaste}
            >
              {uploadingImage ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Uploading image...
                  </div>
                </div>
              ) : chartPreview ? (
                <div className="space-y-2">
                  <img
                    src={chartPreview}
                    alt="Chart preview"
                    className="h-auto w-full rounded border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setChartPreview(null)
                      setChartImage('')
                    }}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Click here and paste your chart (Ctrl+Shift+S)
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Copy chart from TradingView and paste directly here
                  </p>
                </div>
              )}
            </div>
            <Input
              type="url"
              value={chartImage}
              onChange={(e) => {
                setChartImage(e.target.value)
                if (e.target.value) {
                  setChartPreview(e.target.value)
                }
              }}
              placeholder="Or paste image URL manually"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Rules Followed</Label>
            <div className="mt-2 space-y-2 rounded border border-slate-200 p-3 dark:border-slate-700">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rulesChecked[rule.id] ?? false}
                    onChange={(e) =>
                      setRulesChecked((prev) => ({ ...prev, [rule.id]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Confluences Used</Label>
            <div className="mt-2 space-y-2 rounded border border-slate-200 p-3 dark:border-slate-700">
              {confluences.map((conf) => (
                <div key={conf.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confluencesChecked[conf.id] ?? false}
                    onChange={(e) =>
                      setConfluencesChecked((prev) => ({ ...prev, [conf.id]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">{conf.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="text-sm font-medium">
              Setup Grade: <span className="text-lg font-bold">{score.grade}</span> (
              {(score.score * 100).toFixed(0)}%)
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, market conditions, lessons learned..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !symbol || !resultR} className="flex-1">
            {loading ? 'Saving...' : editingBacktest ? 'Update Backtest' : 'Add Backtest'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
