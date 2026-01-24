'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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

  const [loading, setLoading] = React.useState(false)
  const [symbol, setSymbol] = React.useState('')
  const [session, setSession] = React.useState<string>('')
  const [direction, setDirection] = React.useState<'long' | 'short'>('long')
  const [entryDate, setEntryDate] = React.useState<Date>(new Date())
  const [holdTime, setHoldTime] = React.useState('')
  const [timeOfDay, setTimeOfDay] = React.useState('')
  // Simplified trade metrics
  const [slPips, setSlPips] = React.useState('')
  const [tpPips, setTpPips] = React.useState('')
  const [rr, setRR] = React.useState('')
  const [resultR, setResultR] = React.useState('')
  const [outcome, setOutcome] = React.useState<'win' | 'loss' | 'breakeven' | 'closed'>('win')
  const [chartImage, setChartImage] = React.useState('')
  const [chartPreview, setChartPreview] = React.useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const [originalChartImage, setOriginalChartImage] = React.useState('')
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
      setEntryDate(new Date(editingBacktest.entry_date))
      setHoldTime(editingBacktest.hold_time?.toString() || '')
      setTimeOfDay(editingBacktest.time_of_day || '')
      setSlPips(editingBacktest.sl_pips?.toString() || '')
      setTpPips(editingBacktest.tp_pips?.toString() || '')
      setRR(editingBacktest.rr?.toString() || '')
      setResultR(editingBacktest.result_r.toString())
      setOutcome(editingBacktest.outcome || 'win')
      setChartImage(editingBacktest.chart_image || '')
      setOriginalChartImage(editingBacktest.chart_image || '')
      setChartPreview(editingBacktest.chart_image || null)
      setNotes(editingBacktest.notes || '')
      setRulesChecked((editingBacktest.rules_checked as Record<string, boolean>) || {})
      setConfluencesChecked((editingBacktest.confluences_checked as Record<string, boolean>) || {})
    } else if (open && !editingBacktest) {
      resetForm()
    }
  }, [editingBacktest, open])

  const score = React.useMemo(() => {
    // For backtesting, we don't have a checklist feature
    // So we adjust the rubric to distribute the checklist weight to rules and confluences
    const adjustedRubric = {
      ...rubric,
      weight_rules: 0.7, // 70% for rules (up from 50%)
      weight_confluences: 0.3, // 30% for confluences (up from 20%)
      weight_checklist: 0.0, // 0% for checklist (down from 30%)
    }

    const result = scoreSetup({
      rules: rules.map((r) => ({ id: r.id, type: r.type, weight: r.weight })),
      rulesChecked,
      confluences: confluences.map((c) => ({
        id: c.id,
        weight: c.weight,
        primary: c.primary_confluence,
      })),
      confChecked: confluencesChecked,
      rubric: adjustedRubric,
    })

    // Debug logging
    const uncheckedRules = rules.filter((r) => !rulesChecked[r.id])
    const uncheckedConf = confluences.filter((c) => !confluencesChecked[c.id])

    console.log('Score breakdown:', {
      score: result.score,
      grade: result.grade,
      rulesPct: result.parts.rulesPct,
      confPct: result.parts.confPct,
      missedMust: result.parts.missedMust,
      rulesChecked: Object.keys(rulesChecked).length,
      totalRules: rules.length,
      confChecked: Object.keys(confluencesChecked).length,
      totalConf: confluences.length,
      uncheckedRules: uncheckedRules.map((r) => ({ text: r.label, type: r.type })),
      uncheckedConf: uncheckedConf.map((c) => c.label),
    })

    return result
  }, [rules, confluences, rulesChecked, confluencesChecked, rubric])

  const handleSubmit = async () => {
    if (!symbol || !resultR) return

    setLoading(true)
    try {
      // Create fresh Supabase client for this request
      const supabase = createClient()

      console.log('Submitting backtest with entry date:', entryDate, 'formatted:', format(entryDate, 'yyyy-MM-dd'))

      // Log image size if present and check if too large (only for new backtests)
      if (chartImage && !editingBacktest) {
        const imageSizeKB = (chartImage.length / 1024).toFixed(1)
        console.log(`Chart image size: ${imageSizeKB} KB`)

        // Reject if data URL is too large (> 500KB will cause database timeouts)
        if (chartImage.startsWith('data:') && chartImage.length > 500000) {
          const sizeKB = (chartImage.length / 1024).toFixed(1)
          console.error(`Data URL is too large (${sizeKB} KB), rejecting save`)
          setLoading(false)
          alert(`Image is too large (${sizeKB} KB) and will cause the save to fail.\n\nPlease:\n1. Use a smaller screenshot\n2. Crop the image before pasting\n3. Or leave the image field empty and save without an image`)
          return
        }
      }

      // Only include chart_image if it has changed or is new
      const imageHasChanged = editingBacktest ? chartImage !== originalChartImage : true

      const data: any = {
        symbol,
        session: session || null,
        direction,
        entry_date: format(entryDate, 'yyyy-MM-dd'),
        hold_time: holdTime ? Number(holdTime) : null,
        time_of_day: timeOfDay || null,
        // Trade metrics
        sl_pips: slPips ? Number(slPips) : null,
        tp_pips: tpPips ? Number(tpPips) : null,
        rr: rr ? Number(rr) : null,
        result_r: Number(resultR),
        outcome,
        setup_score: score.score,
        setup_grade: score.grade,
        notes: notes || null,
        rules_checked: rulesChecked,
        confluences_checked: confluencesChecked,
      }

      // Only include chart_image if changed (to avoid re-sending large data URLs)
      if (imageHasChanged) {
        data.chart_image = chartImage || null
        console.log('Image has changed, including in update')
      } else {
        console.log('Image unchanged, skipping from update')
      }

      let error

      if (editingBacktest) {
        // Update existing backtest
        console.log('Updating backtest:', editingBacktest.id)
        const result = await supabase
          .from('backtests')
          .update(data)
          .eq('id', editingBacktest.id)
        error = result.error
        console.log('Update result:', { error, data: result.data })
      } else {
        // Insert new backtest
        const insertData = {
          user_id: userId,
          playbook_id: playbookId,
          ...data,
        }
        console.log('Inserting backtest...')
        const result = await supabase.from('backtests').insert(insertData)
        error = result.error
        console.log('Insert result:', { error, data: result.data })
      }

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Backtest saved successfully')

      // Reset loading state first to avoid UI getting stuck
      setLoading(false)

      // Then trigger callbacks
      onSuccess()
      resetForm()
      onClose()
    } catch (error) {
      console.error('=== BACKTEST SAVE ERROR ===')
      console.error('Error:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      })
      console.error('=== END ERROR ===')
      alert(`Failed to save backtest: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          if (!file) {
            console.warn('No file found in clipboard')
            continue
          }

          console.log('[BacktestEntry] Starting image upload:', file.name, file.size, 'bytes')
          setUploadingImage(true)

          // Set a timeout to prevent infinite loading
          let timeoutCleared = false
          const startTime = Date.now()
          const uploadTimeout = setTimeout(() => {
            if (!timeoutCleared) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
              console.error(`[BacktestEntry] Upload timeout after ${elapsed}s - resetting upload state`)
              setUploadingImage(false)
              setChartPreview(null)
              alert(`Image upload timed out after ${elapsed} seconds. The image may be too large or there may be a network issue. Please try again or use a smaller image.`)
            }
          }, 45000) // 45 second timeout for large images

          try {
            // Compress image
            console.log('[BacktestEntry] Compressing image...')
            const compressionStart = Date.now()
            const compressedFile = await compressImage(file)
            const compressionTime = ((Date.now() - compressionStart) / 1000).toFixed(1)
            console.log(`[BacktestEntry] Image compressed in ${compressionTime}s: ${file.size} → ${compressedFile.size} bytes`)

            // Clear main timeout since compression succeeded
            timeoutCleared = true
            clearTimeout(uploadTimeout)

            // Convert compressed image to data URL (skip Supabase upload since it's timing out)
            console.log('[BacktestEntry] Converting to data URL...')
            const reader = new FileReader()
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string
              setChartImage(dataUrl)
              setChartPreview(dataUrl)
              const sizeKB = (dataUrl.length / 1024).toFixed(1)
              console.log(`[BacktestEntry] Data URL ready, size: ${sizeKB} KB`)

              // Warn if still large
              if (dataUrl.length > 200000) {
                console.warn(`[BacktestEntry] Data URL is large (${sizeKB} KB), save may be slow`)
              }
            }
            reader.onerror = () => {
              console.error('[BacktestEntry] FileReader error')
              setUploadingImage(false)
            }
            reader.readAsDataURL(compressedFile)
          } catch (error) {
            // Clear timeout on error
            timeoutCleared = true
            clearTimeout(uploadTimeout)
            console.error('[BacktestEntry] Exception during upload:', error)

            // Fallback: create local preview using data URL
            try {
              const reader = new FileReader()
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string
                setChartImage(dataUrl) // Store data URL as fallback
                setChartPreview(dataUrl)
                console.log('[BacktestEntry] Using local data URL after exception')
              }
              reader.onerror = () => {
                console.error('[BacktestEntry] FileReader error in catch block')
              }
              reader.readAsDataURL(file)
            } catch (readerError) {
              console.error('[BacktestEntry] FileReader failed:', readerError)
            }
          } finally {
            console.log('[BacktestEntry] Resetting upload state')
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
    setEntryDate(new Date())
    setHoldTime('')
    setTimeOfDay('')
    setSlPips('')
    setTpPips('')
    setRR('')
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !entryDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {entryDate ? format(entryDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={entryDate}
                    onSelect={(date) => date && setEntryDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="hold-time">Hold Time (minutes) - Optional</Label>
              <Input
                id="hold-time"
                type="number"
                min="0"
                step="1"
                placeholder="e.g., 120 for 2 hours"
                value={holdTime}
                onChange={(e) => setHoldTime(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="time-of-day">Time of Day - Optional</Label>
              <Input
                id="time-of-day"
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
              />
            </div>
          </div>

          {/* Trade Metrics */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Trade Metrics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">SL (pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={slPips}
                  onChange={(e) => setSlPips(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label className="text-xs">TP (pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={tpPips}
                  onChange={(e) => setTpPips(e.target.value)}
                  placeholder="20"
                />
              </div>
              <div>
                <Label className="text-xs">R:R</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rr}
                  onChange={(e) => setRR(e.target.value)}
                  placeholder="2.0"
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
              className="relative mt-2 rounded-lg border-2 border-dashed border-neutral-300 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
              onPaste={handlePaste}
            >
              {uploadingImage ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Uploading image...
                  </div>
                </div>
              ) : chartPreview ? (
                <div className="space-y-2">
                  <img
                    src={chartPreview}
                    alt="Chart preview"
                    className="h-auto w-full rounded border border-neutral-200 dark:border-neutral-700"
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
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Click here and paste your chart (Ctrl+Shift+S)
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
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
            <div className="mt-2 space-y-2 rounded border border-neutral-200 p-3 dark:border-neutral-700">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={rulesChecked[rule.id] ?? false}
                    onChange={(e) =>
                      setRulesChecked((prev) => ({ ...prev, [rule.id]: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-950 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:ring-neutral-300"
                  />
                  <span className="text-sm leading-5">{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Confluences Used</Label>
            <div className="mt-2 space-y-2 rounded border border-neutral-200 p-3 dark:border-neutral-700">
              {confluences.map((conf) => (
                <div key={conf.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={confluencesChecked[conf.id] ?? false}
                    onChange={(e) =>
                      setConfluencesChecked((prev) => ({ ...prev, [conf.id]: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-950 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:ring-neutral-300"
                  />
                  <span className="text-sm leading-5">{conf.label}</span>
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
