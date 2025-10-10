/**
 * Playbook Setup Scoring Engine
 * Deterministic grade calculation based on rules and confluences compliance
 */

export interface Rule {
  id: string
  type: 'must' | 'should' | 'optional'
  weight: number
}

export interface Confluence {
  id: string
  weight: number
  primary?: boolean
}

export interface Rubric {
  weight_rules: number // e.g., 0.6 (60%)
  weight_confluences: number // e.g., 0.4 (40%)
  must_rule_penalty: number // e.g., 0.4 (subtract if any must missed)
  min_checks: number // optional minimum checks required
  grade_cutoffs: Record<string, number> // {"A+":0.95,"A":0.9,...}
}

export interface ScoreInput {
  rules: Rule[]
  rulesChecked: Record<string, boolean>
  confluences: Confluence[]
  confChecked: Record<string, boolean>
  rubric: Rubric
}

export interface ScoreResult {
  score: number // 0..1
  grade: string // "A+", "A", "B", "C", "D", "F"
  parts: {
    rulesPct: number
    confPct: number
    missedMust: boolean
    mustCount: number
    mustHit: number
    shouldCount: number
    shouldHit: number
    optionalCount: number
    optionalHit: number
    primaryConfCount: number
    primaryConfHit: number
  }
}

/**
 * Score a trade setup based on playbook compliance
 * @param input Rules, confluences, checked items, and rubric
 * @returns Score (0-1), grade (A+-F), and breakdown
 */
export function scoreSetup(input: ScoreInput): ScoreResult {
  const { rules, rulesChecked, confluences, confChecked, rubric } = input

  // Calculate rules compliance
  const rTotal = rules.reduce((s, r) => s + r.weight, 0) || 1
  const rHit = rules.reduce((s, r) => s + (rulesChecked[r.id] ? r.weight : 0), 0)
  const rulesPct = rHit / rTotal

  // Calculate confluences compliance (primary confluences get 1.2x multiplier)
  const cTotal =
    confluences.reduce((s, c) => s + c.weight * (c.primary ? 1.2 : 1), 0) || 1
  const cHit = confluences.reduce(
    (s, c) => s + (confChecked[c.id] ? c.weight * (c.primary ? 1.2 : 1) : 0),
    0
  )
  const confPct = cHit / cTotal

  // Combine with weights
  let score = rubric.weight_rules * rulesPct + rubric.weight_confluences * confPct

  // Apply must-rule penalty if any must rule is missed
  const missedMust = rules.some((r) => r.type === 'must' && !rulesChecked[r.id])
  if (missedMust) {
    score = Math.max(0, score - rubric.must_rule_penalty)
  }

  // Clamp score to 0..1
  score = Math.max(0, Math.min(1, score))

  // Map to grade (highest cutoff first)
  const entries = Object.entries(rubric.grade_cutoffs).sort((a, b) => b[1] - a[1])
  const grade = entries.find(([, cut]) => score >= cut)?.[0] ?? 'F'

  // Breakdown stats
  const mustRules = rules.filter((r) => r.type === 'must')
  const shouldRules = rules.filter((r) => r.type === 'should')
  const optionalRules = rules.filter((r) => r.type === 'optional')
  const primaryConfs = confluences.filter((c) => c.primary)

  return {
    score,
    grade,
    parts: {
      rulesPct,
      confPct,
      missedMust,
      mustCount: mustRules.length,
      mustHit: mustRules.filter((r) => rulesChecked[r.id]).length,
      shouldCount: shouldRules.length,
      shouldHit: shouldRules.filter((r) => rulesChecked[r.id]).length,
      optionalCount: optionalRules.length,
      optionalHit: optionalRules.filter((r) => rulesChecked[r.id]).length,
      primaryConfCount: primaryConfs.length,
      primaryConfHit: primaryConfs.filter((c) => confChecked[c.id]).length,
    },
  }
}

/**
 * Get default rubric for new playbooks
 */
export function getDefaultRubric(): Rubric {
  return {
    weight_rules: 0.6,
    weight_confluences: 0.4,
    must_rule_penalty: 0.4,
    min_checks: 0,
    grade_cutoffs: {
      'A+': 0.95,
      A: 0.9,
      B: 0.8,
      C: 0.7,
      D: 0.6,
    },
  }
}

/**
 * Get grade color class for Tailwind
 * @param grade Letter grade
 * @returns Tailwind color classes
 */
export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'A+': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    A: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    B: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    C: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    D: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    F: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  }
  return colors[grade] || colors.F
}

/**
 * Format score as percentage
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

/**
 * Get grade explanation text
 */
export function getGradeExplanation(result: ScoreResult): string {
  const { parts, grade } = result
  const explanations: string[] = []

  if (parts.missedMust) {
    explanations.push(
      `Missed ${parts.mustCount - parts.mustHit}/${parts.mustCount} must-rule(s) → penalty applied`
    )
  } else {
    explanations.push(`All must-rules followed`)
  }

  if (parts.shouldCount > 0) {
    explanations.push(
      `${parts.shouldHit}/${parts.shouldCount} should-rules followed`
    )
  }

  if (parts.primaryConfCount > 0) {
    explanations.push(
      `${parts.primaryConfHit}/${parts.primaryConfCount} primary confluences used`
    )
  }

  return explanations.join(', ')
}

/**
 * Validate rubric weights sum to 1.0
 */
export function validateRubric(rubric: Rubric): { valid: boolean; error?: string } {
  const sum = rubric.weight_rules + rubric.weight_confluences
  if (Math.abs(sum - 1.0) > 0.01) {
    return {
      valid: false,
      error: `Rule and confluence weights must sum to 1.0 (currently ${sum.toFixed(2)})`,
    }
  }

  if (rubric.must_rule_penalty < 0 || rubric.must_rule_penalty > 1) {
    return {
      valid: false,
      error: 'Must-rule penalty must be between 0 and 1',
    }
  }

  return { valid: true }
}
