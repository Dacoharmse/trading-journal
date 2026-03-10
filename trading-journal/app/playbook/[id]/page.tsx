'use client'

import * as React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { PlaybookEditor } from '@/components/playbook/PlaybookEditor'
import { PlaybookMiniDashboard, calculatePlaybookStats, type PlaybookStats } from '@/components/playbook/PlaybookMiniDashboard'
import type {
  Playbook,
  PlaybookRule,
  PlaybookConfluence,
  PlaybookRubric,
  PlaybookTradeDetail,
  PlaybookExample,
  PlaybookIndicator,
  Symbol,
} from '@/types/supabase'

interface TradeRecord {
  id: string
  playbook_id: string | null
  pnl: number
  r_multiple: number | null
  closed_at: string | null
  opened_at: string | null
  exit_date?: string | null
  actual_rr?: number | null
}

export default function EditPlaybookPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const playbookId = params?.id
  const isViewMode = searchParams.get('view') === 'true'

  const [userId, setUserId] = React.useState<string | null>(null)
  const [playbook, setPlaybook] = React.useState<Playbook | null>(null)
  const [rules, setRules] = React.useState<PlaybookRule[]>([])
  const [confluences, setConfluences] = React.useState<PlaybookConfluence[]>([])
  const [tradeDetails, setTradeDetails] = React.useState<PlaybookTradeDetail[]>([])
  const [examples, setExamples] = React.useState<PlaybookExample[]>([])
  const [indicators, setIndicators] = React.useState<PlaybookIndicator[]>([])
  const [rubric, setRubric] = React.useState<PlaybookRubric | null>(null)
  const [symbols, setSymbols] = React.useState<Symbol[]>([])
  const [stats, setStats] = React.useState<PlaybookStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [missing, setMissing] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    if (!playbookId) {
      setMissing(true)
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)

      try {
        // Single API call replaces 9 browser-client queries (bypasses RLS, no token-refresh lock)
        const res = await fetch(`/api/playbook/full?playbook_id=${encodeURIComponent(playbookId)}`)

        if (res.status === 401) {
          router.replace('/auth/login')
          return
        }

        if (res.status === 404) {
          setMissing(true)
          return
        }

        if (!res.ok) {
          throw new Error(`Failed to load playbook (${res.status})`)
        }

        const [data, profileRes] = await Promise.all([
          res.json(),
          fetch('/api/user/profile').then(r => r.json()).catch(() => ({})),
        ])
        if (cancelled) return

        const profile = profileRes?.profile
        if (profile?.id || profile?.user_id) setUserId(profile.user_id || profile.id)

        setPlaybook(data.playbook as Playbook)
        setRules((data.rules as PlaybookRule[]) ?? [])
        setConfluences((data.confluences as PlaybookConfluence[]) ?? [])
        setTradeDetails((data.tradeDetails as PlaybookTradeDetail[]) ?? [])
        setExamples((data.examples as PlaybookExample[]) ?? [])
        setIndicators((data.indicators as PlaybookIndicator[]) ?? [])
        setRubric((data.rubric as PlaybookRubric | null) ?? null)
        setSymbols((data.symbols as Symbol[]) ?? [])

        // Calculate playbook stats
        const rawTrades = (data.trades as TradeRecord[]) ?? []
        const trades = rawTrades.map((t) => ({
          ...t,
          r_multiple: t.r_multiple ?? t.actual_rr ?? null,
          closed_at: t.exit_date ?? null,
        }))
        const calculatedStats = calculatePlaybookStats(playbookId, trades)
        setStats(calculatedStats.total_trades > 0 ? calculatedStats : null)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load playbook:', error)
          setMissing(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [playbookId, router])

  if (loading) {
    return (
      <div className="flex-1 bg-neutral-50 p-6 dark:bg-[#070707]">
        <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="h-32 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
        </div>
      </div>
    )
  }

  if (missing || !userId || !playbook) {
    router.replace('/playbook')
    return null
  }

  return (
    <div className="flex-1 bg-neutral-50 p-6 dark:bg-[#070707]">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Playbook Performance Dashboard */}
        <div className="rounded-xl border border-neutral-200/70 bg-white/70 p-6 backdrop-blur dark:border-neutral-800/60 dark:bg-[#070707]/60">
          <PlaybookMiniDashboard stats={stats} showTitle />
        </div>

        <PlaybookEditor
          mode={isViewMode ? 'view' : 'edit'}
          userId={userId}
          initialPlaybook={playbook}
          initialRules={rules}
          initialConfluences={confluences}
          initialTradeDetails={tradeDetails}
          initialExamples={examples}
          initialIndicators={indicators}
          initialRubric={rubric}
          symbols={symbols}
        />
      </div>
    </div>
  )
}
