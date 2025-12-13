'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, Archive, ArchiveRestore, Edit, Loader2, Trash2, Eye } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlaybookMiniDashboard, type PlaybookStats } from './PlaybookMiniDashboard'
import { PreviewPanel } from './PreviewPanel'

export interface PlaybookSummary extends Playbook {
  rules_count: number
  confluences_count: number
  stats?: PlaybookStats | null
  example_image_url?: string | null
}

interface PlaybookListClientProps {
  initialPlaybooks: PlaybookSummary[]
  initialError?: string | null
}

type StatusFilter = 'active' | 'all'

export function PlaybookListClient({
  initialPlaybooks,
  initialError = null,
}: PlaybookListClientProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [playbooks, setPlaybooks] = React.useState(initialPlaybooks)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('active')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [actionStates, setActionStates] = React.useState<Record<string, boolean>>({})
  const [error, setError] = React.useState<string | null>(initialError)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [playbookToDelete, setPlaybookToDelete] = React.useState<PlaybookSummary | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [playbookToView, setPlaybookToView] = React.useState<PlaybookSummary | null>(null)
  const [viewData, setViewData] = React.useState<any>(null)
  const [loadingView, setLoadingView] = React.useState(false)

  const filteredPlaybooks = React.useMemo(() => {
    return playbooks.filter((playbook) => {
      const matchesSearch = playbook.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? playbook.active : true

      return matchesSearch && matchesStatus
    })
  }, [playbooks, searchTerm, statusFilter])

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

  const openViewDialog = async (playbook: PlaybookSummary) => {
    setPlaybookToView(playbook)
    setViewDialogOpen(true)
    setLoadingView(true)

    try {
      const [rulesRes, confRes, examplesRes, rubricRes, detailsRes] = await Promise.all([
        supabase
          .from('playbook_rules')
          .select('*')
          .eq('playbook_id', playbook.id)
          .order('sort'),
        supabase
          .from('playbook_confluences')
          .select('*')
          .eq('playbook_id', playbook.id)
          .order('sort'),
        supabase
          .from('playbook_examples')
          .select('*')
          .eq('playbook_id', playbook.id)
          .order('sort'),
        supabase.from('playbook_rubric').select('*').eq('playbook_id', playbook.id).maybeSingle(),
        supabase
          .from('playbook_trade_details')
          .select('*')
          .eq('playbook_id', playbook.id)
          .order('sort'),
      ])

      setViewData({
        rules: rulesRes.data || [],
        confluences: confRes.data || [],
        examples: examplesRes.data || [],
        rubric: rubricRes.data || null,
        tradeDetails: detailsRes.data || [],
      })
    } catch (err) {
      console.error('Failed to load playbook details:', err)
    } finally {
      setLoadingView(false)
    }
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
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
              Playbooks
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -tranneutral-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search playbooks"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
            />
          </div>

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
                className="border-neutral-200/70 bg-white dark:border-neutral-800/60 dark:bg-black"
              >
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xl text-neutral-900 dark:text-neutral-100">
                      {playbook.name}
                    </CardTitle>
                    <Badge
                      className={cn(
                        'border px-2 py-1 text-xs font-medium flex-shrink-0',
                        playbook.active
                          ? 'border-emerald-300/60 bg-emerald-100/70 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'border-neutral-300/60 bg-neutral-100/60 text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-900/40 dark:text-neutral-300'
                      )}
                    >
                      {playbook.active ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                </CardHeader>

                {playbook.example_image_url && (
                  <div className="relative aspect-video w-full overflow-hidden border-y border-neutral-200/70 dark:border-neutral-800/60">
                    <img
                      src={playbook.example_image_url}
                      alt={`${playbook.name} example`}
                      className="h-full w-full object-cover"
                    />
                    {playbook.trade_type && (
                      <div className="absolute bottom-3 right-3">
                        <div
                          className={cn(
                            'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-bold capitalize shadow-xl border-2',
                            playbook.trade_type === 'continuation'
                              ? 'bg-blue-600 text-white border-blue-400'
                              : 'bg-purple-600 text-white border-purple-400'
                          )}
                        >
                          {playbook.trade_type}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <CardContent className="space-y-4">
                  {playbook.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300/80 line-clamp-2">
                      {playbook.description}
                    </p>
                  )}

                  {/* Mini Dashboard Stats */}
                  <PlaybookMiniDashboard stats={playbook.stats || null} compact />

                  {playbook.sessions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {playbook.sessions.map((session) => (
                        <Badge
                          key={session}
                          variant="outline"
                          className="border-neutral-300/60 bg-neutral-100/40 text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-900/40 dark:text-neutral-300"
                        >
                          {session}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex-col gap-4 border-t border-neutral-200/70 py-4 dark:border-neutral-800/60">
                  <div className="flex w-full items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                        {playbook.rules_count}
                      </span>{' '}
                      rules
                    </span>
                    <span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                        {playbook.confluences_count}
                      </span>{' '}
                      confluences
                    </span>
                  </div>

                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => openViewDialog(playbook)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>

                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/playbook/${playbook.id}`}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                    </div>

                    <div className="flex w-full items-center gap-2">
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

                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => openDeleteDialog(playbook)}
                        disabled={isBusy}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300/70 p-12 text-center dark:border-neutral-700/60">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {playbooks.length === 0 ? 'No playbooks yet' : 'No playbooks match your filters'}
          </h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
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
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Are you sure you want to delete &quot;{playbookToDelete?.name}&quot;? This will permanently
                  delete:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>{playbookToDelete?.rules_count || 0} rules</li>
                  <li>{playbookToDelete?.confluences_count || 0} confluences</li>
                  <li>Associated scoring rubric</li>
                </ul>
                <p className="mt-3 font-semibold text-destructive">
                  This action cannot be undone.
                </p>
              </div>
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

      {/* View Playbook Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {playbookToView?.name || 'Playbook Details'}
                  </DialogTitle>
                  {playbookToView?.trade_type && (
                    <Badge
                      className={cn(
                        'mt-2 capitalize font-semibold',
                        playbookToView.trade_type === 'continuation'
                          ? 'bg-blue-600 text-white'
                          : 'bg-purple-600 text-white'
                      )}
                    >
                      {playbookToView.trade_type}
                    </Badge>
                  )}
                </div>
                {playbookToView?.sessions && playbookToView.sessions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {playbookToView.sessions.map((session) => (
                      <Badge key={session} variant="outline" className="text-xs">
                        {session}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingView ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
                </div>
              ) : playbookToView && viewData ? (
                <div className="space-y-8">
                  {/* Description */}
                  {playbookToView.description && (
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Description</h3>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {playbookToView.description}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  {playbookToView.stats && (
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-black">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Performance Metrics</h3>
                      <PlaybookMiniDashboard stats={playbookToView.stats} compact />
                    </div>
                  )}

                  {/* Examples */}
                  {viewData.examples && viewData.examples.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Example Charts</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {viewData.examples.map((example: any, idx: number) => (
                          <div key={example.id || idx} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-black">
                            {example.media_urls && example.media_urls.length > 0 && (
                              <img
                                src={example.media_urls[0]}
                                alt={`Example ${idx + 1}`}
                                className="w-full aspect-video object-cover"
                              />
                            )}
                            {example.caption && (
                              <div className="p-3">
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">{example.caption}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trade Details - Grouped by Type */}
                  {viewData.tradeDetails && viewData.tradeDetails.length > 0 && (() => {
                    const detailsByType = viewData.tradeDetails.reduce((acc: any, detail: any) => {
                      const type = detail.type || 'other'
                      if (!acc[type]) acc[type] = []
                      acc[type].push(detail)
                      return acc
                    }, {})

                    const typeOrder = ['detail', 'invalidation', 'consideration', 'checklist', 'other']
                    const typeLabels: any = {
                      detail: 'Trade Details',
                      invalidation: 'Invalidations',
                      consideration: 'Considerations',
                      checklist: 'Checklist',
                      other: 'Other'
                    }

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {typeOrder.map(type => {
                          if (!detailsByType[type] || detailsByType[type].length === 0) return null

                          return (
                            <div key={type}>
                              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                                {typeLabels[type]}
                              </h3>
                              <div className="space-y-3">
                                {detailsByType[type].map((detail: any) => (
                                  <div
                                    key={detail.id}
                                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className={cn(
                                        "flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full",
                                        detail.primary_item ? "bg-amber-500" : "bg-neutral-400"
                                      )} />
                                      <div className="flex-1 min-w-0">
                                        {detail.primary_item && (
                                          <Badge className="text-xs bg-amber-500 text-white mb-1.5">Primary</Badge>
                                        )}
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{detail.label}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Rules & Confluences */}
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-black">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Setup Grading</h3>
                    <PreviewPanel
                      rules={viewData.rules}
                      confluences={viewData.confluences}
                      rubric={viewData.rubric}
                    />
                  </div>

                  {/* Additional Info */}
                  {(playbookToView.symbols && playbookToView.symbols.length > 0) || playbookToView.rr_min || playbookToView.notes_md && (
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Additional Information</h3>
                      <div className="space-y-3">
                        {playbookToView.symbols && playbookToView.symbols.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">Symbols</p>
                            <div className="flex flex-wrap gap-2">
                              {playbookToView.symbols.map((symbol) => (
                                <Badge key={symbol} variant="outline" className="text-xs">
                                  {symbol}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {playbookToView.rr_min && (
                          <div>
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Minimum R:R</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">{playbookToView.rr_min}</p>
                          </div>
                        )}
                        {playbookToView.notes_md && (
                          <div>
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notes</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{playbookToView.notes_md}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
