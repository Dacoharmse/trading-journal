'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, Archive, ArchiveRestore, Edit, Loader2, Trash2 } from 'lucide-react'
import type { Playbook } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface PlaybookSummary extends Playbook {
  rules_count: number
  confluences_count: number
}

interface PlaybookListClientProps {
  initialPlaybooks: PlaybookSummary[]
  initialError?: string | null
}

const categories = ['All', 'Breakout', 'Reversion', 'ICT', 'News', 'Other'] as const

type StatusFilter = 'active' | 'all'

export function PlaybookListClient({
  initialPlaybooks,
  initialError = null,
}: PlaybookListClientProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [playbooks, setPlaybooks] = React.useState(initialPlaybooks)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('active')
  const [categoryFilter, setCategoryFilter] = React.useState<(typeof categories)[number]>('All')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [actionStates, setActionStates] = React.useState<Record<string, boolean>>({})
  const [error, setError] = React.useState<string | null>(initialError)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [playbookToDelete, setPlaybookToDelete] = React.useState<PlaybookSummary | null>(null)

  const filteredPlaybooks = React.useMemo(() => {
    return playbooks.filter((playbook) => {
      const matchesSearch = playbook.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? playbook.active : true
      const matchesCategory =
        categoryFilter === 'All' ? true : playbook.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [playbooks, searchTerm, statusFilter, categoryFilter])

  const setActionLoading = (id: string, loading: boolean) => {
    setActionStates((prev) => {
      if (!loading) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: true }
    })
  }

  const handleToggleActive = async (playbook: PlaybookSummary) => {
    try {
      setActionLoading(playbook.id, true)
      setError(null)

      const { error: updateError } = await supabase
        .from('playbooks')
        .update({ active: !playbook.active })
        .eq('id', playbook.id)

      if (updateError) {
        throw updateError
      }

      setPlaybooks((prev) =>
        prev.map((item) =>
          item.id === playbook.id ? { ...item, active: !item.active } : item
        )
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to update playbook status right now.'
      setError(message)
      console.error('Failed to toggle playbook active state:', err)
    } finally {
      setActionLoading(playbook.id, false)
    }
  }

  const openDeleteDialog = (playbook: PlaybookSummary) => {
    setPlaybookToDelete(playbook)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!playbookToDelete) return

    try {
      setActionLoading(playbookToDelete.id, true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', playbookToDelete.id)

      if (deleteError) {
        throw deleteError
      }

      setPlaybooks((prev) => prev.filter((item) => item.id !== playbookToDelete.id))
      setDeleteDialogOpen(false)
      setPlaybookToDelete(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete playbook right now.'
      setError(message)
      console.error('Failed to delete playbook:', err)
    } finally {
      if (playbookToDelete) {
        setActionLoading(playbookToDelete.id, false)
      }
    }
  }

  const hasPlaybooks = filteredPlaybooks.length > 0

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
              Playbooks
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Capture the rules, confluences, and scoring rubric for each setup you trade.
            </p>
          </div>

          <Button asChild size="lg" className="sm:w-auto w-full sm:max-w-none">
            <Link href="/playbook/new">
              <Plus className="w-4 h-4" />
              New Playbook
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search playbooks"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as (typeof categories)[number])}
          >
            <SelectTrigger className="w-full lg:w-fit">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full lg:w-fit">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="all">All Playbooks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-300/40 dark:border-red-900/60">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasPlaybooks ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlaybooks.map((playbook) => {
            const isBusy = Boolean(actionStates[playbook.id])
            return (
              <Card
                key={playbook.id}
                className="border-slate-200/70 bg-white/70 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/60"
              >
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                        {playbook.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                      >
                        {playbook.category}
                      </Badge>
                    </div>
                    <Badge
                      className={cn(
                        'border px-2 py-1 text-xs font-medium',
                        playbook.active
                          ? 'border-emerald-300/60 bg-emerald-100/70 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'border-slate-300/60 bg-slate-100/60 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300'
                      )}
                    >
                      {playbook.active ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {playbook.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300/80 line-clamp-3">
                      {playbook.description}
                    </p>
                  )}

                  {playbook.sessions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {playbook.sessions.map((session) => (
                        <Badge
                          key={session}
                          variant="outline"
                          className="border-slate-300/60 bg-slate-100/40 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300"
                        >
                          {session}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex-col gap-4 border-t border-slate-200/70 py-4 dark:border-slate-800/60">
                  <div className="flex w-full items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {playbook.rules_count}
                      </span>{' '}
                      rules
                    </span>
                    <span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {playbook.confluences_count}
                      </span>{' '}
                      confluences
                    </span>
                  </div>

                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/playbook/${playbook.id}`}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        onClick={() => handleToggleActive(playbook)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : playbook.active ? (
                          <>
                            <Archive className="h-4 w-4" />
                            Archive
                          </>
                        ) : (
                          <>
                            <ArchiveRestore className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => openDeleteDialog(playbook)}
                      disabled={isBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300/70 p-12 text-center dark:border-slate-700/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {playbooks.length === 0 ? 'No playbooks yet' : 'No playbooks match your filters'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {playbooks.length === 0
              ? 'Create your first playbook to define rules and grading for your setups.'
              : 'Try adjusting your search or filters to see more results.'}
          </p>
          {playbooks.length === 0 && (
            <Button asChild className="mt-6">
              <Link href="/playbook/new">
                <Plus className="h-4 w-4" />
                Create Playbook
              </Link>
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playbook?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{playbookToDelete?.name}&quot;? This will permanently
              delete:
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>{playbookToDelete?.rules_count || 0} rules</li>
                <li>{playbookToDelete?.confluences_count || 0} confluences</li>
                <li>Associated scoring rubric</li>
              </ul>
              <p className="mt-3 font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Playbook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
