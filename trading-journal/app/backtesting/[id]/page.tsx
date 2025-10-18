'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { Backtest } from '@/lib/backtest-selectors'
import type { PlaybookRule, PlaybookConfluence, PlaybookRubric, Playbook } from '@/types/supabase'
import {
  backtestKPIs,
  groupBySession,
  groupBySymbol,
  groupByGrade,
  equityCurve,
  autoInsightsBacktest,
} from '@/lib/backtest-selectors'
import { BacktestEntryModal } from '@/components/backtesting/BacktestEntryModal'
import { EquityCurveChart } from '@/components/backtesting/EquityCurveChart'
import { ProfitableWeekdays } from '@/components/backtesting/ProfitableWeekdays'
import { RecommendedMetrics } from '@/components/backtesting/RecommendedMetrics'
import { TradesOverview } from '@/components/backtesting/TradesOverview'
import { KpiStrip } from '@/components/analytics/KpiStrip'
import { SymbolPerformance } from '@/components/analytics/SymbolPerformance'
import { PlaybookGradeChart } from '@/components/analytics/PlaybookGradeChart'
import { InsightsStrip } from '@/components/analytics/InsightsStrip'
import { cn } from '@/lib/utils'

export default function BacktestDetailPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const playbookId = params?.id

  const [loading, setLoading] = React.useState(true)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [playbook, setPlaybook] = React.useState<Playbook | null>(null)
  const [backtests, setBacktests] = React.useState<Backtest[]>([])
  const [rules, setRules] = React.useState<PlaybookRule[]>([])
  const [confluences, setConfluences] = React.useState<PlaybookConfluence[]>([])
  const [rubric, setRubric] = React.useState<PlaybookRubric | null>(null)
  const [symbols, setSymbols] = React.useState<string[]>([])
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingBacktest, setEditingBacktest] = React.useState<Backtest | null>(null)
  const [activeTab, setActiveTab] = React.useState<'analytics' | 'trades'>('analytics')
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [backtestToDelete, setBacktestToDelete] = React.useState<Backtest | null>(null)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [shouldRedirect, setShouldRedirect] = React.useState(false)

  const loadData = React.useCallback(async () => {
    if (!playbookId) return

    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.replace('/auth/login')
        return
      }

      setUserId(userData.user.id)

      const [playbookRes, backtestsRes, rulesRes, confRes, rubricRes, symbolsRes] =
        await Promise.all([
          supabase.from('playbooks').select('*').eq('id', playbookId).maybeSingle(),
          supabase.from('backtests').select('*').eq('playbook_id', playbookId).order('entry_date'),
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
          supabase.from('symbols').select('code').order('code'),
        ])

      setPlaybook((playbookRes.data as Playbook | null) ?? null)
      setBacktests((backtestsRes.data as Backtest[]) ?? [])
      setRules((rulesRes.data as PlaybookRule[]) ?? [])
      setConfluences((confRes.data as PlaybookConfluence[]) ?? [])
      setSymbols((symbolsRes.data?.map((s) => s.code) as string[]) ?? [])

      // If playbook exists but rubric doesn't, create a default rubric
      if (playbookRes.data && !rubricRes.data) {
        const defaultRubric = {
          playbook_id: playbookId,
          weight_rules: 0.5,
          weight_confluences: 0.2,
          weight_checklist: 0.3,
          must_rule_penalty: 0.4,
          min_checks: 0,
          grade_cutoffs: { 'A+': 0.95, 'A': 0.90, 'B': 0.80, 'C': 0.70, 'D': 0.60 },
        }

        // Use upsert instead of insert to avoid RLS issues
        const { data: newRubric, error: rubricCreateError } = await supabase
          .from('playbook_rubric')
          .upsert(defaultRubric)
          .select()
          .single()

        if (!rubricCreateError && newRubric) {
          setRubric(newRubric as PlaybookRubric)
        } else {
          console.error('Failed to create default rubric:', rubricCreateError)
          // Even if rubric creation fails, don't redirect - just log and continue
          // The page will show an error state but won't crash
          setRubric(defaultRubric as PlaybookRubric)
        }
      } else {
        setRubric((rubricRes.data as PlaybookRubric | null) ?? null)
      }

      // Check if we should redirect after data is loaded
      if (!playbookRes.data) {
        setShouldRedirect(true)
      }
    } catch (error) {
      console.error('Failed to load backtest data:', error)
      setShouldRedirect(true)
    } finally {
      setLoading(false)
    }
  }, [playbookId, supabase, router])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  // Redirect if playbook not found after loading is complete
  React.useEffect(() => {
    if (shouldRedirect && !loading) {
      router.replace('/backtesting')
    }
  }, [shouldRedirect, loading, router])

  const kpis = React.useMemo(() => backtestKPIs(backtests), [backtests])
  const sessionMetrics = React.useMemo(() => groupBySession(backtests), [backtests])
  const symbolMetrics = React.useMemo(() => groupBySymbol(backtests), [backtests])
  const gradeMetrics = React.useMemo(() => groupByGrade(backtests), [backtests])
  const equity = React.useMemo(() => equityCurve(backtests), [backtests])
  const insights = React.useMemo(() => autoInsightsBacktest(backtests), [backtests])

  const handleEdit = React.useCallback((backtest: Backtest) => {
    setEditingBacktest(backtest)
    setModalOpen(true)
  }, [])

  const openDeleteDialog = React.useCallback((backtest: Backtest) => {
    setBacktestToDelete(backtest)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!backtestToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('backtests').delete().eq('id', backtestToDelete.id)
      if (error) throw error
      setDeleteDialogOpen(false)
      setBacktestToDelete(null)
      await loadData()
    } catch (error) {
      console.error('Failed to delete backtest:', error)
      alert('Failed to delete backtest. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [backtestToDelete, supabase, loadData])

  const handleDeleteAll = React.useCallback(async () => {
    if (!playbookId) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('backtests').delete().eq('playbook_id', playbookId)
      if (error) throw error
      setDeleteAllDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('Failed to delete all backtests:', error)
      alert('Failed to delete all backtests. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [playbookId, supabase, loadData])

  const handleModalClose = React.useCallback(() => {
    setModalOpen(false)
    setEditingBacktest(null)
  }, [])

  if (loading || !playbook || !userId || !rubric) {
    return (
      <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-7xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="h-32 rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Link
                href="/backtesting"
                className="inline-flex items-center gap-1 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Lab
              </Link>
            </div>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
              {playbook.name}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{playbook.category}</Badge>
              {backtests.length > 0 && (
                <Badge variant="outline">{backtests.length} backtests</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {backtests.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            )}
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Backtest
            </Button>
          </div>
        </div>

        {backtests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              No backtests yet
            </h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Add your first backtested trade to start validating this playbook
            </p>
            <Button onClick={() => setModalOpen(true)} className="mt-6">
              <Plus className="h-4 w-4" />
              Add Backtest
            </Button>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 rounded-lg border border-neutral-200/70 bg-white/80 p-1 dark:border-neutral-800/60 dark:bg-neutral-900/60">
              <button
                onClick={() => setActiveTab('analytics')}
                className={cn(
                  'flex-1 rounded px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === 'analytics'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                )}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={cn(
                  'flex-1 rounded px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === 'trades'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                )}
              >
                Trades Overview
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'analytics' ? (
              <>
                {/* KPIs */}
                <KpiStrip current={kpis} />

            {/* Equity Curve */}
            <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Equity Curve
              </h2>
              <EquityCurveChart data={equity} />
            </div>

            {/* Recommended Metrics */}
            <RecommendedMetrics backtests={backtests} />

            {/* Insights */}
            {insights.length > 0 && <InsightsStrip insights={insights} />}

            {/* Profitable Weekdays */}
            <ProfitableWeekdays backtests={backtests} />

            {/* Session Breakdown */}
            <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Session Performance
              </h2>
              <div className="space-y-3">
                {sessionMetrics.map((metric) => {
                  const maxExpectancy = Math.max(...sessionMetrics.map((m) => Math.abs(m.expectancyR)), 0.01)
                  const barWidth = (Math.abs(metric.expectancyR) / maxExpectancy) * 100
                  const isPositive = metric.expectancyR > 0

                  return (
                    <div key={metric.session} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-700 dark:text-neutral-200">
                            {metric.session}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            n={metric.n}
                          </Badge>
                        </div>
                        <span
                          className={cn(
                            'font-semibold',
                            isPositive
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-red-700 dark:text-red-300'
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {metric.expectancyR.toFixed(3)}R
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className={cn(
                            'h-full transition-all',
                            isPositive
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-red-500 dark:bg-red-400'
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Symbol + Grade */}
            <div className="grid gap-6 lg:grid-cols-2">
              <SymbolPerformance data={symbolMetrics} />
              <PlaybookGradeChart data={gradeMetrics} />
            </div>

            {/* Trades Table */}
            <div className="rounded-lg border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                All Backtests
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Symbol</th>
                      <th className="p-2 text-left">Session</th>
                      <th className="p-2 text-left">Direction</th>
                      <th className="p-2 text-right">Grade</th>
                      <th className="p-2 text-right">Result (R)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtests.map((bt) => (
                      <tr
                        key={bt.id}
                        className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                      >
                        <td className="p-2">{bt.entry_date}</td>
                        <td className="p-2 font-medium">{bt.symbol}</td>
                        <td className="p-2 text-neutral-600 dark:text-neutral-400">
                          {bt.session || '—'}
                        </td>
                        <td className="p-2">
                          <Badge variant={bt.direction === 'long' ? 'default' : 'secondary'}>
                            {bt.direction}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          {bt.setup_grade && <Badge>{bt.setup_grade}</Badge>}
                        </td>
                        <td
                          className={cn(
                            'p-2 text-right font-semibold',
                            bt.result_r > 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-red-700 dark:text-red-300'
                          )}
                        >
                          {bt.result_r > 0 ? '+' : ''}
                          {bt.result_r.toFixed(2)}R
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            ) : (
              /* Trades Overview Tab */
              <TradesOverview backtests={backtests} onEdit={handleEdit} onDelete={openDeleteDialog} />
            )}
          </>
        )}
      </div>

      <BacktestEntryModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={loadData}
        playbookId={playbookId}
        userId={userId}
        rules={rules}
        confluences={confluences}
        rubric={rubric}
        symbols={symbols}
        editingBacktest={editingBacktest}
      />

      {/* Delete Single Backtest Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backtest?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backtest?
              {backtestToDelete && (
                <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {backtestToDelete.symbol}
                      </span>{' '}
                      <span className="text-neutral-600 dark:text-neutral-400">
                        ({backtestToDelete.direction})
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(backtestToDelete.entry_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div
                      className={cn(
                        'text-sm font-semibold',
                        backtestToDelete.result_r > 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-red-700 dark:text-red-300'
                      )}
                    >
                      {backtestToDelete.result_r > 0 ? '+' : ''}
                      {backtestToDelete.result_r.toFixed(2)}R
                    </div>
                  </div>
                </div>
              )}
              <p className="mt-3 font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Backtest'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Backtests Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Backtests?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL {backtests.length} backtests for this playbook?
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                  ⚠️ Warning: This will permanently delete:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-800 dark:text-red-400">
                  <li>{backtests.length} backtested trades</li>
                  <li>All charts and images</li>
                  <li>All notes and performance data</li>
                </ul>
              </div>
              <p className="mt-3 font-bold text-destructive">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete All Backtests'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
