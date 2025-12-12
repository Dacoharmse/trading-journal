'use client'

import React from 'react'
import { X, Save, TrendingUp, TrendingDown, Info, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type {
  Trade,
  Account,
  Symbol,
  Playbook,
  PlaybookRule,
  PlaybookConfluence,
  PlaybookRubric,
  RiskViolation,
  EmotionalState,
} from '@/types/supabase'
import { EMOTIONAL_STATES } from '@/types/supabase'
import { ChartPaste, type MediaItem } from './ChartPaste'
import {
  rFromPips,
  formatR,
  validateTradeNumber,
  getPipsLabel,
  calculatePlannedRR,
} from '@/lib/trade-math'
import { SetupChecklist } from '@/components/trades/SetupChecklist'
import { scoreSetup, getDefaultRubric } from '@/lib/playbook-scoring'
import { RiskWarningDialog, type RiskViolationDetails } from '@/components/risk-management/RiskWarningDialog'

type PlaybookOption = Pick<Playbook, 'id' | 'name' | 'category' | 'active'>

const CLOSE_REASON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Select reason' },
  { value: 'tp_hit', label: 'Take Profit Hit' },
  { value: 'sl_hit', label: 'Stop Loss Hit' },
  { value: 'manual_close', label: 'Manual Close' },
  { value: 'partial_close', label: 'Partial Close' },
  { value: 'breakeven', label: 'Break-even' },
  { value: 'other', label: 'Other' },
]

interface NewTradeSheetProps {
  open: boolean
  onClose: () => void
  onSave: (trade: Partial<Trade>) => Promise<void>
  editingTrade?: Partial<Trade> | null
  accounts: Account[]
  userId: string
}

export function NewTradeSheet({
  open,
  onClose,
  onSave,
  editingTrade,
  accounts,
  userId,
}: NewTradeSheetProps) {
  const supabase = createClient()

  // Form state
  const [accountId, setAccountId] = React.useState<string>('')
  const [symbolId, setSymbolId] = React.useState<string>('')
  const [direction, setDirection] = React.useState<'long' | 'short'>('long')
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
  const [openTime, setOpenTime] = React.useState('')
  const [closeTime, setCloseTime] = React.useState('')
  const [session, setSession] = React.useState<'Asia' | 'London' | 'NY' | ''>('')

  // Pips/R fields
  const [pips, setPips] = React.useState<string>('')
  const [stopPips, setStopPips] = React.useState<string>('')
  const [targetPips, setTargetPips] = React.useState<string>('')
  const [rrPlanned, setRrPlanned] = React.useState<string>('')
  const [riskR, setRiskR] = React.useState<string>('1.0')

  // Trade outcome fields
  const [pnlAmount, setPnlAmount] = React.useState<string>('')
  const [actualRr, setActualRr] = React.useState<string>('')
  const [outcome, setOutcome] = React.useState<'win' | 'loss' | 'breakeven' | ''>('')

  // Timeframe fields
  const [entryTimeframe, setEntryTimeframe] = React.useState<string>('')
  const [analysisTimeframe, setAnalysisTimeframe] = React.useState<string>('')

  // Playbook
  const [playbooks, setPlaybooks] = React.useState<PlaybookOption[]>([])
  const [playbookId, setPlaybookId] = React.useState<string>('')
  const [playbookRules, setPlaybookRules] = React.useState<PlaybookRule[]>([])
  const [playbookConfluences, setPlaybookConfluences] = React.useState<PlaybookConfluence[]>([])
  const [playbookRubric, setPlaybookRubric] = React.useState<PlaybookRubric | null>(null)
  const [rulesChecked, setRulesChecked] = React.useState<Record<string, boolean>>({})
  const [confluencesChecked, setConfluencesChecked] = React.useState<Record<string, boolean>>({})
  const [playbookLoading, setPlaybookLoading] = React.useState(false)

  // Media & notes
  const [media, setMedia] = React.useState<MediaItem[]>([])
  const [htfMedia, setHtfMedia] = React.useState<MediaItem[]>([])
  const [notes, setNotes] = React.useState('')
  const [closeReason, setCloseReason] = React.useState<string>('')
  const [emotionalState, setEmotionalState] = React.useState<EmotionalState | ''>('')

  // Risk management
  const [riskWarningOpen, setRiskWarningOpen] = React.useState(false)
  const [riskViolation, setRiskViolation] = React.useState<RiskViolationDetails | null>(null)
  const [pendingTradeData, setPendingTradeData] = React.useState<Partial<Trade> | null>(null)

  // Data
  const [symbols, setSymbols] = React.useState<Symbol[]>([])

  // UI state
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Trade review request state
  const [requestReview, setRequestReview] = React.useState(false)
  const [selectedMentorId, setSelectedMentorId] = React.useState<string>('')
  const [reviewMessage, setReviewMessage] = React.useState('')
  const [mentors, setMentors] = React.useState<Array<{ id: string; full_name: string; email: string }>>([])
  const [loadingMentors, setLoadingMentors] = React.useState(false)

  // Computed values
  const selectedAccount = React.useMemo(() =>
    accounts.find(acc => acc.id === accountId),
    [accounts, accountId]
  )

  const rubricForChecklist = React.useMemo<PlaybookRubric>(() => {
    if (playbookRubric) return playbookRubric
    const fallback = getDefaultRubric()
    return {
      ...fallback,
      playbook_id: playbookId || '',
    }
  }, [playbookRubric, playbookId])

  // Load data
  const loadData = React.useCallback(
    async (trade?: Partial<Trade>) => {
      // Load playbooks
      const { data: playbookRows } = await supabase
        .from('playbooks')
        .select('id, name, category, active')
        .eq('active', true)
        .order('name')

      let playbookList = (playbookRows as PlaybookOption[] | null) ?? []

      if (trade?.playbook_id && !playbookList.some((pb) => pb.id === trade.playbook_id)) {
        const { data: existingPlaybook } = await supabase
          .from('playbooks')
          .select('id, name, category, active')
          .eq('id', trade.playbook_id)
          .maybeSingle()

        if (existingPlaybook) {
          playbookList = [...playbookList, existingPlaybook as PlaybookOption]
        }
      }

      playbookList.sort((a, b) => a.name.localeCompare(b.name))
      setPlaybooks(playbookList)
    },
    [supabase]
  )

  const loadAccountSymbols = React.useCallback(
    async (accId: string) => {
      const { data } = await supabase
        .from('account_symbols')
        .select('symbol_id, symbols(*)')
        .eq('account_id', accId)

      if (data) {
        const syms = data
          .map((as) => as.symbols)
          .filter((s): s is Symbol => s !== null) as unknown as Symbol[]
        setSymbols(syms)
      }
    },
    [supabase]
  )

  const loadMentors = React.useCallback(
    async () => {
      setLoadingMentors(true)
      try {
        // Get all approved mentors (Keegan van Dyk and Chris Dicks)
        const { data } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('is_mentor', true)
          .eq('mentor_approved', true)
          .order('full_name')

        if (data) {
          setMentors(data)
        }
      } catch (error) {
        console.error('Failed to load mentors:', error)
      } finally {
        setLoadingMentors(false)
      }
    },
    [supabase]
  )

  React.useEffect(() => {
    if (open) {
      void loadData(editingTrade ?? undefined)
      void loadMentors()
      if (editingTrade) {
        populateForm(editingTrade)
      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTrade])

  // Load symbols for selected account
  React.useEffect(() => {
    if (accountId) {
      loadAccountSymbols(accountId)
    } else {
      setSymbols([])
    }
  }, [accountId, loadAccountSymbols])

  const clearPlaybookState = React.useCallback(() => {
    setPlaybookRules([])
    setPlaybookConfluences([])
    setPlaybookRubric(null)
    setRulesChecked({})
    setConfluencesChecked({})
    setPlaybookLoading(false)
  }, [])

  const loadPlaybookDetails = React.useCallback(
    async (
      id: string,
      initialRuleChecks: Record<string, boolean> = {},
      initialConfChecks: Record<string, boolean> = {}
    ) => {
      if (!id) {
        clearPlaybookState()
        return
      }

      setPlaybookLoading(true)
      try {
        const [rulesResponse, confResponse, rubricResponse] = await Promise.all([
          supabase
            .from('playbook_rules')
            .select('*')
            .eq('playbook_id', id)
            .order('sort'),
          supabase
            .from('playbook_confluences')
            .select('*')
            .eq('playbook_id', id)
            .order('sort'),
          supabase
            .from('playbook_rubric')
            .select('*')
            .eq('playbook_id', id)
            .maybeSingle(),
        ])

        const rulesList = (rulesResponse.data as PlaybookRule[] | null) ?? []
        const confList = (confResponse.data as PlaybookConfluence[] | null) ?? []
        const rubricData = (rubricResponse.data as PlaybookRubric | null) ?? null

        setPlaybookRules(rulesList)
        setPlaybookConfluences(confList)
        setPlaybookRubric(rubricData)

        const ruleChecks: Record<string, boolean> = {}
        rulesList.forEach((rule) => {
          ruleChecks[rule.id] = initialRuleChecks[rule.id] ?? false
        })
        setRulesChecked(ruleChecks)

        const confChecks: Record<string, boolean> = {}
        confList.forEach((conf) => {
          confChecks[conf.id] = initialConfChecks[conf.id] ?? false
        })
        setConfluencesChecked(confChecks)
      } finally {
        setPlaybookLoading(false)
      }
    },
    [supabase, clearPlaybookState]
  )

  const handlePlaybookChange = React.useCallback(
    async (id: string) => {
      setPlaybookId(id)
      if (!id) {
        clearPlaybookState()
        return
      }
      await loadPlaybookDetails(id)
    },
    [clearPlaybookState, loadPlaybookDetails]
  )

  const populateForm = React.useCallback(
    (trade: Partial<Trade>) => {
      setAccountId(trade.account_id || '')
      setSymbolId(trade.symbol_id || '')
      setDirection(trade.direction || 'long')
      setDate(trade.entry_date || new Date().toISOString().split('T')[0])
      setOpenTime(trade.open_time || '')
      setCloseTime(trade.close_time || '')
      setSession(trade.session || '')
      setPips(trade.pips?.toString() || '')
      setStopPips(trade.stop_pips?.toString() || '')
      setTargetPips(trade.target_pips?.toString() || '')
      setRrPlanned(trade.rr_planned?.toString() || '')
      setRiskR(trade.risk_r?.toString() || '1.0')
      setStrategyId(trade.strategy_id || '')
      setNotes(trade.notes || '')
      setCloseReason(trade.close_reason || '')
      setEmotionalState(trade.emotional_state || '')

      const existingRulesChecked =
        (trade.rules_checked as Record<string, boolean> | null) ?? {}
      const existingConfsChecked =
        (trade.confluences_checked as Record<string, boolean> | null) ?? {}

      const tradePlaybookId = trade.playbook_id || ''
      setPlaybookId(tradePlaybookId)
      setRulesChecked(existingRulesChecked)
      setConfluencesChecked(existingConfsChecked)

      if (tradePlaybookId) {
        void loadPlaybookDetails(tradePlaybookId, existingRulesChecked, existingConfsChecked)
      } else {
        clearPlaybookState()
      }

      if (trade.media_urls && trade.media_urls.length > 0) {
        setMedia(trade.media_urls.map((url) => ({ url, kind: 'image' as const })))
      }
      if (trade.htf_media_urls && trade.htf_media_urls.length > 0) {
        setHtfMedia(trade.htf_media_urls.map((url) => ({ url, kind: 'image' as const })))
      }
    },
    [loadPlaybookDetails, clearPlaybookState]
  )

  const resetForm = React.useCallback(() => {
    setAccountId(accounts.length === 1 ? accounts[0].id : '')
    setSymbolId('')
    setDirection('long')
    setDate(new Date().toISOString().split('T')[0])
    setOpenTime('')
    setCloseTime('')
    setSession('')
    setPips('')
    setStopPips('')
    setTargetPips('')
    setRrPlanned('')
    setRiskR('1.0')
    setCloseReason('')
    setEmotionalState('')
    setPlaybookId('')
    clearPlaybookState()
    setMedia([])
    setHtfMedia([])
    setNotes('')
    setErrors({})
    setRequestReview(false)
    setSelectedMentorId('')
    setReviewMessage('')
  }, [accounts, clearPlaybookState])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!accountId) errs.accountId = 'Account is required'
    if (!symbolId) errs.symbolId = 'Symbol is required'
    if (!date) errs.date = 'Date is required'

    // Validate numbers
    const pipsVal = validateTradeNumber(pips || null)
    const stopVal = validateTradeNumber(stopPips || null, 0)
    const targetVal = validateTradeNumber(targetPips || null, 0)
    const rrVal = validateTradeNumber(rrPlanned || null, 0)
    const riskVal = validateTradeNumber(riskR, 0.25, 5)

    if (!pipsVal.valid) errs.pips = pipsVal.error || 'Invalid'
    if (!stopVal.valid) errs.stopPips = stopVal.error || 'Invalid'
    if (!targetVal.valid) errs.targetPips = targetVal.error || 'Invalid'
    if (!rrVal.valid) errs.rrPlanned = rrVal.error || 'Invalid'
    if (!riskVal.valid) errs.riskR = riskVal.error || 'Invalid'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Helper function to check risk violations
  const checkRiskViolation = async (
    riskRNum: number
  ): Promise<RiskViolationDetails | null> => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account || !account.session_risk_enabled) {
      return null // No risk limits enabled
    }

    // Calculate risk for this trade
    const tradeRisk = account.riskLimitType === 'percentage'
      ? (riskRNum / 100) * account.initial_balance
      : riskRNum

    // Get today's trades to calculate session/daily risk
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTrades } = await supabase
      .from('trades')
      .select('risk_r')
      .eq('account_id', accountId)
      .gte('entry_date', today)
      .lt('entry_date', new Date(Date.now() + 86400000).toISOString().split('T')[0])

    const todayRiskSum = (todayTrades || []).reduce(
      (sum, t) => sum + (t.risk_r || 0),
      0
    )

    const totalRisk = todayRiskSum + riskRNum
    const riskLimit = account.riskLimitValue || 2.0

    // Check if exceeding limit
    if (totalRisk > riskLimit) {
      return {
        accountName: account.name,
        accountCurrency: account.currency,
        riskLimit: riskLimit,
        actualRisk: totalRisk,
        limitType: account.riskLimitType || 'percentage',
        violationType: 'session_limit',
      }
    }

    return null
  }

  // Function to save trade with optional risk violation reason
  const saveTradeWithRisk = async (violationReason: string | null) => {
    // Compute R-multiple
    const pipsNum = pips ? parseFloat(pips) : null
    const stopPipsNum = stopPips ? parseFloat(stopPips) : null
    const riskRNum = riskR ? parseFloat(riskR) : 1.0
    const rMultiple = rFromPips(pipsNum, stopPipsNum, riskRNum)

    // Compute planned R:R if not provided
    let rrPlannedNum = rrPlanned ? parseFloat(rrPlanned) : null
    if (!rrPlannedNum && targetPips && stopPips) {
      rrPlannedNum = calculatePlannedRR(parseFloat(targetPips), parseFloat(stopPips))
    }

      let setupScore: number | null = null
      let setupGrade: string | null = null
      let rulesSnapshot: Record<string, boolean> | null = null
      let confluencesSnapshot: Record<string, boolean> | null = null

      if (playbookId) {
        rulesSnapshot = rulesChecked
        confluencesSnapshot = confluencesChecked

        if (playbookRules.length > 0 || playbookConfluences.length > 0) {
          const rubric = playbookRubric
            ? playbookRubric
            : {
                ...getDefaultRubric(),
                playbook_id: playbookId,
              }

          const result = scoreSetup({
            rules: playbookRules.map((rule) => ({
              id: rule.id,
              type: rule.type,
              weight: rule.weight,
            })),
            rulesChecked,
            confluences: playbookConfluences.map((conf) => ({
              id: conf.id,
              weight: conf.weight,
              primary: conf.primary_confluence,
            })),
            confChecked: confluencesChecked,
            rubric,
          })

          setupScore = result.score
          setupGrade = result.grade
        }
      }

    const tradeData: Partial<Trade> = {
      ...(editingTrade?.id ? { id: editingTrade.id } : {}),
      account_id: accountId,
      symbol_id: symbolId,
      direction,
      entry_date: date,
      open_time: openTime || null,
      close_time: closeTime || null,
      session: session || null,
      pips: pipsNum,
      stop_pips: stopPipsNum,
      target_pips: targetPips ? parseFloat(targetPips) : null,
      rr_planned: rrPlannedNum,
      risk_r: riskRNum,
      r_multiple: rMultiple,
      playbook_id: playbookId || null,
      rules_checked: playbookId ? rulesSnapshot : null,
      confluences_checked: playbookId ? confluencesSnapshot : null,
      setup_score: playbookId ? setupScore : null,
      setup_grade: playbookId ? setupGrade : null,
      close_reason: closeReason || null,
      notes: notes || null,
      media_urls: media.map((m) => m.url),
      htf_media_urls: htfMedia.length > 0 ? htfMedia.map((m) => m.url) : undefined,
      pnl_amount: pnlAmount ? parseFloat(pnlAmount) : null,
      pnl_currency: selectedAccount?.currency || 'USD',
      actual_rr: actualRr ? parseFloat(actualRr) : null,
      outcome: outcome || null,
      entry_timeframe: entryTimeframe || null,
      analysis_timeframe: analysisTimeframe || null,
      emotional_state: emotionalState || null,
    }

    await onSave(tradeData)

    // Save risk violation if reason provided
    if (violationReason && riskViolation) {
      const account = accounts.find((a) => a.id === accountId)
      await supabase.from('risk_violations').insert({
        user_id: userId,
        account_id: accountId,
        trade_id: tradeData.id || null,
        violation_type: riskViolation.violationType,
        risk_limit: riskViolation.riskLimit,
        actual_risk: riskViolation.actualRisk,
        limit_type: riskViolation.limitType,
        reason: violationReason,
        override_approved: true,
      })
    }

    // Handle trade review request
    if (requestReview && selectedMentorId && tradeData.id) {
      try {
        // Create trade review request
        await supabase.from('trade_reviews').insert({
          trade_id: tradeData.id,
          trader_id: userId,
          mentor_id: selectedMentorId,
          status: 'pending',
          priority: 'normal',
          request_message: reviewMessage || 'Please review my trade',
          is_read: false,
        })

        // Create notification for the mentor
        const selectedMentor = mentors.find(m => m.id === selectedMentorId)
        await supabase.from('notifications').insert({
          user_id: selectedMentorId,
          type: 'trade_review_request',
          title: 'New Trade Review Request',
          message: `A student has requested a review for their trade`,
          link: `/mentor/reviews`,
          is_read: false,
        })
      } catch (error) {
        console.error('Failed to create review request:', error)
        // Don't block the save if review request fails
      }
    }

    onClose()
    resetForm()
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSaving(true)

    try {
      // Compute risk to check violations
      const riskRNum = riskR ? parseFloat(riskR) : 1.0

      // Check for risk violations
      const violation = await checkRiskViolation(riskRNum)
      if (violation) {
        // Store violation and show warning dialog
        setSaving(false)
        setRiskViolation(violation)
        setRiskWarningOpen(true)
        return
      }

      // No violation, proceed with save
      await saveTradeWithRisk(null)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save trade')
    } finally {
      setSaving(false)
    }
  }

  const handleRiskWarningProceed = async (reason: string) => {
    setRiskWarningOpen(false)
    setSaving(true)

    try {
      await saveTradeWithRisk(reason)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save trade')
    } finally {
      setSaving(false)
    }
  }

  const handleRiskWarningCancel = () => {
    setRiskWarningOpen(false)
    setRiskViolation(null)
    setPendingTradeData(null)
  }

  // Computed values
  const selectedSymbol = symbols.find((s) => s.id === symbolId)
  const assetClass = selectedSymbol?.asset_class || 'FX'
  const pipsLabel = getPipsLabel(assetClass)

  const realizedR = React.useMemo(() => {
    const p = pips ? parseFloat(pips) : null
    const s = stopPips ? parseFloat(stopPips) : null
    const r = riskR ? parseFloat(riskR) : 1.0
    return rFromPips(p, s, r)
  }, [pips, stopPips, riskR])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-neutral-800 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {editingTrade ? 'Edit Trade' : 'New Trade'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem'
                }}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#374151'}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Setup Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.accountId ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
                {errors.accountId && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.accountId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Playbook
                </label>
                <select
                  value={playbookId}
                  onChange={(e) => handlePlaybookChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  <option value="">No playbook</option>
                  {playbooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name} {pb.active ? '' : '(Archived)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Symbol *
                </label>
                <select
                  value={symbolId}
                  onChange={(e) => setSymbolId(e.target.value)}
                  disabled={!accountId}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.symbolId ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Select symbol...</option>
                  {symbols.map((sym) => (
                    <option key={sym.id} value={sym.id}>
                      {sym.display_name} ({sym.asset_class})
                    </option>
                  ))}
                </select>
                {errors.symbolId && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.symbolId}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Direction *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('long')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${direction === 'long' ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500'}`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('short')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${direction === 'short' ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500'}`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Short
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entry Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.date ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                />
                {errors.date && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entry Time
                </label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entry Timeframe *
                </label>
                <select
                  value={entryTimeframe}
                  onChange={(e) => setEntryTimeframe(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  <option value="">Select timeframe...</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">Daily</option>
                  <option value="1w">Weekly</option>
                  <option value="1M">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Analysis Timeframe <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <select
                  value={analysisTimeframe}
                  onChange={(e) => setAnalysisTimeframe(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  <option value="">None</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">Daily</option>
                  <option value="1w">Weekly</option>
                  <option value="1M">Monthly</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Higher timeframe used for analysis/confirmation
                </p>
              </div>
            </div>

            {/* HTF Chart Upload - shown when analysis timeframe is selected */}
            {analysisTimeframe && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Higher Timeframe Chart <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Add a screenshot of your {analysisTimeframe} analysis chart
                </p>
                <ChartPaste
                  media={htfMedia}
                  onChange={setHtfMedia}
                  userId={userId}
                  tradeId={editingTrade?.id}
                  maxFiles={2}
                />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Playbook Checklist
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track which rules and confluences were met for this setup. These selections are saved with the trade.
            </p>
            {playbookId ? (
              <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                {playbookLoading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading checklist…
                  </div>
                ) : playbookRules.length === 0 && playbookConfluences.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This playbook has no checklist items yet. Add rules and confluences in the playbook editor to enable grading.
                  </p>
                ) : (
                  <SetupChecklist
                    rules={playbookRules}
                    confluences={playbookConfluences}
                    rubric={rubricForChecklist}
                    rulesChecked={rulesChecked}
                    confluencesChecked={confluencesChecked}
                    onRulesChange={setRulesChecked}
                    onConfluencesChange={setConfluencesChecked}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-neutral-600 bg-white/60 dark:bg-neutral-800/50 p-4 text-sm text-gray-500 dark:text-gray-400">
                Select a playbook above to record your checklist progress.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Planned Setup
              </h3>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="hidden group-hover:block absolute left-0 top-6 z-20 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl">
                  Record the targets you set before entering. We’ll auto-calc planned R:R if you leave it blank.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planned Stop Distance ({pipsLabel})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stopPips}
                  onChange={(e) => setStopPips(e.target.value)}
                  placeholder="e.g. 20"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.stopPips ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                />
                {errors.stopPips && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.stopPips}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planned Target Distance ({pipsLabel})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={targetPips}
                  onChange={(e) => setTargetPips(e.target.value)}
                  placeholder="e.g. 40"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.targetPips ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planned R:R
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={rrPlanned}
                  onChange={(e) => setRrPlanned(e.target.value)}
                  placeholder="e.g. 2 for 1:2"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.rrPlanned ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Risk Per Trade (R)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="5"
                  value={riskR}
                  onChange={(e) => setRiskR(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.riskR ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                />
                {errors.riskR && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.riskR}</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Trade Outcome
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Actual Result ({pipsLabel})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pips}
                  onChange={(e) => setPips(e.target.value)}
                  placeholder="e.g. +45.2 or -12.5"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-700 ${errors.pips ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'}`}
                />
                {errors.pips && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.pips}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Close Reason
                </label>
                <select
                  value={closeReason}
                  onChange={(event) => setCloseReason(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  {CLOSE_REASON_OPTIONS.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exit Time
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  P/L Amount ({selectedAccount?.currency || 'USD'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pnlAmount}
                  onChange={(e) => setPnlAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Actual R:R
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={actualRr}
                  onChange={(e) => setActualRr(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Outcome
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as 'win' | 'loss' | 'breakeven' | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  <option value="">Select...</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="breakeven">Break-even</option>
                </select>
              </div>
            </div>

            {realizedR !== null && (
              <div
                className={`rounded-lg border px-4 py-3 ${
                  realizedR >= 0
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Realized R Multiple</span>
                  <span className="text-xl font-semibold">{formatR(realizedR, true)}</span>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Session & Journal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value as 'Asia' | 'London' | 'NY' | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  <option value="">None</option>
                  <option value="Asia">Asia</option>
                  <option value="London">London</option>
                  <option value="NY">NY</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emotional State
                </label>
                <select
                  value={emotionalState}
                  onChange={(e) => setEmotionalState(e.target.value as EmotionalState | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                >
                  <option value="">Select your state...</option>
                  {EMOTIONAL_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How were you feeling when taking this trade?
                </p>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Trade notes, observations, lessons learned..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 resize-none"
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Request Mentor Review
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ask your mentor to review this trade and provide feedback
            </p>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="request-review"
                checked={requestReview}
                onChange={(e) => setRequestReview(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="request-review" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Request mentor review for this trade
              </label>
            </div>

            {requestReview && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-500">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Mentor *
                  </label>
                  {loadingMentors ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading mentors...</div>
                  ) : (
                    <select
                      value={selectedMentorId}
                      onChange={(e) => setSelectedMentorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
                    >
                      <option value="">Choose a mentor...</option>
                      {mentors.map((mentor) => (
                        <option key={mentor.id} value={mentor.id}>
                          {mentor.full_name || mentor.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message for Mentor <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    rows={3}
                    placeholder="Any specific questions or areas you'd like feedback on..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 resize-none"
                  />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Chart Evidence
            </h3>
            <ChartPaste media={media} onChange={setMedia} userId={userId} tradeId={editingTrade?.id} />
          </section>
        </div>
      </div>

      {/* Risk Warning Dialog */}
      <RiskWarningDialog
        open={riskWarningOpen}
        onOpenChange={setRiskWarningOpen}
        violation={riskViolation}
        onProceed={handleRiskWarningProceed}
        onCancel={handleRiskWarningCancel}
      />
    </div>
  )
}
