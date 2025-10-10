'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlaybookEditor } from '@/components/playbook/PlaybookEditor'
import type { Symbol } from '@/types/supabase'

export default function NewPlaybookPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()

  const [userId, setUserId] = React.useState<string | null>(null)
  const [symbols, setSymbols] = React.useState<Symbol[]>([])
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

        if (cancelled) return

        setUserId(userData.user.id)

        const { data: symbolsData, error: symbolsError } = await supabase
          .from('symbols')
          .select('id, code, display_name')
          .order('code')

        if (symbolsError) {
          console.error('Failed to load symbols for playbook editor:', symbolsError)
        }

        if (!cancelled) {
          setSymbols((symbolsData as Symbol[] | null) ?? [])
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
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-slate-200/70 dark:bg-slate-800/60" />
          <div className="h-32 rounded-lg bg-slate-200/70 dark:bg-slate-800/60" />
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-5xl">
        <PlaybookEditor
          mode="create"
          userId={userId}
          initialPlaybook={null}
          initialRules={[]}
          initialConfluences={[]}
          initialRubric={null}
          symbols={symbols}
        />
      </div>
    </div>
  )
}
