'use client'

import React from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Info } from 'lucide-react'
import type { PlaybookRule, PlaybookConfluence, PlaybookRubric } from '@/types/supabase'
import {
  scoreSetup,
  getGradeColor,
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

  // Calculate live score
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

  const selectAllPrimary = () => {
    const updated = { ...confluencesChecked }
    confluences.forEach((c) => {
      if (c.primary_confluence) {
        updated[c.id] = true
      }
    })
    onConfluencesChange(updated)
  }

  // Group rules by type
  const mustRules = rules.filter((r) => r.type === 'must').sort((a, b) => a.sort - b.sort)
  const shouldRules = rules
    .filter((r) => r.type === 'should')
    .sort((a, b) => a.sort - b.sort)
  const optionalRules = rules
    .filter((r) => r.type === 'optional')
    .sort((a, b) => a.sort - b.sort)

  const sortedConfluences = [...confluences].sort((a, b) => a.sort - b.sort)

  return (
    <div className="space-y-4">
      {/* Live Score Display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Setup Quality
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatScore(scoreResult.score)}
            </span>
            <div
              className={`px-4 py-1.5 rounded-full font-bold text-lg border-2 ${getGradeColor(
                scoreResult.grade
              )}`}
            >
              {scoreResult.grade}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {getGradeExplanation(scoreResult)}
        </p>
      </div>

      {/* Rules Section */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setRulesExpanded(!rulesExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Rules Followed
            </h4>
            <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {Object.values(rulesChecked).filter(Boolean).length}/{rules.length}
            </span>
          </div>
          {rulesExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {rulesExpanded && (
          <div className="p-4 space-y-4">
            {/* Must Rules */}
            {mustRules.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-medium text-red-700 dark:text-red-400">
                    Must-Have Rules
                  </h5>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <div className="hidden group-hover:block absolute left-0 top-5 z-20 w-48 p-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded shadow-xl">
                      Missing any must-rule applies a penalty to your setup score
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {mustRules.map((rule) => (
                    <label
                      key={rule.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleRule(rule.id)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {rulesChecked[rule.id] ? (
                          <CheckCircle2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
                        )}
                      </button>
                      <span
                        className={`text-sm ${
                          rulesChecked[rule.id]
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {rule.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Should Rules */}
            {shouldRules.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                  Should-Have Rules
                </h5>
                <div className="space-y-2">
                  {shouldRules.map((rule) => (
                    <label
                      key={rule.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleRule(rule.id)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {rulesChecked[rule.id] ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 group-hover:text-amber-400" />
                        )}
                      </button>
                      <span
                        className={`text-sm ${
                          rulesChecked[rule.id]
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {rule.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Rules */}
            {optionalRules.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Optional Rules
                </h5>
                <div className="space-y-2">
                  {optionalRules.map((rule) => (
                    <label
                      key={rule.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleRule(rule.id)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {rulesChecked[rule.id] ? (
                          <CheckCircle2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 group-hover:text-gray-500" />
                        )}
                      </button>
                      <span
                        className={`text-sm ${
                          rulesChecked[rule.id]
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {rule.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {rules.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No rules defined for this playbook
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confluences Section */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfExpanded(!confExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Confluences Present
            </h4>
            <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              {Object.values(confluencesChecked).filter(Boolean).length}/
              {confluences.length}
            </span>
          </div>
          {confExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {confExpanded && (
          <div className="p-4 space-y-3">
            {confluences.some((c) => c.primary_confluence) && (
              <button
                onClick={selectAllPrimary}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Select all primary confluences
              </button>
            )}

            <div className="space-y-2">
              {sortedConfluences.map((conf) => (
                <label
                  key={conf.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-purple-50 dark:hover:bg-purple-950/30 cursor-pointer group"
                >
                  <button
                    type="button"
                    onClick={() => toggleConfluence(conf.id)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {confluencesChecked[conf.id] ? (
                      <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 group-hover:text-purple-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          confluencesChecked[conf.id]
                            ? 'text-gray-900 dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {conf.label}
                      </span>
                      {conf.primary_confluence && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {confluences.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No confluences defined for this playbook
              </p>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          Select the rules you actually followed and the confluences present. Your
          setup score updates in real time.
        </p>
        <p>Missing any must-rule applies a penalty defined in this playbook.</p>
      </div>
    </div>
  )
}
