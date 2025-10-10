'use client'

import { Lightbulb } from 'lucide-react'

interface InsightsStripProps {
  insights: string[]
}

export function InsightsStrip({ insights }: InsightsStripProps) {
  if (insights.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/60 dark:bg-slate-900/60">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500 dark:text-amber-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Insights</h2>
      </div>

      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {i + 1}
            </span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
        Auto-generated insights from your trading data (minimum n=15).
      </p>
    </div>
  )
}
