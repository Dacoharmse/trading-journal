'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlaybookEditor } from '@/components/playbook/PlaybookEditor'
import type {
  Playbook,
  PlaybookRule,
  PlaybookConfluence,
  PlaybookRubric,
  Symbol,
} from '@/types/supabase'

export default function EditPlaybookPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const playbookId = params?.id

  const [userId, setUserId] = React.useState<string | null>(null)
  const [playbook, setPlaybook] = React.useState<Playbook | null>(null)
  const [rules, setRules] = React.useState<PlaybookRule[]>([])
  const [confluences, setConfluences] = React.useState<PlaybookConfluence[]>([])
  const [rubric, setRubric] = React.useState<PlaybookRubric | null>(null)
  const [symbols, setSymbols] = React.useState<Symbol[]>([])
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
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.replace('/auth/login')
          return
        }

        if (cancelled) return

        setUserId(userData.user.id)

        const [playbookRes, rulesRes, confRes, rubricRes, symbolsRes] = await Promise.all([
          supabase.from('playbooks').select('*').eq('id', playbookId).maybeSingle(),
          supabase
            .from('playbook_rules')
            .select('*')
            .eq('playbook_id', playbookId)
            .order('sort'),
          supabase
            .from('playbook_confluences')
            .select('*')
            .eq('playbook_id', playbookId)
            .order('sort'),
          supabase.from('playbook_rubric').select('*').eq('playbook_id', playbookId).maybeSingle(),
          supabase.from('symbols').select('id, code, display_name').order('code'),
        ])

        if (playbookRes.error) throw playbookRes.error
        if (!playbookRes.data) {
          setMissing(true)
          return
        }

        if (!cancelled) {
          setPlaybook(playbookRes.data as Playbook)
          setRules((rulesRes.data as PlaybookRule[] | null) ?? [])
          setConfluences((confRes.data as PlaybookConfluence[] | null) ?? [])
          setRubric((rubricRes.data as PlaybookRubric | null) ?? null)
          setSymbols((symbolsRes.data as Symbol[] | null) ?? [])
        }
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
  }, [playbookId, supabase, router])

  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-slate-200/70 dark:bg-slate-800/60" />
          <div className="h-32 rounded-lg bg-slate-200/70 dark:bg-slate-800/60" />
        </div>
      </div>
    )
  }

  if (missing || !userId || !playbook) {
    router.replace('/playbook')
    return null
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-5xl">
        <PlaybookEditor
          mode="edit"
          userId={userId}
          initialPlaybook={playbook}
          initialRules={rules}
          initialConfluences={confluences}
          initialRubric={rubric}
          symbols={symbols}
        />
      </div>
    </div>
  )
}
