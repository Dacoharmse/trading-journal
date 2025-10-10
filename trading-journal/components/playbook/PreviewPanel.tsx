'use client'

import * as React from 'react'
import { CheckSquare, Square, RefreshCcw } from 'lucide-react'
import type { PlaybookRubric } from '@/types/supabase'
import type { RuleDraft, ConfluenceDraft } from './types'
import {
  scoreSetup,
  getGradeColor,
  formatScore,
  getDefaultRubric,
} from '@/lib/playbook-scoring'
import { Button } from '@/components/ui/button'

interface PreviewPanelProps {
  rules: RuleDraft[]
  confluences: ConfluenceDraft[]
  rubric: PlaybookRubric | null
}

export function PreviewPanel({ rules, confluences, rubric }: PreviewPanelProps) {
  const effectiveRubric = rubric ?? getDefaultRubric()

  const [rulesChecked, setRulesChecked] = React.useState<Record<string, boolean>>({})
  const [confChecked, setConfChecked] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    setRulesChecked((prev) => {
      const next: Record<string, boolean> = {}
      for (const rule of rules) {
        next[rule.id] = prev[rule.id] ?? false
      }
      return next
    })
  }, [rules])

  React.useEffect(() => {
    setConfChecked((prev) => {
      const next: Record<string, boolean> = {}
      for (const confluence of confluences) {
        next[confluence.id] = prev[confluence.id] ?? false
      }
      return next
    })
  }, [confluences])

  const scoreResult = React.useMemo(
    () =>
      scoreSetup({
        rules: rules.map((rule) => ({
          id: rule.id,
          type: rule.type,
          weight: rule.weight,
        })),
        rulesChecked,
        confluences: confluences.map((conf) => ({
          id: conf.id,
          weight: conf.weight,
          primary: conf.primary_confluence,
        })),
        confChecked,
        rubric: effectiveRubric,
      }),
    [rules, confluences, rulesChecked, confChecked, effectiveRubric]
  )

  const resetSelections = () => {
    setRulesChecked({})
    setConfChecked({})
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/60 dark:bg-slate-900/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Preview Grade</p>
            <div className="mt-2 flex items-center gap-4">
              <div
                className={`rounded-full border px-5 py-2 text-2xl font-semibold ${getGradeColor(
                  scoreResult.grade
                )}`}
              >
                {scoreResult.grade}
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  Score: <span className="font-semibold">{formatScore(scoreResult.score)}</span>
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Rules contribution: {(scoreResult.parts.rulesPct * 100).toFixed(0)}%
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Confluence contribution: {(scoreResult.parts.confPct * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            {scoreResult.parts.missedMust && (
              <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                Missing any must-rule applies a penalty of {formatScore(effectiveRubric.must_rule_penalty)}.
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={resetSelections}>
            <RefreshCcw className="h-4 w-4" />
            Reset preview
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Rules</h3>
          <div className="mt-4 space-y-2">
            {rules.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add rules in the previous tab to preview scoring.
              </p>
            ) : (
              rules
                .sort((a, b) => a.sort - b.sort)
                .map((rule) => {
                  const checked = Boolean(rulesChecked[rule.id])
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() =>
                        setRulesChecked((prev) => ({ ...prev, [rule.id]: !checked }))
                      }
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        checked
                          ? 'border-emerald-300/70 bg-emerald-100/60 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'border-slate-200/70 bg-white/80 text-slate-600 hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300'
                      }`}
                    >
                      <span>
                        <span className="font-medium uppercase text-xs text-slate-500 dark:text-slate-400">
                          {rule.type}
                        </span>
                        <br />
                        {rule.label}
                      </span>
                      {checked ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  )
                })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Confluences
          </h3>
          <div className="mt-4 space-y-2">
            {confluences.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add confluences to preview their impact.
              </p>
            ) : (
              confluences
                .sort((a, b) => a.sort - b.sort)
                .map((conf) => {
                  const checked = Boolean(confChecked[conf.id])
                  return (
                    <button
                      key={conf.id}
                      type="button"
                      onClick={() =>
                        setConfChecked((prev) => ({ ...prev, [conf.id]: !checked }))
                      }
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        checked
                          ? 'border-blue-300/70 bg-blue-100/60 text-blue-800 dark:border-blue-700/60 dark:bg-blue-900/30 dark:text-blue-200'
                          : 'border-slate-200/70 bg-white/80 text-slate-600 hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300'
                      }`}
                    >
                      <span>
                        <span className="font-medium uppercase text-xs text-slate-500 dark:text-slate-400">
                          {conf.primary_confluence ? 'PRIMARY' : 'SECONDARY'}
                        </span>
                        <br />
                        {conf.label}
                      </span>
                      {checked ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
