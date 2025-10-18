'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlaybookListClient, type PlaybookSummary } from '@/components/playbook/PlaybookListClient'

interface PlaybookRecord {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string
  sessions: string[] | null
  symbols: string[] | null
  rr_min: number | null
  active: boolean
  created_at?: string
  updated_at?: string
  playbook_rules?: { count: number }[]
  playbook_confluences?: { count: number }[]
}

export default function PlaybookPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()

  const [playbooks, setPlaybooks] = React.useState<PlaybookSummary[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.replace('/auth/login')
          return
        }

        const { data, error: fetchError } = await supabase
          .from('playbooks')
          .select('*, playbook_rules(count), playbook_confluences(count)')
          .order('updated_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        if (!cancelled) {
          const mapped =
            (data as PlaybookRecord[] | null)?.map((playbook) => ({
              id: playbook.id,
              user_id: playbook.user_id,
              name: playbook.name,
              description: playbook.description,
              category: playbook.category,
              sessions: playbook.sessions ?? [],
              symbols: playbook.symbols ?? [],
              rr_min: playbook.rr_min ?? null,
              active: playbook.active,
              created_at: playbook.created_at,
              updated_at: playbook.updated_at,
              rules_count: playbook.playbook_rules?.[0]?.count ?? 0,
              confluences_count: playbook.playbook_confluences?.[0]?.count ?? 0,
            })) ?? []
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

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="h-10 w-full rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-neutral-200/70 bg-white/70 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60"
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
    <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-6xl">
        <PlaybookListClient initialPlaybooks={playbooks} initialError={error} />
      </div>
    </div>
  )
}
