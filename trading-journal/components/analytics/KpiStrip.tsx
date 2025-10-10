'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { KPIs } from '@/lib/analytics-selectors'
import { cn } from '@/lib/utils'

interface KpiStripProps {
  current: KPIs
  prior?: KPIs
}

interface KpiCardProps {
  label: string
  value: string | number
  delta?: number
  format?: 'number' | 'percent' | 'ratio'
  precision?: number
}

function KpiCard({ label, value, delta, format = 'number', precision = 2 }: KpiCardProps) {
  const hasDelta = delta !== undefined && !isNaN(delta) && isFinite(delta)
  const isPositive = hasDelta && delta > 0
  const isNegative = hasDelta && delta < 0

  const formatDelta = (d: number) => {
    if (format === 'percent') return `${(d * 100).toFixed(1)}%`
    if (format === 'ratio') return d.toFixed(precision)
    return d.toFixed(precision)
  }

  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {typeof value === 'number' ? value.toFixed(precision) : value}
        </div>
        {hasDelta && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isPositive && 'text-emerald-600 dark:text-emerald-400',
              isNegative && 'text-red-600 dark:text-red-400',
              !isPositive && !isNegative && 'text-slate-500 dark:text-slate-400'
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            <span>{formatDelta(Math.abs(delta))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function KpiStrip({ current, prior }: KpiStripProps) {
  // Safety check
  if (!current || current.n === undefined) {
    return null
  }

  const kpis = [
    {
      label: 'Trades',
      value: current.n ?? 0,
      delta: prior ? current.n - prior.n : undefined,
      format: 'number' as const,
      precision: 0,
    },
    {
      label: 'Win Rate',
      value: `${((current.winRate ?? 0) * 100).toFixed(1)}%`,
      delta: prior ? current.winRate - prior.winRate : undefined,
      format: 'percent' as const,
    },
    {
      label: 'Profit Factor (R)',
      value: (current.pfR ?? 0) > 99 ? '∞' : (current.pfR ?? 0).toFixed(2),
      delta:
        prior && (current.pfR ?? 0) < 99 && (prior.pfR ?? 0) < 99
          ? current.pfR - prior.pfR
          : undefined,
      format: 'ratio' as const,
    },
    {
      label: 'Expectancy (R)',
      value: (current.expectancyR ?? 0).toFixed(3),
      delta: prior ? current.expectancyR - prior.expectancyR : undefined,
      format: 'ratio' as const,
      precision: 3,
    },
    {
      label: 'Net R',
      value: (current.netR ?? 0).toFixed(2),
      delta: prior ? current.netR - prior.netR : undefined,
      format: 'ratio' as const,
    },
    {
      label: 'Max DD (R)',
      value: (current.maxDDR ?? 0).toFixed(2),
      delta: prior ? prior.maxDDR - current.maxDDR : undefined,
      format: 'ratio' as const,
    },
    {
      label: 'Recovery',
      value: (current.recovery ?? 0) > 99 ? '∞' : (current.recovery ?? 0).toFixed(2),
      delta:
        prior && (current.recovery ?? 0) < 99 && (prior.recovery ?? 0) < 99
          ? current.recovery - prior.recovery
          : undefined,
      format: 'ratio' as const,
    },
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        Key Performance Indicators
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
        Showing {current.n ?? 0} trades with {current.wins ?? 0} wins and {current.losses ?? 0} losses.
        {prior && ` Prior period: ${prior.n ?? 0} trades.`}
      </p>
    </div>
  )
}
