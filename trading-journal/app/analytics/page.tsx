'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types/supabase'
import {
  selectTradesInScope,
  trimOutliersR,
  kpisR,
  priorPeriodRange,
  groupByDOW,
  hourSessionMatrix,
  bySymbol,
  byPlaybookGrade,
  histR,
  histMae,
  histMfe,
  histHold,
  holdVsR,
  autoInsights,
} from '@/lib/analytics-selectors'
import { KpiStrip } from '@/components/analytics/KpiStrip'
import { ExpectancyLadder } from '@/components/analytics/ExpectancyLadder'
import { BreakdownByDOW } from '@/components/analytics/BreakdownByDOW'
import { HourSessionHeatmap } from '@/components/analytics/HourSessionHeatmap'
import { SymbolPerformance } from '@/components/analytics/SymbolPerformance'
import { PlaybookGradeChart } from '@/components/analytics/PlaybookGradeChart'
import { Distributions } from '@/components/analytics/Distributions'
import { HoldTimeVsRScatter } from '@/components/analytics/HoldTimeVsRScatter'
import { OutlierToggle } from '@/components/analytics/OutlierToggle'
import { InsightsStrip } from '@/components/analytics/InsightsStrip'
import { TradeTypePerformance } from '@/components/analytics/TradeTypePerformance'
import type { Playbook } from '@/types/supabase'

export default function AnalyticsPage() {
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [rawTrades, setRawTrades] = React.useState<Trade[]>([])
  const [playbooks, setPlaybooks] = React.useState<Array<{ id: string; name: string; trade_type?: Playbook['trade_type'] }>>([])
  const [outlierToggle, setOutlierToggle] = React.useState(false)

  // Filters - using simple defaults for now (can integrate with Zustand later)
  const [filters] = React.useState({
    dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  })

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        let user = session?.user ?? null
        if (!user) {
          const { data: { user: u } } = await supabase.auth.getUser()
          user = u ?? null
        }
        if (!user) return

        const [tradesRes, playbooksRes] = await Promise.all([
          supabase
            .from('trades')
            .select('*')
            .gte('exit_date', filters.dateFrom)
            .order('exit_date', { ascending: false }),
          supabase.from('playbooks').select('id, name, trade_type'),
        ])

        if (!cancelled) {
          // Normalize trades: backfill r_multiple from actual_rr, compute hold_mins from open/close time
          const trades = ((tradesRes.data as Trade[]) ?? []).map(t => {
            const rMultiple = t.r_multiple ?? (t as any).actual_rr ?? null
            let holdMins = t.hold_mins ?? null
            if (holdMins == null && t.open_time && t.close_time) {
              const entryDateStr = t.entry_date.split('T')[0]
              const exitDateStr = (t.exit_date || t.closed_at || t.entry_date).split('T')[0]
              const entry = new Date(`${entryDateStr}T${t.open_time}`)
              const exit = new Date(`${exitDateStr}T${t.close_time}`)
              holdMins = Math.max(0, (exit.getTime() - entry.getTime()) / (1000 * 60))
            }
            return { ...t, r_multiple: rMultiple, hold_mins: holdMins }
          })
          setRawTrades(trades)
          setPlaybooks((playbooksRes.data as Array<{ id: string; name: string }>) ?? [])
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase, filters.dateFrom, filters.dateTo])

  // Compute scoped and trimmed trades
  const scopedTrades = React.useMemo(() => {
    return selectTradesInScope(rawTrades, filters)
  }, [rawTrades, filters])

  const workingTrades = React.useMemo(() => {
    return outlierToggle ? trimOutliersR(scopedTrades) : scopedTrades
  }, [scopedTrades, outlierToggle])

  const trimmedCount = scopedTrades.length - workingTrades.length

  // Compute current and prior KPIs
  const currentKpis = React.useMemo(() => kpisR(workingTrades), [workingTrades])

  const priorKpis = React.useMemo(() => {
    const priorRange = priorPeriodRange({
      from: filters.dateFrom,
      to: filters.dateTo,
    })
    const priorTrades = selectTradesInScope(rawTrades, {
      dateFrom: priorRange.from,
      dateTo: priorRange.to,
    })
    return kpisR(priorTrades)
  }, [rawTrades, filters.dateFrom, filters.dateTo])

  // Compute all analytics data
  const dowData = React.useMemo(() => groupByDOW(workingTrades), [workingTrades])
  const hourSessionData = React.useMemo(
    () => hourSessionMatrix(workingTrades),
    [workingTrades]
  )
  const symbolData = React.useMemo(() => bySymbol(workingTrades), [workingTrades])
  const gradeData = React.useMemo(
    () => byPlaybookGrade(workingTrades, playbooks),
    [workingTrades, playbooks]
  )
  const rHistData = React.useMemo(() => histR(workingTrades), [workingTrades])
  const maeHistData = React.useMemo(() => histMae(workingTrades), [workingTrades])
  const mfeHistData = React.useMemo(() => histMfe(workingTrades), [workingTrades])
  const holdHistData = React.useMemo(() => histHold(workingTrades), [workingTrades])
  const scatterData = React.useMemo(
    () => holdVsR(workingTrades, playbooks),
    [workingTrades, playbooks]
  )
  const insights = React.useMemo(() => autoInsights(workingTrades), [workingTrades])

  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 p-6 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60" />
          <div className="grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-neutral-200/70 dark:bg-neutral-800/60"
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
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
            Analytics
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Comprehensive performance analysis and insights across all metrics
          </p>
        </div>

        {/* Outlier Toggle */}
        <OutlierToggle
          enabled={outlierToggle}
          onChange={setOutlierToggle}
          trimmedCount={trimmedCount}
          totalCount={scopedTrades.length}
        />

        {/* KPI Strip */}
        <KpiStrip current={currentKpis} prior={priorKpis} />

        {/* Expectancy Ladder + Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ExpectancyLadder kpis={currentKpis} />
          <InsightsStrip insights={insights} />
        </div>

        {/* Breakdowns */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BreakdownByDOW data={dowData} />
          <HourSessionHeatmap data={hourSessionData} />
        </div>

        {/* Symbol + Grade Performance */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SymbolPerformance data={symbolData} />
          <PlaybookGradeChart data={gradeData} />
        </div>

        {/* Trade Type Performance (Continuations vs Reversals, Buy vs Sell) */}
        <TradeTypePerformance trades={workingTrades} playbooks={playbooks} />

        {/* Distributions */}
        <Distributions
          rHist={rHistData}
          maeHist={maeHistData}
          mfeHist={mfeHistData}
          holdHist={holdHistData}
        />

        {/* Scatter */}
        <HoldTimeVsRScatter data={scatterData} />
      </div>
    </div>
  )
}
