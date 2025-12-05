'use client'

import * as React from 'react'
import { Plus, Trash2, RefreshCw, Info } from 'lucide-react'
import type { PlaybookRubric } from '@/types/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { validateRubric } from '@/lib/playbook-scoring'

interface ScoringEditorProps {
  rubric: PlaybookRubric
  onChange: (rubric: PlaybookRubric) => void
}

const RECOMMENDED_SETTINGS = {
  weight_rules: 0.7,
  weight_confluences: 0.3,
  weight_checklist: 0.0,
  must_rule_penalty: 0.4,
  min_checks: 0,
  grade_cutoffs: {
    'A+': 0.95,
    'A': 0.9,
    'B': 0.8,
    'C': 0.7,
    'D': 0.6,
  }
}

export function ScoringEditor({ rubric, onChange }: ScoringEditorProps) {
  const [customIndex, setCustomIndex] = React.useState(1)
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  const gradeEntries = React.useMemo(
    () => Object.entries(rubric.grade_cutoffs).sort((a, b) => b[1] - a[1]),
    [rubric.grade_cutoffs]
  )

  const validation = React.useMemo(() => validateRubric(rubric), [rubric])

  const updateRubric = (updates: Partial<PlaybookRubric>) => {
    onChange({ ...rubric, ...updates })
  }

  const handleGradeLabelChange = (grade: string, nextLabel: string) => {
    const trimmed = nextLabel.trim().toUpperCase()
    if (!trimmed) return

    const nextCutoffs: Record<string, number> = {}
    for (const [key, value] of Object.entries(rubric.grade_cutoffs)) {
      const targetKey = key === grade ? trimmed : key
      nextCutoffs[targetKey] = value
    }
    updateRubric({ grade_cutoffs: nextCutoffs })
  }

  const handleGradeValueChange = (grade: string, value: number) => {
    const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
    updateRubric({
      grade_cutoffs: {
        ...rubric.grade_cutoffs,
        [grade]: clamped,
      },
    })
  }

  const handleRemoveGrade = (grade: string) => {
    if (gradeEntries.length <= 1) return
    const nextCutoffs = { ...rubric.grade_cutoffs }
    delete nextCutoffs[grade]
    updateRubric({ grade_cutoffs: nextCutoffs })
  }

  const handleAddGrade = () => {
    const newLabel = `G${customIndex}`
    setCustomIndex((prev) => prev + 1)
    updateRubric({
      grade_cutoffs: {
        ...rubric.grade_cutoffs,
        [newLabel]: 0.5,
      },
    })
  }

  const useRecommendedSettings = () => {
    updateRubric(RECOMMENDED_SETTINGS)
  }

  return (
    <div className="space-y-6">
      {!validation.valid && (
        <Alert variant="destructive">
          <AlertDescription>{validation.error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Scoring Setup
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Use the <strong>recommended settings</strong> below for automated scoring (70% rules, 30% confluences),
              or expand <strong>Advanced Settings</strong> to manually configure weights and grade cutoffs.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-blue-200/70 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Quick Setup
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Use recommended scoring settings optimized for most playbooks
          </p>
        </div>
        <Button variant="outline" onClick={useRecommendedSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Use Recommended
        </Button>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-lg border border-neutral-200/70 bg-white p-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:bg-black dark:hover:bg-neutral-900"
        >
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Advanced Scoring Settings
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Customize weights, penalties, and grade cutoffs
            </p>
          </div>
          <span className="text-neutral-500">{showAdvanced ? '▼' : '▶'}</span>
        </button>

        {showAdvanced && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Rule Weight
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Share of the score driven by checklist compliance.
            </p>
          </div>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={rubric.weight_rules}
            onChange={(event) =>
              updateRubric({ weight_rules: Number(event.target.value) })
            }
          />
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Confluence Weight
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Portion of score contributed by supporting factors.
            </p>
          </div>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={rubric.weight_confluences}
            onChange={(event) =>
              updateRubric({ weight_confluences: Number(event.target.value) })
            }
          />
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Must Rule Penalty
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Deduction applied if any must-rule is missed.
            </p>
          </div>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={rubric.must_rule_penalty}
            onChange={(event) =>
              updateRubric({ must_rule_penalty: Number(event.target.value) })
            }
          />
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/50">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Minimum Checks
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Optional guardrail for minimum rule/confluence checks.
            </p>
          </div>
          <Input
            type="number"
            min="0"
            step="1"
            value={rubric.min_checks}
            onChange={(event) => updateRubric({ min_checks: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Grade Cutoffs
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Scores are mapped to the first grade whose threshold is met.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddGrade}>
            <Plus className="h-4 w-4" />
            Add Grade
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {gradeEntries.map(([grade, cutoff]) => (
            <div
              key={grade}
              className="grid gap-3 rounded-lg border border-neutral-200/70 bg-white p-4 dark:border-neutral-800/60 dark:bg-black sm:grid-cols-[150px_1fr_40px]"
            >
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Grade Label
                </label>
                <Input
                  value={grade}
                  onChange={(event) => handleGradeLabelChange(grade, event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Cutoff (0-1)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={cutoff}
                  onChange={(event) =>
                    handleGradeValueChange(grade, Number(event.target.value))
                  }
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveGrade(grade)}
                className="h-9 w-9 self-end rounded-md border border-neutral-200/70 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-neutral-800/60 dark:text-neutral-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                aria-label="Remove grade"
                disabled={gradeEntries.length <= 1}
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
          </>
        )}
      </div>
    </div>
  )
}
