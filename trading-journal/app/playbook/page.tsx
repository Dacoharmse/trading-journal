'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlaybookListClient, type PlaybookSummary } from '@/components/playbook/PlaybookListClient'
import { calculatePlaybookStats } from '@/components/playbook/PlaybookMiniDashboard'

interface PlaybookRecord {
  id: string
  user_id: string
  name: string
  description: string | null
  sessions: string[] | null
  symbols: string[] | null
  rr_min: number | null
  active: boolean
  created_at?: string
  updated_at?: string
  playbook_rules?: { count: number }[]
  playbook_confluences?: { count: number }[]
}

interface TradeRecord {
  id: string
  playbook_id: string | null
  pnl: number
  r_multiple: number | null
  closed_at: string | null
  opened_at: string | null
}

export default function PlaybookPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  const [playbooks, setPlaybooks] = React.useState<PlaybookSummary[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hasMounted, setHasMounted] = React.useState(false)

  // Reset loading state when pathname changes (navigation)
  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.replace('/auth/login')
          return
        }

        // Fetch playbooks and trades in parallel
        const [playbooksRes, tradesRes] = await Promise.all([
          supabase
            .from('playbooks')
            .select('*, playbook_rules(count), playbook_confluences(count)')
            .order('updated_at', { ascending: false }),
          supabase
            .from('trades')
            .select('id, playbook_id, pnl, r_multiple, closed_at, opened_at')
            .not('playbook_id', 'is', 'null'),
        ])

        if (playbooksRes.error) {
          throw playbooksRes.error
        }

        if (!cancelled) {
          const trades = (tradesRes.data as TradeRecord[] | null) ?? []

          const mapped =
            (playbooksRes.data as PlaybookRecord[] | null)?.map((playbook) => {
              // Calculate stats for this playbook
              const stats = calculatePlaybookStats(playbook.id, trades)

              return {
                id: playbook.id,
                user_id: playbook.user_id,
                name: playbook.name,
                description: playbook.description,
                sessions: playbook.sessions ?? [],
                symbols: playbook.symbols ?? [],
                rr_min: playbook.rr_min ?? null,
                active: playbook.active,
                created_at: playbook.created_at,
                updated_at: playbook.updated_at,
                rules_count: playbook.playbook_rules?.[0]?.count ?? 0,
                confluences_count: playbook.playbook_confluences?.[0]?.count ?? 0,
                stats: stats.total_trades > 0 ? stats : null,
              }
            }) ?? []
          setPlaybooks(mapped)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load playbooks:', err)
          setError('Unable to load playbooks.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    // Only load after component has mounted to avoid hydration issues
    if (hasMounted) {
      void load()
    }

    return () => {
      cancelled = true
    }
  }, [supabase, router, hasMounted, pathname])

  if (loading) {
    return (
      <div className="flex-1 bg-neutral-50 p-6 dark:bg-black">
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="h-10 w-full rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black"
              >
                <div className="h-6 w-1/2 rounded bg-neutral-200/70 dark:bg-neutral-800/60" />
                <div className="mt-4 h-20 rounded bg-neutral-200/70 dark:bg-neutral-800/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-neutral-50 p-6 dark:bg-black">
      <div className="mx-auto w-full max-w-6xl">
        <PlaybookListClient initialPlaybooks={playbooks} initialError={error} />
      </div>
    </div>
  )
}
