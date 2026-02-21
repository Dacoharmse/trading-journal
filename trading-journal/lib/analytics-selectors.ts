import type { Trade } from '@/types/supabase'

export interface TradeFilters {
  dateFrom?: string
  dateTo?: string
  accountId?: string | 'all'
  symbols?: string[]
  sessions?: string[]
  playbookId?: string | 'all'
}

export interface KPIs {
  n: number
  wins: number
  losses: number
  winRate: number
  pfR: number
  expectancyR: number
  netR: number
  maxDDR: number
  recovery: number
  avgWinR: number
  avgLossR: number
}

export interface DOWMetrics {
  key: string
  n: number
  expectancyR: number
  winRate: number
  netR: number
}

export interface HourMetrics {
  hour: number
  winRate: number
  expectancyR: number
  netR: number
  n: number
}

export interface SymbolMetrics {
  symbol: string
  n: number
  winRate: number
  avgR: number
  expectancyR: number
  netR: number
}

export interface PlaybookGradeMetrics {
  grade: string
  n: number
  expectancyR: number
  avgScore: number
}

export interface HistogramBucket {
  bin: string
  count: number
  min: number
  max: number
}

export interface ScatterPoint {
  r: number
  hold: number
  date: string
  symbol: string
  playbookName?: string
}

export function selectTradesInScope(
  trades: Trade[],
  filters: TradeFilters
): Trade[] {
  return trades.filter((trade) => {
    // Accept either exit_date or closed_at as the closing timestamp
    const closedAt = trade.exit_date || trade.closed_at
    if (!closedAt) return false

    const closedDate = closedAt.split('T')[0]
    if (filters.dateFrom && closedDate < filters.dateFrom) return false
    if (filters.dateTo && closedDate > filters.dateTo) return false

    if (
      filters.accountId &&
      filters.accountId !== 'all' &&
      trade.account_id !== filters.accountId
    )
      return false

    if (
      filters.symbols &&
      filters.symbols.length > 0 &&
      !filters.symbols.includes(trade.symbol)
    )
      return false

    if (
      filters.sessions &&
      filters.sessions.length > 0 &&
      trade.session &&
      !filters.sessions.includes(trade.session)
    )
      return false

    if (
      filters.playbookId &&
      filters.playbookId !== 'all' &&
      trade.playbook_id !== filters.playbookId
    )
      return false

    return true
  })
}

export function trimOutliersR(trades: Trade[], pct = 0.025): Trade[] {
  if (trades.length === 0) return []

  const sorted = [...trades]
    .filter((t) => t.r_multiple != null)
    .sort((a, b) => (a.r_multiple ?? 0) - (b.r_multiple ?? 0))

  const trimCount = Math.floor(sorted.length * pct)
  return sorted.slice(trimCount, sorted.length - trimCount)
}

export function kpisR(trades: Trade[]): KPIs {
  const validTrades = trades.filter((t) => t.r_multiple != null)
  const n = validTrades.length

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
      recovery: 0,
      avgWinR: 0,
      avgLossR: 0,
    }
  }

  const wins = validTrades.filter((t) => (t.r_multiple ?? 0) > 0)
  const losses = validTrades.filter((t) => (t.r_multiple ?? 0) <= 0)

  const winCount = wins.length
  const lossCount = losses.length
  const winRate = winCount / n

  const totalWinR = wins.reduce((sum, t) => sum + (t.r_multiple ?? 0), 0)
  const totalLossR = Math.abs(
    losses.reduce((sum, t) => sum + (t.r_multiple ?? 0), 0)
  )

  const avgWinR = winCount > 0 ? totalWinR / winCount : 0
  const avgLossR = lossCount > 0 ? totalLossR / lossCount : 0

  const pfR = totalLossR > 0 ? totalWinR / totalLossR : totalWinR > 0 ? 999 : 0
  const netR = validTrades.reduce((sum, t) => sum + (t.r_multiple ?? 0), 0)
  const expectancyR = winRate * avgWinR - (1 - winRate) * avgLossR

  // Max Drawdown in R
  let runningR = 0
  let peak = 0
  let maxDD = 0

  for (const trade of validTrades) {
    runningR += trade.r_multiple ?? 0
    if (runningR > peak) peak = runningR
    const dd = peak - runningR
    if (dd > maxDD) maxDD = dd
  }

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
    recovery,
    avgWinR,
    avgLossR,
  }
}

export function priorPeriodRange(currentRange: {
  from: string
  to: string
}): { from: string; to: string } {
  const fromDate = new Date(currentRange.from)
  const toDate = new Date(currentRange.to)

  const durationMs = toDate.getTime() - fromDate.getTime()

  const priorTo = new Date(fromDate.getTime() - 1)
  const priorFrom = new Date(priorTo.getTime() - durationMs)

  return {
    from: priorFrom.toISOString().split('T')[0],
    to: priorTo.toISOString().split('T')[0],
  }
}

export function groupByDOW(trades: Trade[]): DOWMetrics[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const groups: Record<string, Trade[]> = {}

  for (const day of days) {
    groups[day] = []
  }

  for (const trade of trades) {
    const closedAt = trade.exit_date || trade.closed_at
    if (!closedAt || trade.r_multiple == null) continue
    const date = new Date(closedAt)
    const dow = days[date.getUTCDay()]
    groups[dow].push(trade)
  }

  return days.map((key) => {
    const dayTrades = groups[key]
    const kpis = kpisR(dayTrades)
    return {
      key,
      n: kpis.n,
      expectancyR: kpis.expectancyR,
      winRate: kpis.winRate,
      netR: kpis.netR,
    }
  })
}

/**
 * Derive session row from trade.session OR trade.session_hour prefix.
 * session_hour: A1-A4 → Asia, L1-L3 → London, NY1-NY3 → NY
 */
function getTradeSession(trade: Trade): string | null {
  if (trade.session) return trade.session
  const sh = (trade as any).session_hour as string | undefined | null
  if (sh) {
    if (sh.startsWith('NY')) return 'NY'
    if (sh.startsWith('L')) return 'London'
    if (sh.startsWith('A')) return 'Asia'
  }
  return null
}

/**
 * Get SA/Namibia local hour (UTC+2) from open_time (stored as local HH:MM:SS).
 * Falls back to exit_date UTC hour + 2.
 */
function getLocalHour(trade: Trade): number | null {
  if (trade.open_time) {
    return parseInt(trade.open_time.split(':')[0], 10)
  }
  const closedAt = trade.exit_date || trade.closed_at
  if (closedAt) {
    return (new Date(closedAt).getUTCHours() + 2) % 24
  }
  return null
}

export function hourSessionMatrix(
  trades: Trade[]
): Record<string, HourMetrics[]> {
  const sessions = ['Asia', 'London', 'NY']
  const matrix: Record<string, HourMetrics[]> = {}

  for (const session of sessions) {
    const hours: Record<number, Trade[]> = {}
    for (let h = 0; h < 24; h++) {
      hours[h] = []
    }

    for (const trade of trades) {
      if (trade.r_multiple == null) continue
      if (getTradeSession(trade) !== session) continue

      const h = getLocalHour(trade)
      if (h == null) continue
      hours[h].push(trade)
    }

    matrix[session] = Array.from({ length: 24 }, (_, hour) => {
      const hourTrades = hours[hour]
      const kpis = kpisR(hourTrades)
      return {
        hour,
        winRate: kpis.winRate,
        expectancyR: kpis.expectancyR,
        netR: kpis.netR,
        n: kpis.n,
      }
    })
  }

  return matrix
}

export function bySymbol(trades: Trade[]): SymbolMetrics[] {
  const groups: Record<string, Trade[]> = {}

  for (const trade of trades) {
    if (!trade.symbol || trade.r_multiple == null) continue
    if (!groups[trade.symbol]) groups[trade.symbol] = []
    groups[trade.symbol].push(trade)
  }

  return Object.entries(groups).map(([symbol, symbolTrades]) => {
    const kpis = kpisR(symbolTrades)
    return {
      symbol,
      n: kpis.n,
      winRate: kpis.winRate,
      avgR: kpis.n > 0 ? kpis.netR / kpis.n : 0,
      expectancyR: kpis.expectancyR,
      netR: kpis.netR,
    }
  })
}

export function byPlaybookGrade(
  trades: Trade[],
  playbooks: Array<{ id: string; name: string }>
): PlaybookGradeMetrics[] {
  const grades = ['A+', 'A', 'B', 'C', 'D', 'F']
  const groups: Record<string, Trade[]> = {}

  for (const grade of grades) {
    groups[grade] = []
  }

  for (const trade of trades) {
    if (!trade.setup_grade || trade.r_multiple == null) continue
    const grade = trade.setup_grade
    if (groups[grade]) {
      groups[grade].push(trade)
    }
  }

  return grades.map((grade) => {
    const gradeTrades = groups[grade]
    const kpis = kpisR(gradeTrades)
    const avgScore =
      gradeTrades.length > 0
        ? gradeTrades.reduce((sum, t) => sum + (t.setup_score ?? 0), 0) /
          gradeTrades.length
        : 0

    return {
      grade,
      n: kpis.n,
      expectancyR: kpis.expectancyR,
      avgScore,
    }
  })
}

export function histR(trades: Trade[], bins = 31): HistogramBucket[] {
  const validTrades = trades.filter((t) => t.r_multiple != null)
  if (validTrades.length === 0) return []

  const rValues = validTrades.map((t) => t.r_multiple ?? 0)
  const minR = Math.min(...rValues)
  const maxR = Math.max(...rValues)

  const range = Math.max(Math.abs(minR), Math.abs(maxR))
  const step = (range * 2) / bins
  const buckets: HistogramBucket[] = []

  for (let i = 0; i < bins; i++) {
    const min = -range + i * step
    const max = min + step
    const isLast = i === bins - 1
    const count = rValues.filter((r) => r >= min && (isLast ? r <= max : r < max)).length

    buckets.push({
      bin: `${min.toFixed(1)} to ${max.toFixed(1)}`,
      count,
      min,
      max,
    })
  }

  return buckets
}

export function histMae(trades: Trade[], bins = 20): HistogramBucket[] {
  const validTrades = trades.filter((t) => t.mae_r != null)
  if (validTrades.length === 0) return []

  const values = validTrades.map((t) => Math.abs(t.mae_r ?? 0))
  const maxVal = Math.max(...values)
  const step = maxVal / bins

  const buckets: HistogramBucket[] = []
  for (let i = 0; i < bins; i++) {
    const min = i * step
    const max = min + step
    const isLast = i === bins - 1
    const count = values.filter((v) => v >= min && (isLast ? v <= max : v < max)).length

    buckets.push({
      bin: `${min.toFixed(2)} to ${max.toFixed(2)}`,
      count,
      min,
      max,
    })
  }

  return buckets
}

export function histMfe(trades: Trade[], bins = 20): HistogramBucket[] {
  const validTrades = trades.filter((t) => t.mfe_r != null)
  if (validTrades.length === 0) return []

  const values = validTrades.map((t) => Math.abs(t.mfe_r ?? 0))
  const maxVal = Math.max(...values)
  const step = maxVal / bins

  const buckets: HistogramBucket[] = []
  for (let i = 0; i < bins; i++) {
    const min = i * step
    const max = min + step
    const isLast = i === bins - 1
    const count = values.filter((v) => v >= min && (isLast ? v <= max : v < max)).length

    buckets.push({
      bin: `${min.toFixed(2)} to ${max.toFixed(2)}`,
      count,
      min,
      max,
    })
  }

  return buckets
}

export function histHold(trades: Trade[]): HistogramBucket[] {
  const validTrades = trades.filter((t) => t.hold_mins != null)
  if (validTrades.length === 0) return []

  const buckets = [
    { bin: '≤5m', count: 0, min: 0, max: 5 },
    { bin: '5-15m', count: 0, min: 5, max: 15 },
    { bin: '15-60m', count: 0, min: 15, max: 60 },
    { bin: '1-4h', count: 0, min: 60, max: 240 },
    { bin: '>4h', count: 0, min: 240, max: Infinity },
  ]

  for (const trade of validTrades) {
    const mins = trade.hold_mins ?? 0
    if (mins <= 5) buckets[0].count++
    else if (mins <= 15) buckets[1].count++
    else if (mins <= 60) buckets[2].count++
    else if (mins <= 240) buckets[3].count++
    else buckets[4].count++
  }

  return buckets
}

export function holdVsR(
  trades: Trade[],
  playbooks: Array<{ id: string; name: string }>
): ScatterPoint[] {
  return trades
    .filter((t) => t.r_multiple != null && t.hold_mins != null && (t.exit_date || t.closed_at))
    .map((t) => {
      const closedAt = t.exit_date || t.closed_at
      const playbook = playbooks.find((p) => p.id === t.playbook_id)
      return {
        r: t.r_multiple ?? 0,
        hold: t.hold_mins ?? 0,
        date: closedAt?.split('T')[0] ?? '',
        symbol: t.symbol,
        playbookName: playbook?.name,
      }
    })
}

export function autoInsights(trades: Trade[]): string[] {
  const insights: string[] = []

  // Best hour/session
  const allSessions = ['Asia', 'London', 'NY']
  let bestSession = ''
  let bestExpectancy = -Infinity

  for (const session of allSessions) {
    const sessionTrades = trades.filter((t) => t.session === session)
    if (sessionTrades.length >= 15) {
      const kpis = kpisR(sessionTrades)
      if (kpis.expectancyR > bestExpectancy) {
        bestExpectancy = kpis.expectancyR
        bestSession = session
      }
    }
  }

  if (bestSession && bestExpectancy > 0) {
    insights.push(
      `${bestSession} session shows strongest expectancy at +${bestExpectancy.toFixed(2)}R (n≥15)`
    )
  }

  // Worst day to avoid
  const dowMetrics = groupByDOW(trades)
  const worstDay = dowMetrics
    .filter((d) => d.n >= 15)
    .sort((a, b) => a.expectancyR - b.expectancyR)[0]

  if (worstDay && worstDay.expectancyR < 0) {
    insights.push(
      `Avoid ${worstDay.key} (${worstDay.expectancyR.toFixed(2)}R expectancy, n=${worstDay.n})`
    )
  }

  return insights.slice(0, 2)
}
