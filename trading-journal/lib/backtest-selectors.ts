export interface Backtest {
  id: string
  user_id: string
  playbook_id: string
  session?: string | null
  symbol: string
  direction: 'long' | 'short'
  entry_date: string
  // Planned metrics (what you intended before the trade)
  planned_sl_pips?: number | null
  planned_tp_pips?: number | null
  planned_rr?: number | null
  // Actual metrics (what actually happened)
  actual_sl_pips?: number | null
  actual_tp_pips?: number | null
  actual_rr?: number | null
  // Legacy fields
  stop_pips?: number | null
  target_pips?: number | null
  result_r: number
  outcome?: 'win' | 'loss' | 'breakeven' | 'closed' | null
  chart_image?: string | null
  setup_score?: number | null
  setup_grade?: string | null
  notes?: string | null
  confluences_checked?: Record<string, boolean> | null
  rules_checked?: Record<string, boolean> | null
  created_at?: string
  updated_at?: string
}

export interface BacktestKPIs {
  n: number
  wins: number
  losses: number
  winRate: number
  pfR: number
  expectancyR: number
  netR: number
  maxDDR: number
  avgWinR: number
  avgLossR: number
  sharpeR: number
  recovery: number
}

export interface SessionMetrics {
  session: string
  n: number
  winRate: number
  expectancyR: number
  netR: number
}

export interface SymbolMetrics {
  symbol: string
  n: number
  winRate: number
  expectancyR: number
  netR: number
  avgR: number
}

export interface GradeMetrics {
  grade: string
  n: number
  expectancyR: number
  avgScore: number
}

export interface EquityPoint {
  date: string
  cumulativeR: number
}

export function backtestKPIs(backtests: Backtest[]): BacktestKPIs {
  const validTests = backtests.filter((t) => t.result_r != null)
  const n = validTests.length

  if (n === 0) {
    return {
      n: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      pfR: 0,
      expectancyR: 0,
      netR: 0,
      maxDDR: 0,
      avgWinR: 0,
      avgLossR: 0,
      sharpeR: 0,
    }
  }

  const wins = validTests.filter((t) => t.result_r > 0)
  const losses = validTests.filter((t) => t.result_r <= 0)

  const winCount = wins.length
  const lossCount = losses.length
  const winRate = winCount / n

  const totalWinR = wins.reduce((sum, t) => sum + t.result_r, 0)
  const totalLossR = Math.abs(losses.reduce((sum, t) => sum + t.result_r, 0))

  const avgWinR = winCount > 0 ? totalWinR / winCount : 0
  const avgLossR = lossCount > 0 ? totalLossR / lossCount : 0

  const pfR = totalLossR > 0 ? totalWinR / totalLossR : totalWinR > 0 ? 999 : 0
  const netR = validTests.reduce((sum, t) => sum + t.result_r, 0)
  const expectancyR = winRate * avgWinR - (1 - winRate) * avgLossR

  // Max Drawdown in R
  let runningR = 0
  let peak = 0
  let maxDD = 0

  const sorted = [...validTests].sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  for (const test of sorted) {
    runningR += test.result_r
    if (runningR > peak) peak = runningR
    const dd = peak - runningR
    if (dd > maxDD) maxDD = dd
  }

  // Sharpe-like Ratio (mean / stddev of R)
  const meanR = netR / n
  const variance =
    validTests.reduce((sum, t) => sum + Math.pow(t.result_r - meanR, 2), 0) / n
  const stdDevR = Math.sqrt(variance)
  const sharpeR = stdDevR > 0 ? meanR / stdDevR : 0

  // Recovery Factor (net profit / max drawdown)
  const recovery = maxDD > 0 ? netR / maxDD : netR > 0 ? 999 : 0

  return {
    n,
    wins: winCount,
    losses: lossCount,
    winRate,
    pfR,
    expectancyR,
    netR,
    maxDDR: maxDD,
    avgWinR,
    avgLossR,
    sharpeR,
    recovery,
  }
}

export function groupBySession(backtests: Backtest[]): SessionMetrics[] {
  const groups: Record<string, Backtest[]> = {}

  for (const test of backtests) {
    const session = test.session || 'Unknown'
    if (!groups[session]) groups[session] = []
    groups[session].push(test)
  }

  return Object.entries(groups).map(([session, tests]) => {
    const kpis = backtestKPIs(tests)
    return {
      session,
      n: kpis.n,
      winRate: kpis.winRate,
      expectancyR: kpis.expectancyR,
      netR: kpis.netR,
    }
  })
}

export function groupBySymbol(backtests: Backtest[]): SymbolMetrics[] {
  const groups: Record<string, Backtest[]> = {}

  for (const test of backtests) {
    if (!groups[test.symbol]) groups[test.symbol] = []
    groups[test.symbol].push(test)
  }

  return Object.entries(groups).map(([symbol, tests]) => {
    const kpis = backtestKPIs(tests)
    const avgR = kpis.n > 0 ? kpis.netR / kpis.n : 0
    return {
      symbol,
      n: kpis.n,
      winRate: kpis.winRate,
      expectancyR: kpis.expectancyR,
      netR: kpis.netR,
      avgR,
    }
  })
}

export function groupByGrade(backtests: Backtest[]): GradeMetrics[] {
  const grades = ['A+', 'A', 'B', 'C', 'D', 'F']
  const groups: Record<string, Backtest[]> = {}

  for (const grade of grades) {
    groups[grade] = []
  }

  for (const test of backtests) {
    if (test.setup_grade && groups[test.setup_grade]) {
      groups[test.setup_grade].push(test)
    }
  }

  return grades.map((grade) => {
    const tests = groups[grade]
    const kpis = backtestKPIs(tests)
    const avgScore =
      tests.length > 0
        ? tests.reduce((sum, t) => sum + (t.setup_score ?? 0), 0) / tests.length
        : 0

    return {
      grade,
      n: kpis.n,
      expectancyR: kpis.expectancyR,
      avgScore,
    }
  })
}

export function equityCurve(backtests: Backtest[]): EquityPoint[] {
  const sorted = [...backtests]
    .filter((t) => t.result_r != null)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  let cumulative = 0
  return sorted.map((test) => {
    cumulative += test.result_r
    return {
      date: test.entry_date,
      cumulativeR: cumulative,
    }
  })
}

export function autoInsightsBacktest(backtests: Backtest[]): string[] {
  const insights: string[] = []

  // Best session
  const sessionMetrics = groupBySession(backtests)
  const bestSession = sessionMetrics
    .filter((s) => s.n >= 10)
    .sort((a, b) => b.expectancyR - a.expectancyR)[0]

  if (bestSession && bestSession.expectancyR > 0) {
    insights.push(
      `${bestSession.session} session produced +${bestSession.expectancyR.toFixed(2)}R expectancy with ${(bestSession.winRate * 100).toFixed(0)}% win rate (n=${bestSession.n})`
    )
  }

  // Best symbol
  const symbolMetrics = groupBySymbol(backtests)
  const bestSymbol = symbolMetrics
    .filter((s) => s.n >= 10)
    .sort((a, b) => b.expectancyR - a.expectancyR)[0]

  if (bestSymbol && bestSymbol.expectancyR > 0) {
    insights.push(
      `${bestSymbol.symbol} shows strongest edge: +${bestSymbol.expectancyR.toFixed(2)}R expectancy (n=${bestSymbol.n})`
    )
  }

  // Grade correlation
  const gradeMetrics = groupByGrade(backtests)
  const topGrades = gradeMetrics.filter((g) => ['A+', 'A'].includes(g.grade) && g.n >= 5)
  const topGradeExpectancy =
    topGrades.reduce((sum, g) => sum + g.expectancyR * g.n, 0) /
    topGrades.reduce((sum, g) => sum + g.n, 0)

  if (topGrades.length > 0 && topGradeExpectancy > 0) {
    insights.push(
      `A+/A grade setups deliver +${topGradeExpectancy.toFixed(2)}R expectancy — stick to high-quality setups`
    )
  }

  return insights.slice(0, 3)
}

export interface RecommendedMetrics {
  slPips: number
  tpPips: number
  rr: number
  sampleSize: number
  confidence: 'low' | 'medium' | 'high'
}

export function calculateRecommendedMetrics(
  backtests: Backtest[]
): RecommendedMetrics | null {
  // Filter only trades with both planned metrics
  const validTests = backtests.filter(
    (t) =>
      t.planned_sl_pips != null &&
      t.planned_tp_pips != null &&
      t.planned_rr != null
  )

  const n = validTests.length

  if (n === 0) {
    return null
  }

  // Calculate median values (more robust than mean for outliers)
  const slValues = validTests
    .map((t) => t.planned_sl_pips!)
    .sort((a, b) => a - b)
  const tpValues = validTests
    .map((t) => t.planned_tp_pips!)
    .sort((a, b) => a - b)
  const rrValues = validTests
    .map((t) => t.planned_rr!)
    .sort((a, b) => a - b)

  const median = (arr: number[]) => {
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
  }

  const slPips = median(slValues)
  const tpPips = median(tpValues)
  const rr = median(rrValues)

  // Confidence based on sample size
  let confidence: 'low' | 'medium' | 'high'
  if (n < 10) confidence = 'low'
  else if (n < 30) confidence = 'medium'
  else confidence = 'high'

  return {
    slPips,
    tpPips,
    rr,
    sampleSize: n,
    confidence,
  }
}
