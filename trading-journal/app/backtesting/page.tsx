'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Backtest } from '@/lib/backtest-selectors'
import { backtestKPIs } from '@/lib/backtest-selectors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Beaker, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface PlaybookWithStats {
  id: string
  name: string
  trade_type: string | null
  active: boolean
  backtestCount: number
  winRate: number
  expectancyR: number
  profitFactor: number
}

export default function BacktestingPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [playbooks, setPlaybooks] = React.useState<PlaybookWithStats[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [playbookToDelete, setPlaybookToDelete] = React.useState<PlaybookWithStats | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const [playbooksRes, backtestsRes] = await Promise.all([
          supabase.from('playbooks').select('id, name, trade_type, active'),
          supabase.from('backtests').select('*'),
        ])

        if (!cancelled) {
          const playbooksData = playbooksRes.data as Array<{
            id: string
            name: string
            trade_type: string | null
            active: boolean
          }> | null

          const backtestsData = (backtestsRes.data as Backtest[]) ?? []

          const playbooksWithStats: PlaybookWithStats[] =
            playbooksData?.map((pb) => {
              const pbBacktests = backtestsData.filter((bt) => bt.playbook_id === pb.id)
              const kpis = backtestKPIs(pbBacktests)

              return {
                id: pb.id,
                name: pb.name,
                trade_type: pb.trade_type,
                active: pb.active,
                backtestCount: kpis.n,
                winRate: kpis.winRate,
                expectancyR: kpis.expectancyR,
                profitFactor: kpis.pfR,
              }
            }) ?? []

          setPlaybooks(playbooksWithStats)
        }
      } catch (error) {
        console.error('Failed to load backtesting data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const [playbooksRes, backtestsRes] = await Promise.all([
        supabase.from('playbooks').select('id, name, trade_type, active'),
        supabase.from('backtests').select('*'),
      ])

      const playbooksData = playbooksRes.data as Array<{
        id: string
        name: string
        trade_type: string | null
        active: boolean
      }> | null

      const backtestsData = (backtestsRes.data as Backtest[]) ?? []

      const playbooksWithStats: PlaybookWithStats[] =
        playbooksData?.map((pb) => {
          const pbBacktests = backtestsData.filter((bt) => bt.playbook_id === pb.id)
          const kpis = backtestKPIs(pbBacktests)

          return {
            id: pb.id,
            name: pb.name,
            trade_type: pb.trade_type,
            active: pb.active,
            backtestCount: kpis.n,
            winRate: kpis.winRate,
            expectancyR: kpis.expectancyR,
            profitFactor: kpis.pfR,
          }
        }) ?? []

      setPlaybooks(playbooksWithStats)
    } catch (error) {
      console.error('Failed to load backtesting data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const openDeleteDialog = React.useCallback((playbook: PlaybookWithStats) => {
    setPlaybookToDelete(playbook)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteSession = React.useCallback(async () => {
    if (!playbookToDelete) return

    setIsDeleting(true)
    try {
      // Delete all backtests for this playbook
      const { error: deleteError } = await supabase
        .from('backtests')
        .delete()
        .eq('playbook_id', playbookToDelete.id)

      if (deleteError) throw deleteError

      setDeleteDialogOpen(false)
      setPlaybookToDelete(null)
      await loadData()
    } catch (error) {
      console.error('Failed to delete backtest session:', error)
      alert('Failed to delete backtest session. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [playbookToDelete, supabase, loadData])

  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Beaker className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                Backtesting Lab
              </h1>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Validate and quantify your playbook strategies before going live
            </p>
          </div>
        </div>

        {playbooks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Beaker className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
              <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                No playbooks yet
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Create a playbook first to start backtesting
              </p>
              <Button asChild className="mt-6">
                <Link href="/playbook/new">
                  <Plus className="h-4 w-4" />
                  Create Playbook
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playbooks.map((playbook) => (
              <Card
                key={playbook.id}
                className="border-neutral-200/70 bg-white/80 backdrop-blur transition-shadow hover:shadow-lg dark:border-neutral-800/60 dark:bg-neutral-900/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{playbook.name}</CardTitle>
                      {playbook.trade_type && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {playbook.trade_type}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      className={cn(
                        playbook.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      )}
                    >
                      {playbook.active ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {playbook.backtestCount > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Trades
                          </div>
                          <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                            {playbook.backtestCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Win Rate
                          </div>
                          <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                            {(playbook.winRate * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Expectancy
                          </div>
                          <div
                            className={cn(
                              'text-lg font-semibold',
                              playbook.expectancyR > 0
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-red-700 dark:text-red-300'
                            )}
                          >
                            {playbook.expectancyR > 0 ? '+' : ''}
                            {playbook.expectancyR.toFixed(3)}R
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Profit Factor
                          </div>
                          <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                            {playbook.profitFactor > 99 ? '∞' : playbook.profitFactor.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/backtesting/${playbook.id}`}>View Results</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            openDeleteDialog(playbook)
                          }}
                          disabled={isDeleting}
                          title="Delete all backtests for this playbook"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No backtests yet
                      </p>
                      <Button asChild className="mt-4" size="sm">
                        <Link href={`/backtesting/${playbook.id}`}>
                          <Plus className="h-4 w-4" />
                          Start Testing
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Session Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backtest Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL backtests for{' '}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {playbookToDelete?.name}
              </span>
              ?
              {playbookToDelete && playbookToDelete.backtestCount > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                    ⚠️ Warning: This will permanently delete:
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-800 dark:text-red-400">
                    <li>{playbookToDelete.backtestCount} backtested trades</li>
                    <li>All performance metrics and statistics</li>
                    <li>All charts and images</li>
                    <li>All notes and analysis</li>
                  </ul>
                  <p className="mt-2 text-xs text-red-700 dark:text-red-500">
                    The playbook itself will not be deleted, only the backtest data.
                  </p>
                </div>
              )}
              <p className="mt-3 font-bold text-destructive">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
