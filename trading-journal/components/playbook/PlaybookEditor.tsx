'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getDefaultRubric } from '@/lib/playbook-scoring'
import type {
  Playbook,
  PlaybookRule,
  PlaybookConfluence,
  PlaybookRubric,
  PlaybookTradeDetail,
  PlaybookExample,
  PlaybookIndicator,
  Symbol as SymbolRecord,
} from '@/types/supabase'
import { RulesEditor } from './RulesEditor'
import { ConfluencesEditor } from './ConfluencesEditor'
import { ScoringEditor } from './ScoringEditor'
import { PreviewPanel } from './PreviewPanel'
import { TradeDetailsEditor, type TradeDetailDraft } from './TradeDetailsEditor'
import { ExamplesEditor, type ExampleDraft } from './ExamplesEditor'
import { IndicatorsEditor, type IndicatorDraft } from './IndicatorsEditor'
import type { RuleDraft, ConfluenceDraft } from './types'

const sessionOptions = ['Asia', 'London', 'NY'] as const
const tradeTypeOptions = ['continuation', 'reversal'] as const
const timeframeOptions = ['1m', '5m', '15m', '30m', '1H', '4H', 'D1', 'W1'] as const

interface PlaybookEditorProps {
  mode: 'create' | 'edit' | 'view'
  userId: string
  initialPlaybook: Playbook | null
  initialRules: PlaybookRule[]
  initialConfluences: PlaybookConfluence[]
  initialRubric: PlaybookRubric | null
  symbols: SymbolRecord[]
  initialTradeDetails?: PlaybookTradeDetail[]
  initialExamples?: PlaybookExample[]
  initialIndicators?: PlaybookIndicator[]
}

interface BasicsState {
  name: string
  trade_type: (typeof tradeTypeOptions)[number] | ''
  description: string
  sessions: string[]
  symbols: string[]
  rr_min: string
  active: boolean
  analyst_tf: string
  exec_tf: string
  best_sessions: string[]
  notes_md: string
}

export function PlaybookEditor({
  mode,
  userId,
  initialPlaybook,
  initialRules,
  initialConfluences,
  initialRubric,
  symbols,
  initialTradeDetails = [],
  initialExamples = [],
  initialIndicators = [],
}: PlaybookEditorProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [playbookId, setPlaybookId] = React.useState<string | null>(
    initialPlaybook?.id ?? null
  )

  const [basics, setBasics] = React.useState<BasicsState>({
    name: initialPlaybook?.name ?? '',
    trade_type: (initialPlaybook?.trade_type as BasicsState['trade_type']) ?? '',
    description: initialPlaybook?.description ?? '',
    sessions: initialPlaybook?.sessions ?? [],
    symbols: initialPlaybook?.symbols ?? [],
    rr_min: initialPlaybook?.rr_min != null ? String(initialPlaybook.rr_min) : '',
    active: initialPlaybook?.active ?? true,
    analyst_tf: initialPlaybook?.analyst_tf ?? '',
    exec_tf: initialPlaybook?.exec_tf ?? '',
    best_sessions: initialPlaybook?.best_sessions ?? [],
    notes_md: initialPlaybook?.notes_md ?? '',
  })

  const [rules, setRules] = React.useState<RuleDraft[]>(
    initialRules
      .map((rule) => ({
        id: rule.id,
        playbook_id: rule.playbook_id,
        label: rule.label,
        type: rule.type,
        weight: Number(rule.weight) || 0,
        sort: rule.sort ?? 0,
      }))
      .sort((a, b) => a.sort - b.sort)
  )

  const [confluences, setConfluences] = React.useState<ConfluenceDraft[]>(
    initialConfluences
      .map((item) => ({
        id: item.id,
        playbook_id: item.playbook_id,
        label: item.label,
        weight: Number(item.weight) || 0,
        primary_confluence: item.primary_confluence,
        sort: item.sort ?? 0,
      }))
      .sort((a, b) => a.sort - b.sort)
  )

  const [tradeDetails, setTradeDetails] = React.useState<TradeDetailDraft[]>(
    initialTradeDetails
      .map((detail) => ({
        id: detail.id,
        playbook_id: detail.playbook_id,
        label: detail.label,
        type: detail.type,
        weight: Number(detail.weight) || 1,
        primary_item: detail.primary_item,
        sort: detail.sort ?? 0,
      }))
      .sort((a, b) => a.sort - b.sort)
  )

  const [examples, setExamples] = React.useState<ExampleDraft[]>(
    initialExamples
      .map((example) => ({
        id: example.id,
        playbook_id: example.playbook_id,
        media_urls: example.media_urls,
        caption: example.caption,
        sort: example.sort ?? 0,
      }))
      .sort((a, b) => a.sort - b.sort)
  )

  const [indicators, setIndicators] = React.useState<IndicatorDraft[]>(
    initialIndicators
      .map((indicator) => ({
        id: indicator.id,
        playbook_id: indicator.playbook_id,
        name: indicator.name,
        url: indicator.url,
        description: indicator.description,
        sort: indicator.sort ?? 0,
      }))
      .sort((a, b) => a.sort - b.sort)
  )

  const [rubric, setRubric] = React.useState<PlaybookRubric>(() => {
    const fallback = getDefaultRubric()
    return initialRubric
      ? { ...initialRubric }
      : {
          ...fallback,
          playbook_id: initialPlaybook?.id ?? '',
        }
  })

  const [deletedRuleIds, setDeletedRuleIds] = React.useState<string[]>([])
  const [deletedConfluenceIds, setDeletedConfluenceIds] = React.useState<string[]>([])
  const [deletedDetailIds, setDeletedDetailIds] = React.useState<string[]>([])
  const [deletedExampleIds, setDeletedExampleIds] = React.useState<string[]>([])
  const [deletedIndicatorIds, setDeletedIndicatorIds] = React.useState<string[]>([])
  const [activeTab, setActiveTab] = React.useState('basics')
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<string | null>(null)

  const persistedRuleIds = React.useRef(new Set(initialRules.map((rule) => rule.id)))
  const persistedConfluenceIds = React.useRef(
    new Set(initialConfluences.map((conf) => conf.id))
  )
  const persistedDetailIds = React.useRef(new Set(initialTradeDetails.map((d) => d.id)))
  const persistedExampleIds = React.useRef(new Set(initialExamples.map((e) => e.id)))
  const persistedIndicatorIds = React.useRef(new Set(initialIndicators.map((i) => i.id)))

  React.useEffect(() => {
    if (playbookId && rubric.playbook_id !== playbookId) {
      setRubric((prev) => ({ ...prev, playbook_id: playbookId }))
    }
  }, [playbookId, rubric.playbook_id])

  const markDirty = () => {
    setDirty(true)
    setStatus(null)
  }

  const toggleSession = (session: string) => {
    setBasics((prev) => {
      const nextSessions = prev.sessions.includes(session)
        ? prev.sessions.filter((s) => s !== session)
        : [...prev.sessions, session]
      return { ...prev, sessions: nextSessions }
    })
    markDirty()
  }

  const toggleBestSession = (session: string) => {
    setBasics((prev) => {
      const nextBestSessions = prev.best_sessions.includes(session)
        ? prev.best_sessions.filter((s) => s !== session)
        : [...prev.best_sessions, session]
      return { ...prev, best_sessions: nextBestSessions }
    })
    markDirty()
  }

  const toggleSymbol = (code: string) => {
    setBasics((prev) => {
      const nextSymbols = prev.symbols.includes(code)
        ? prev.symbols.filter((sym) => sym !== code)
        : [...prev.symbols, code]
      return { ...prev, symbols: nextSymbols }
    })
    markDirty()
  }

  const handleAddRule = () => {
    const newRule: RuleDraft = {
      id: crypto.randomUUID(),
      playbook_id: playbookId ?? undefined,
      label: '',
      type: 'must',
      weight: 1,
      sort: rules.length,
    }
    setRules((prev) => [...prev, newRule])
    markDirty()
  }

  const handleUpdateRule = (id: string, updates: Partial<RuleDraft>) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    )
    markDirty()
  }

  const handleRemoveRule = (id: string) => {
    setRules((prev) => {
      const next = prev.filter((rule) => rule.id !== id)
      return next.map((rule, index) => ({ ...rule, sort: index }))
    })
    if (persistedRuleIds.current.has(id)) {
      setDeletedRuleIds((prev) => [...prev, id])
    }
    markDirty()
  }

  const handleReorderRules = (fromIndex: number, toIndex: number) => {
    setRules((prev) => {
      const ordered = [...prev].sort((a, b) => a.sort - b.sort)
      const [moved] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, moved)
      return ordered.map((rule, index) => ({ ...rule, sort: index }))
    })
    markDirty()
  }

  const handleAddConfluence = () => {
    const newConfluence: ConfluenceDraft = {
      id: crypto.randomUUID(),
      playbook_id: playbookId ?? undefined,
      label: '',
      weight: 1,
      primary_confluence: false,
      sort: confluences.length,
    }
    setConfluences((prev) => [...prev, newConfluence])
    markDirty()
  }

  const handleUpdateConfluence = (id: string, updates: Partial<ConfluenceDraft>) => {
    setConfluences((prev) =>
      prev.map((conf) => (conf.id === id ? { ...conf, ...updates } : conf))
    )
    markDirty()
  }

  const handleRemoveConfluence = (id: string) => {
    setConfluences((prev) => {
      const next = prev.filter((conf) => conf.id !== id)
      return next.map((conf, index) => ({ ...conf, sort: index }))
    })
    if (persistedConfluenceIds.current.has(id)) {
      setDeletedConfluenceIds((prev) => [...prev, id])
    }
    markDirty()
  }

  const handleReorderConfluences = (fromIndex: number, toIndex: number) => {
    setConfluences((prev) => {
      const ordered = [...prev].sort((a, b) => a.sort - b.sort)
      const [moved] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, moved)
      return ordered.map((conf, index) => ({ ...conf, sort: index }))
    })
    markDirty()
  }

  const handleAddDetail = (type: TradeDetailDraft['type'] = 'detail') => {
    const newDetail: TradeDetailDraft = {
      id: crypto.randomUUID(),
      playbook_id: playbookId ?? undefined,
      label: '',
      type,
      weight: 1,
      primary_item: false,
      sort: tradeDetails.length,
    }
    setTradeDetails((prev) => [...prev, newDetail])
    markDirty()
  }

  const handleUpdateDetail = (id: string, updates: Partial<TradeDetailDraft>) => {
    setTradeDetails((prev) =>
      prev.map((detail) => (detail.id === id ? { ...detail, ...updates } : detail))
    )
    markDirty()
  }

  const handleRemoveDetail = (id: string) => {
    setTradeDetails((prev) => {
      const next = prev.filter((detail) => detail.id !== id)
      return next.map((detail, index) => ({ ...detail, sort: index }))
    })
    if (persistedDetailIds.current.has(id)) {
      setDeletedDetailIds((prev) => [...prev, id])
    }
    markDirty()
  }

  const handleReorderDetails = (fromIndex: number, toIndex: number) => {
    setTradeDetails((prev) => {
      const ordered = [...prev].sort((a, b) => a.sort - b.sort)
      const [moved] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, moved)
      return ordered.map((detail, index) => ({ ...detail, sort: index }))
    })
    markDirty()
  }

  const handleAddExample = () => {
    const newExample: ExampleDraft = {
      id: crypto.randomUUID(),
      playbook_id: playbookId ?? undefined,
      media_urls: [],
      caption: null,
      sort: examples.length,
    }
    setExamples((prev) => [...prev, newExample])
    markDirty()
  }

  const handleUpdateExample = (id: string, updates: Partial<ExampleDraft>) => {
    setExamples((prev) =>
      prev.map((example) => (example.id === id ? { ...example, ...updates } : example))
    )
    markDirty()
  }

  const handleRemoveExample = (id: string) => {
    setExamples((prev) => {
      const next = prev.filter((example) => example.id !== id)
      return next.map((example, index) => ({ ...example, sort: index }))
    })
    if (persistedExampleIds.current.has(id)) {
      setDeletedExampleIds((prev) => [...prev, id])
    }
    markDirty()
  }

  const handleAddIndicator = () => {
    const newIndicator: IndicatorDraft = {
      id: crypto.randomUUID(),
      playbook_id: playbookId ?? undefined,
      name: '',
      url: '',
      description: null,
      sort: indicators.length,
    }
    setIndicators((prev) => [...prev, newIndicator])
    markDirty()
  }

  const handleUpdateIndicator = (id: string, updates: Partial<IndicatorDraft>) => {
    setIndicators((prev) =>
      prev.map((indicator) => (indicator.id === id ? { ...indicator, ...updates } : indicator))
    )
    markDirty()
  }

  const handleRemoveIndicator = (id: string) => {
    setIndicators((prev) => {
      const next = prev.filter((indicator) => indicator.id !== id)
      return next.map((indicator, index) => ({ ...indicator, sort: index }))
    })
    if (persistedIndicatorIds.current.has(id)) {
      setDeletedIndicatorIds((prev) => [...prev, id])
    }
    markDirty()
  }

  const handleReorderIndicators = (fromIndex: number, toIndex: number) => {
    setIndicators((prev) => {
      const ordered = [...prev].sort((a, b) => a.sort - b.sort)
      const [moved] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, moved)
      return ordered.map((indicator, index) => ({ ...indicator, sort: index }))
    })
    markDirty()
  }

  const validationErrors = React.useMemo(() => {
    const issues: string[] = []
    if (!basics.name.trim()) {
      issues.push('Playbook name is required.')
    }
    if (rules.length === 0) {
      issues.push('Add at least one rule for this playbook.')
    }
    if (confluences.length === 0) {
      issues.push('Add at least one confluence so scoring can evaluate setups.')
    }
    return issues
  }, [basics.name, rules.length, confluences.length])

  const handleSave = async () => {
    console.log('[PlaybookEditor] handleSave called!')
    setError(null)
    setStatus(null)

    if (validationErrors.length > 0) {
      console.log('[PlaybookEditor] Validation errors:', validationErrors)
      setError(validationErrors.join(' '))
      return
    }

    setSaving(true)
    console.log('[PlaybookEditor] Starting save process...')

    try {
      // Create a fresh Supabase client for this save operation
      let supabase = createClient()
      console.log('[PlaybookEditor] Created fresh Supabase client')

      const payload = {
        name: basics.name.trim(),
        trade_type: basics.trade_type || null,
        description: basics.description || null,
        sessions: basics.sessions,
        symbols: basics.symbols,
        rr_min: basics.rr_min ? Number(basics.rr_min) : null,
        active: basics.active,
        analyst_tf: basics.analyst_tf || null,
        exec_tf: basics.exec_tf || null,
        best_sessions: basics.best_sessions,
        notes_md: basics.notes_md || null,
        user_id: userId,
      }

      console.log('[PlaybookEditor] Payload prepared, user_id:', userId)

      let currentId = playbookId

      if (!currentId) {
        console.log('[PlaybookEditor] Inserting new playbook...')

        // Add timeout wrapper
        const insertPromise = supabase
          .from('playbooks')
          .insert(payload)
          .select()
          .single()

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Insert timed out after 10 seconds')), 10000)
        )

        const result = await Promise.race([insertPromise, timeoutPromise]) as any
        const { data, error: insertError } = result

        console.log('[PlaybookEditor] Playbook insert result:', { data, error: insertError })
        if (insertError) throw insertError
        currentId = data.id
        setPlaybookId(data.id)
        console.log('[PlaybookEditor] Redirecting to:', `/playbook/${data.id}`)
        router.replace(`/playbook/${data.id}`)
      } else {
        console.log('[PlaybookEditor] Updating existing playbook:', currentId)

        // Try update with extended timeout and retry logic
        let updateError = null
        let attempts = 0
        const maxAttempts = 2

        while (attempts < maxAttempts && !updateError) {
          attempts++
          console.log(`[PlaybookEditor] Update attempt ${attempts}/${maxAttempts}`)

          try {
            const updatePromise = supabase
              .from('playbooks')
              .update(payload)
              .eq('id', currentId)

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Update timed out after 15 seconds')), 15000)
            )

            const result = await Promise.race([updatePromise, timeoutPromise]) as any
            updateError = result.error

            console.log('[PlaybookEditor] Playbook update result:', { error: updateError, attempt: attempts })
            if (!updateError) break // Success!

          } catch (timeoutError) {
            console.log('[PlaybookEditor] Update attempt timed out:', timeoutError)
            if (attempts >= maxAttempts) {
              throw new Error('Update failed after multiple attempts. Please refresh the page and try again.')
            }
            // Create fresh client for retry
            supabase = createClient()
            console.log('[PlaybookEditor] Created fresh client for retry')
          }
        }

        if (updateError) throw updateError
      }

      const sortedRules = [...rules].sort((a, b) => a.sort - b.sort)
      const sortedConfluences = [...confluences].sort((a, b) => a.sort - b.sort)
      const sortedDetails = [...tradeDetails].sort((a, b) => a.sort - b.sort)
      const sortedExamples = [...examples].sort((a, b) => a.sort - b.sort)
      const sortedIndicators = [...indicators].sort((a, b) => a.sort - b.sort)

      if (sortedRules.length > 0) {
        console.log('[PlaybookEditor] Upserting rules:', sortedRules.length)
        const rulePayload = sortedRules.map((rule, index) => ({
          id: rule.id,
          playbook_id: currentId,
          label: rule.label.trim(),
          type: rule.type,
          weight: Number(rule.weight) || 0,
          sort: index,
        }))

        const { error: ruleError } = await supabase.from('playbook_rules').upsert(rulePayload)
        console.log('[PlaybookEditor] Rules upsert result:', { error: ruleError })
        if (ruleError) throw ruleError

        setRules(rulePayload.map((rule) => ({ ...rule })))
      }

      if (sortedConfluences.length > 0) {
        console.log('[PlaybookEditor] Upserting confluences:', sortedConfluences.length)
        const confluencePayload = sortedConfluences.map((conf, index) => ({
          id: conf.id,
          playbook_id: currentId,
          label: conf.label.trim(),
          weight: Number(conf.weight) || 0,
          primary_confluence: conf.primary_confluence,
          sort: index,
        }))

        const { error: confError } = await supabase
          .from('playbook_confluences')
          .upsert(confluencePayload)
        console.log('[PlaybookEditor] Confluences upsert result:', { error: confError })
        if (confError) throw confError

        setConfluences(confluencePayload.map((conf) => ({ ...conf })))
      }

      if (sortedDetails.length > 0) {
        console.log('[PlaybookEditor] Processing trade details:', sortedDetails.length)
        const detailPayload = sortedDetails
          .filter((detail) => detail.label.trim().length > 0)
          .map((detail, index) => ({
            id: detail.id,
            playbook_id: currentId,
            label: detail.label.trim(),
            type: detail.type,
            weight: Number(detail.weight) || 1,
            primary_item: detail.primary_item,
            sort: index,
          }))

        if (detailPayload.length > 0) {
          console.log('[PlaybookEditor] Upserting trade details:', detailPayload.length)
          const { error: detailError } = await supabase
            .from('playbook_trade_details')
            .upsert(detailPayload)
          console.log('[PlaybookEditor] Trade details upsert result:', { error: detailError })
          if (detailError) throw detailError

          setTradeDetails(detailPayload.map((detail) => ({ ...detail })))
        }
      }

      if (sortedExamples.length > 0) {
        const examplePayload = sortedExamples
          .filter((example) => example.media_urls.length > 0)
          .map((example, index) => ({
            id: example.id,
            playbook_id: currentId,
            media_urls: example.media_urls,
            caption: example.caption || null,
            sort: index,
          }))

        if (examplePayload.length > 0) {
          const { error: exampleError } = await supabase
            .from('playbook_examples')
            .upsert(examplePayload)
          if (exampleError) throw exampleError

          setExamples(examplePayload.map((example) => ({ ...example })))
        }
      }

      if (deletedRuleIds.length > 0) {
        const { error: deleteRuleError } = await supabase
          .from('playbook_rules')
          .delete()
          .in('id', deletedRuleIds)
        if (deleteRuleError) throw deleteRuleError
        setDeletedRuleIds([])
      }

      if (deletedConfluenceIds.length > 0) {
        const { error: deleteConfError } = await supabase
          .from('playbook_confluences')
          .delete()
          .in('id', deletedConfluenceIds)
        if (deleteConfError) throw deleteConfError
        setDeletedConfluenceIds([])
      }

      if (deletedDetailIds.length > 0) {
        const { error: deleteDetailError } = await supabase
          .from('playbook_trade_details')
          .delete()
          .in('id', deletedDetailIds)
        if (deleteDetailError) throw deleteDetailError
        setDeletedDetailIds([])
      }

      if (deletedExampleIds.length > 0) {
        const { error: deleteExampleError } = await supabase
          .from('playbook_examples')
          .delete()
          .in('id', deletedExampleIds)
        if (deleteExampleError) throw deleteExampleError
        setDeletedExampleIds([])
      }

      if (deletedIndicatorIds.length > 0) {
        const { error: deleteIndicatorError } = await supabase
          .from('playbook_indicators')
          .delete()
          .in('id', deletedIndicatorIds)
        if (deleteIndicatorError) throw deleteIndicatorError
        setDeletedIndicatorIds([])
      }

      if (sortedIndicators.length > 0) {
        console.log('[PlaybookEditor] Processing indicators:', sortedIndicators.length)
        const indicatorPayload = sortedIndicators
          .filter((indicator) => indicator.name.trim().length > 0 && indicator.url.trim().length > 0)
          .map((indicator, index) => ({
            id: indicator.id,
            playbook_id: currentId,
            name: indicator.name.trim(),
            url: indicator.url.trim(),
            description: indicator.description || null,
            sort: index,
          }))

        if (indicatorPayload.length > 0) {
          console.log('[PlaybookEditor] Upserting indicators:', indicatorPayload.length, indicatorPayload)
          const { error: indicatorError } = await supabase
            .from('playbook_indicators')
            .upsert(indicatorPayload)
          console.log('[PlaybookEditor] Indicators upsert result:', { error: indicatorError })
          if (indicatorError) throw indicatorError

          setIndicators(indicatorPayload.map((indicator) => ({ ...indicator })))
        }
      }

      if (currentId) {
        const rubricPayload: PlaybookRubric = {
          ...rubric,
          playbook_id: currentId,
          grade_cutoffs: rubric.grade_cutoffs ? Object.fromEntries(
            Object.entries(rubric.grade_cutoffs).map(([grade, value]) => [
              grade.trim(),
              Number(value) || 0,
            ])
          ) : {},
        }

        const { error: rubricError } = await supabase
          .from('playbook_rubric')
          .upsert(rubricPayload)
        if (rubricError) throw rubricError

        setRubric(rubricPayload)
      }

      persistedRuleIds.current = new Set(sortedRules.map((rule) => rule.id))
      persistedConfluenceIds.current = new Set(
        sortedConfluences.map((conf) => conf.id)
      )
      persistedDetailIds.current = new Set(sortedDetails.map((d) => d.id))
      persistedExampleIds.current = new Set(sortedExamples.map((e) => e.id))
      persistedIndicatorIds.current = new Set(sortedIndicators.map((i) => i.id))

      console.log('[PlaybookEditor] Save successful!')
      setStatus('Playbook saved')
      setDirty(false)
    } catch (saveError) {
      console.error('[PlaybookEditor] Save failed:', saveError)
      const message =
        saveError instanceof Error ? saveError.message : 'Failed to save playbook.'
      setError(message)
      console.error('Failed to save playbook:', saveError)
    } finally {
      console.log('[PlaybookEditor] Save process completed, setting saving to false')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Link
                href="/playbook"
                className="inline-flex items-center gap-1 text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Playbooks
              </Link>
              <span>•</span>
              <span>{mode === 'create' ? 'Create Playbook' : mode === 'view' ? 'View Playbook' : 'Edit Playbook'}</span>
            </div>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
              {basics.name || 'Untitled Playbook'}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {mode === 'view'
                ? 'Viewing playbook details in read-only mode.'
                : 'Design the rules, confluences, and grading rubric for this setup.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mode === 'view' ? (
              <Badge className="border-blue-300/70 bg-blue-100/60 text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/40 dark:text-blue-300">
                Read-only mode
              </Badge>
            ) : (
              <>
                {dirty && (
                  <Badge className="border-amber-300/70 bg-amber-100/60 text-amber-700 dark:border-amber-800/70 dark:bg-amber-900/40 dark:text-amber-300">
                    Unsaved changes
                  </Badge>
                )}
                {status && !dirty && (
                  <Badge className="border-emerald-300/70 bg-emerald-100/60 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {status}
                  </Badge>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  <Save className={cn('h-4 w-4', saving && 'animate-spin')} />
                  {mode === 'create' && !playbookId ? 'Create Playbook' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="confluences">Confluences</TabsTrigger>
          <TabsTrigger value="details">Trade Details</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="mt-4 space-y-6">
          <div className={cn("grid gap-6 lg:grid-cols-[2fr_1fr]", mode === 'view' && "pointer-events-none opacity-90")}>
            <div className="space-y-6 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Playbook Name
                </label>
                <Input
                  value={basics.name}
                  onChange={(event) => {
                    setBasics((prev) => ({ ...prev, name: event.target.value }))
                    markDirty()
                  }}
                  placeholder="e.g. London session ICT breaker"
                />
              </div>

              {/* Trade Type - For Performance Tracking */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Trade Type
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Is this a trend-following or counter-trend strategy?
                </p>
                <div className="flex flex-wrap gap-2">
                  {tradeTypeOptions.map((tradeType) => (
                    <button
                      key={tradeType}
                      type="button"
                      onClick={() => {
                        setBasics((prev) => ({
                          ...prev,
                          trade_type: prev.trade_type === tradeType ? '' : tradeType
                        }))
                        markDirty()
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm capitalize transition-colors',
                        basics.trade_type === tradeType
                          ? 'border-blue-400 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                      )}
                    >
                      {tradeType}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Description
                </label>
                <Textarea
                  rows={6}
                  value={basics.description}
                  onChange={(event) => {
                    setBasics((prev) => ({ ...prev, description: event.target.value }))
                    markDirty()
                  }}
                  placeholder="Markdown supported. Summarise the setup narrative, the conditions you're looking for, and how it fits your system."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Analyst Timeframe
                  </label>
                  <Input
                    value={basics.analyst_tf}
                    onChange={(event) => {
                      setBasics((prev) => ({ ...prev, analyst_tf: event.target.value }))
                      markDirty()
                    }}
                    placeholder="e.g. 15m"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Execution Timeframe
                  </label>
                  <Input
                    value={basics.exec_tf}
                    onChange={(event) => {
                      setBasics((prev) => ({ ...prev, exec_tf: event.target.value }))
                      markDirty()
                    }}
                    placeholder="e.g. 5m"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Additional Notes
                </label>
                <Textarea
                  rows={8}
                  value={basics.notes_md}
                  onChange={(event) => {
                    setBasics((prev) => ({ ...prev, notes_md: event.target.value }))
                    markDirty()
                  }}
                  placeholder="Markdown supported. Add entry criteria, exit strategy, specific conditions, or any other notes..."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Trading Sessions
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sessionOptions.map((session) => {
                    const selected = basics.sessions.includes(session)
                    return (
                      <button
                        key={session}
                        type="button"
                        onClick={() => toggleSession(session)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium uppercase transition-colors',
                          selected
                            ? 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-800 dark:bg-black dark:text-neutral-300'
                        )}
                      >
                        {session}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Best Sessions
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Optimal sessions for this setup
                </p>
                <div className="flex flex-wrap gap-2">
                  {sessionOptions.map((session) => {
                    const selected = basics.best_sessions.includes(session)
                    return (
                      <button
                        key={session}
                        type="button"
                        onClick={() => toggleBestSession(session)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium uppercase transition-colors',
                          selected
                            ? 'border-purple-400 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-200'
                            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-800 dark:bg-black dark:text-neutral-300'
                        )}
                      >
                        {session}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Symbols
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Pick the instruments where this setup is valid.
                </p>
                <div className="flex max-h-64 flex-wrap gap-2 overflow-auto">
                  {symbols.map((symbol) => {
                    const selected = basics.symbols.includes(symbol.code)
                    return (
                      <button
                        key={symbol.id}
                        type="button"
                        onClick={() => toggleSymbol(symbol.code)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs transition-colors',
                          selected
                            ? 'border-purple-400 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-200'
                            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-800 dark:bg-black dark:text-neutral-300'
                        )}
                        title={symbol.display_name}
                      >
                        {symbol.code}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Minimum R:R
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Minimum risk-to-reward for this playbook (optional).
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.1"
                      value={basics.rr_min}
                      onChange={(event) => {
                        setBasics((prev) => ({ ...prev, rr_min: event.target.value }))
                        markDirty()
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Active
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Archived playbooks remain available for historical trades.
                    </p>
                  </div>
                  <Switch
                    checked={basics.active}
                    onCheckedChange={(checked) => {
                      setBasics((prev) => ({ ...prev, active: checked }))
                      markDirty()
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RulesEditor
            rules={rules}
            onAddRule={handleAddRule}
            onUpdateRule={handleUpdateRule}
            onRemoveRule={handleRemoveRule}
            onReorderRules={handleReorderRules}
            readOnly={mode === 'view'}
          />
        </TabsContent>

        <TabsContent value="confluences" className="mt-4">
          <ConfluencesEditor
            confluences={confluences}
            onAddConfluence={handleAddConfluence}
            onUpdateConfluence={handleUpdateConfluence}
            onRemoveConfluence={handleRemoveConfluence}
            onReorderConfluences={handleReorderConfluences}
            readOnly={mode === 'view'}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <TradeDetailsEditor
            details={tradeDetails}
            onAddDetail={handleAddDetail}
            onUpdateDetail={handleUpdateDetail}
            onRemoveDetail={handleRemoveDetail}
            onReorderDetails={handleReorderDetails}
            readOnly={mode === 'view'}
          />
        </TabsContent>

        <TabsContent value="examples" className="mt-4">
          <ExamplesEditor
            examples={examples}
            onAddExample={handleAddExample}
            onUpdateExample={handleUpdateExample}
            onRemoveExample={handleRemoveExample}
            userId={userId}
            playbookId={playbookId}
            readOnly={mode === 'view'}
          />
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          <IndicatorsEditor
            indicators={indicators}
            onAddIndicator={handleAddIndicator}
            onUpdateIndicator={handleUpdateIndicator}
            onRemoveIndicator={handleRemoveIndicator}
            onReorderIndicators={handleReorderIndicators}
            readOnly={mode === 'view'}
          />
        </TabsContent>

        <TabsContent value="scoring" className="mt-4">
          <ScoringEditor rubric={rubric} onChange={(next) => { setRubric(next); markDirty() }} readOnly={mode === 'view'} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <PreviewPanel rules={rules} confluences={confluences} rubric={rubric} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
