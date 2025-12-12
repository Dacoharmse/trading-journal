'use client'

import React from 'react'
import { ChevronDown, ChevronUp, Check, Info } from 'lucide-react'
import type { PlaybookRule, PlaybookConfluence, PlaybookRubric } from '@/types/supabase'
import {
  scoreSetup,
  formatScore,
  getGradeExplanation,
  type ScoreResult,
} from '@/lib/playbook-scoring'

interface SetupChecklistProps {
  rules: PlaybookRule[]
  confluences: PlaybookConfluence[]
  rubric: PlaybookRubric
  rulesChecked: Record<string, boolean>
  confluencesChecked: Record<string, boolean>
  onRulesChange: (checked: Record<string, boolean>) => void
  onConfluencesChange: (checked: Record<string, boolean>) => void
}

export function SetupChecklist({
  rules,
  confluences,
  rubric,
  rulesChecked,
  confluencesChecked,
  onRulesChange,
  onConfluencesChange,
}: SetupChecklistProps) {
  const [rulesExpanded, setRulesExpanded] = React.useState(true)
  const [confExpanded, setConfExpanded] = React.useState(true)

  const scoreResult: ScoreResult = React.useMemo(() => {
    return scoreSetup({
      rules: rules.map((r) => ({
        id: r.id,
        type: r.type,
        weight: r.weight,
      })),
      rulesChecked,
      confluences: confluences.map((c) => ({
        id: c.id,
        weight: c.weight,
        primary: c.primary_confluence,
      })),
      confChecked: confluencesChecked,
      rubric,
    })
  }, [rules, confluences, rulesChecked, confluencesChecked, rubric])

  const toggleRule = (ruleId: string) => {
    onRulesChange({ ...rulesChecked, [ruleId]: !rulesChecked[ruleId] })
  }

  const toggleConfluence = (confId: string) => {
    onConfluencesChange({
      ...confluencesChecked,
      [confId]: !confluencesChecked[confId],
    })
  }

  const mustRules = rules.filter((r) => r.type === 'must').sort((a, b) => a.sort - b.sort)
  const shouldRules = rules.filter((r) => r.type === 'should').sort((a, b) => a.sort - b.sort)
  const optionalRules = rules.filter((r) => r.type === 'optional').sort((a, b) => a.sort - b.sort)
  const sortedConfluences = [...confluences].sort((a, b) => a.sort - b.sort)
  const primaryConfluences = sortedConfluences.filter(c => c.primary_confluence)
  const secondaryConfluences = sortedConfluences.filter(c => !c.primary_confluence)

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500'
      case 'B':
        return 'bg-blue-500'
      case 'C':
        return 'bg-amber-500'
      case 'D':
        return 'bg-orange-500'
      case 'F':
        return 'bg-red-500'
      default:
        return 'bg-neutral-500'
    }
  }

  const rulesCheckedCount = Object.values(rulesChecked).filter(Boolean).length
  const confluencesCheckedCount = Object.values(confluencesChecked).filter(Boolean).length

  return (
    <div className="space-y-3">
      {/* Score Header */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Setup Score</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatScore(scoreResult.score)}</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
            {getGradeExplanation(scoreResult)}
          </p>
        </div>
        <div
          className={`flex-shrink-0 ml-4 w-11 h-11 rounded-full ${getGradeStyle(scoreResult.grade)} flex items-center justify-center`}
        >
          <span className="text-white font-bold text-lg">{scoreResult.grade}</span>
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <button
          onClick={() => setRulesExpanded(!rulesExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Rules</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-500">
              {rulesCheckedCount}/{rules.length}
            </span>
          </div>
          {rulesExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          )}
        </button>

        {rulesExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {mustRules.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Must-Have</span>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-neutral-400 dark:text-neutral-500 cursor-help" />
                    <div className="hidden group-hover:block absolute left-0 top-4 z-20 w-44 p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-md shadow-xl">
                      Missing any must-rule applies a penalty
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {mustRules.map((rule) => (
                    <CheckItem
                      key={rule.id}
                      label={rule.label}
                      checked={rulesChecked[rule.id]}
                      onChange={() => toggleRule(rule.id)}
                      accentColor="red"
                    />
                  ))}
                </div>
              </div>
            )}

            {shouldRules.length > 0 && (
              <div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2 block">Should-Have</span>
                <div className="space-y-2">
                  {shouldRules.map((rule) => (
                    <CheckItem
                      key={rule.id}
                      label={rule.label}
                      checked={rulesChecked[rule.id]}
                      onChange={() => toggleRule(rule.id)}
                      accentColor="amber"
                    />
                  ))}
                </div>
              </div>
            )}

            {optionalRules.length > 0 && (
              <div>
                <span className="text-xs font-medium text-neutral-500 mb-2 block">Optional</span>
                <div className="space-y-2">
                  {optionalRules.map((rule) => (
                    <CheckItem
                      key={rule.id}
                      label={rule.label}
                      checked={rulesChecked[rule.id]}
                      onChange={() => toggleRule(rule.id)}
                      accentColor="neutral"
                    />
                  ))}
                </div>
              </div>
            )}

            {rules.length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-2">No rules defined</p>
            )}
          </div>
        )}
      </div>

      {/* Confluences */}
      <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <button
          onClick={() => setConfExpanded(!confExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Confluences</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-500">
              {confluencesCheckedCount}/{confluences.length}
            </span>
          </div>
          {confExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          )}
        </button>

        {confExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {primaryConfluences.length > 0 && (
              <div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 block">Primary</span>
                <div className="space-y-2">
                  {primaryConfluences.map((conf) => (
                    <CheckItem
                      key={conf.id}
                      label={conf.label}
                      checked={confluencesChecked[conf.id]}
                      onChange={() => toggleConfluence(conf.id)}
                      accentColor="blue"
                    />
                  ))}
                </div>
              </div>
            )}

            {secondaryConfluences.length > 0 && (
              <div>
                {primaryConfluences.length > 0 && (
                  <span className="text-xs font-medium text-neutral-500 mb-2 block">Secondary</span>
                )}
                <div className="space-y-2">
                  {secondaryConfluences.map((conf) => (
                    <CheckItem
                      key={conf.id}
                      label={conf.label}
                      checked={confluencesChecked[conf.id]}
                      onChange={() => toggleConfluence(conf.id)}
                      accentColor="blue"
                    />
                  ))}
                </div>
              </div>
            )}

            {confluences.length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-2">No confluences defined</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface CheckItemProps {
  label: string
  checked: boolean
  onChange: () => void
  accentColor: 'red' | 'amber' | 'blue' | 'neutral'
}

function CheckItem({ label, checked, onChange, accentColor }: CheckItemProps) {
  const getCheckboxColor = () => {
    if (!checked) return 'border-neutral-300 dark:border-neutral-500'
    switch (accentColor) {
      case 'red': return 'border-red-500 bg-red-500'
      case 'amber': return 'border-amber-500 bg-amber-500'
      case 'blue': return 'border-blue-500 bg-blue-500'
      default: return 'border-neutral-500 bg-neutral-500'
    }
  }

  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-100 dark:!bg-[#262626] hover:bg-neutral-200 dark:hover:!bg-[#333333] border border-neutral-200 dark:!border-neutral-600 transition-colors text-left"
    >
      <div
        className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border-2 ${getCheckboxColor()} transition-colors`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className={`text-sm ${checked ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400'}`}>
        {label}
      </span>
    </button>
  )
}
