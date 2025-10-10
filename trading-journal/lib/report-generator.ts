/**
 * Report Generation Utilities
 * Functions for generating and exporting trading reports
 */

import type { Trade } from '@/types/supabase'
import { format } from 'date-fns'

export interface ReportData {
  trades: Trade[]
  dateFrom: string
  dateTo: string
  totalTrades: number
  winRate: number
  totalPnL: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  largestWin: number
  largestLoss: number
  avgHoldTime: number
  totalFees: number
  netProfit: number
  expectancy: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  avgRMultiple: number
  bestDay: number
  worstDay: number
}

export interface ReportFilter {
  dateFrom?: string
  dateTo?: string
  symbol?: string
  session?: string
  playbookId?: string
  minGrade?: string
  outcomeFilter?: 'all' | 'wins' | 'losses' | 'breakeven'
}

/**
 * Calculate comprehensive report data from trades
 */
export function calculateReportData(
  trades: Trade[],
  dateFrom: string,
  dateTo: string
): ReportData {
  const closedTrades = trades.filter((t) => t.closed_at)

  const wins = closedTrades.filter((t) => (t.result_r || 0) > 0)
  const losses = closedTrades.filter((t) => (t.result_r || 0) < 0)
  const breakEven = closedTrades.filter((t) => (t.result_r || 0) === 0)

  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.result_r || 0), 0)
  const totalWinPnL = wins.reduce((sum, t) => sum + (t.result_r || 0), 0)
  const totalLossPnL = Math.abs(losses.reduce((sum, t) => sum + (t.result_r || 0), 0))

  const avgWin = wins.length > 0 ? totalWinPnL / wins.length : 0
  const avgLoss = losses.length > 0 ? totalLossPnL / losses.length : 0

  const profitFactor = totalLossPnL > 0 ? totalWinPnL / totalLossPnL : 0

  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.result_r || 0)) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.result_r || 0)) : 0

  // Calculate average hold time (in hours)
  const tradesWithDuration = closedTrades.filter((t) => t.opened_at && t.closed_at)
  const avgHoldTime =
    tradesWithDuration.length > 0
      ? tradesWithDuration.reduce((sum, t) => {
          const duration =
            (new Date(t.closed_at!).getTime() - new Date(t.opened_at!).getTime()) /
            (1000 * 60 * 60)
          return sum + duration
        }, 0) / tradesWithDuration.length
      : 0

  const totalFees = closedTrades.reduce((sum, t) => sum + (t.fees || 0), 0)
  const netProfit = totalPnL - totalFees

  // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  const lossRate = closedTrades.length > 0 ? (losses.length / closedTrades.length) * 100 : 0
  const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss

  const avgRMultiple =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + (t.result_r || 0), 0) / closedTrades.length
      : 0

  // Group by day for best/worst day
  const dailyPnL = new Map<string, number>()
  closedTrades.forEach((t) => {
    if (t.closed_at) {
      const day = format(new Date(t.closed_at), 'yyyy-MM-dd')
      dailyPnL.set(day, (dailyPnL.get(day) || 0) + (t.result_r || 0))
    }
  })

  const dailyValues = Array.from(dailyPnL.values())
  const bestDay = dailyValues.length > 0 ? Math.max(...dailyValues) : 0
  const worstDay = dailyValues.length > 0 ? Math.min(...dailyValues) : 0

  return {
    trades: closedTrades,
    dateFrom,
    dateTo,
    totalTrades: closedTrades.length,
    winRate,
    totalPnL,
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    avgHoldTime,
    totalFees,
    netProfit,
    expectancy,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEven.length,
    avgRMultiple,
    bestDay,
    worstDay,
  }
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(reportData: ReportData): string {
  const headers = [
    'Date Opened',
    'Date Closed',
    'Symbol',
    'Direction',
    'Session',
    'Entry',
    'Exit',
    'Size',
    'Result (R)',
    'PnL',
    'Fees',
    'Grade',
    'Outcome',
    'Notes',
  ]

  const rows = reportData.trades.map((trade) => [
    trade.opened_at ? format(new Date(trade.opened_at), 'yyyy-MM-dd HH:mm') : '',
    trade.closed_at ? format(new Date(trade.closed_at), 'yyyy-MM-dd HH:mm') : '',
    trade.symbol || '',
    trade.direction || '',
    trade.session || '',
    trade.entry_price?.toString() || '',
    trade.exit_price?.toString() || '',
    trade.size?.toString() || '',
    trade.result_r?.toFixed(2) || '',
    trade.pnl?.toFixed(2) || '',
    trade.fees?.toFixed(2) || '',
    trade.setup_grade || '',
    trade.outcome || '',
    (trade.notes || '').replace(/"/g, '""'), // Escape quotes
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  return csvContent
}

/**
 * Export summary statistics to CSV
 */
export function exportSummaryToCSV(reportData: ReportData): string {
  const summary = [
    ['Report Period', `${reportData.dateFrom} to ${reportData.dateTo}`],
    [''],
    ['PERFORMANCE SUMMARY', ''],
    ['Total Trades', reportData.totalTrades.toString()],
    ['Winning Trades', reportData.winningTrades.toString()],
    ['Losing Trades', reportData.losingTrades.toString()],
    ['Break-Even Trades', reportData.breakEvenTrades.toString()],
    ['Win Rate', `${reportData.winRate.toFixed(2)}%`],
    [''],
    ['PROFIT & LOSS', ''],
    ['Total P&L (R)', reportData.totalPnL.toFixed(2)],
    ['Average Win (R)', reportData.avgWin.toFixed(2)],
    ['Average Loss (R)', reportData.avgLoss.toFixed(2)],
    ['Largest Win (R)', reportData.largestWin.toFixed(2)],
    ['Largest Loss (R)', reportData.largestLoss.toFixed(2)],
    ['Average R-Multiple', reportData.avgRMultiple.toFixed(2)],
    [''],
    ['METRICS', ''],
    ['Profit Factor', reportData.profitFactor.toFixed(2)],
    ['Expectancy (R)', reportData.expectancy.toFixed(2)],
    ['Average Hold Time (hours)', reportData.avgHoldTime.toFixed(2)],
    ['Total Fees', reportData.totalFees.toFixed(2)],
    ['Net Profit', reportData.netProfit.toFixed(2)],
    ['Best Day (R)', reportData.bestDay.toFixed(2)],
    ['Worst Day (R)', reportData.worstDay.toFixed(2)],
  ]

  return summary.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  return `${prefix}_${timestamp}.${extension}`
}

/**
 * Filter trades based on report criteria
 */
export function filterTrades(trades: Trade[], filter: ReportFilter): Trade[] {
  return trades.filter((trade) => {
    // Date range filter
    if (filter.dateFrom && trade.closed_at) {
      if (new Date(trade.closed_at) < new Date(filter.dateFrom)) return false
    }
    if (filter.dateTo && trade.closed_at) {
      if (new Date(trade.closed_at) > new Date(filter.dateTo)) return false
    }

    // Symbol filter
    if (filter.symbol && filter.symbol !== 'all') {
      if (trade.symbol !== filter.symbol) return false
    }

    // Session filter
    if (filter.session && filter.session !== 'all') {
      if (trade.session !== filter.session) return false
    }

    // Playbook filter
    if (filter.playbookId && filter.playbookId !== 'all') {
      if (trade.playbook_id !== filter.playbookId) return false
    }

    // Grade filter
    if (filter.minGrade && filter.minGrade !== 'all') {
      const gradeOrder = ['D', 'C', 'B', 'A', 'A+']
      const tradeGradeIndex = gradeOrder.indexOf(trade.setup_grade || 'D')
      const minGradeIndex = gradeOrder.indexOf(filter.minGrade)
      if (tradeGradeIndex < minGradeIndex) return false
    }

    // Outcome filter
    if (filter.outcomeFilter && filter.outcomeFilter !== 'all') {
      const resultR = trade.result_r || 0
      if (filter.outcomeFilter === 'wins' && resultR <= 0) return false
      if (filter.outcomeFilter === 'losses' && resultR >= 0) return false
      if (filter.outcomeFilter === 'breakeven' && resultR !== 0) return false
    }

    return true
  })
}

/**
 * Export trades by symbol breakdown
 */
export function exportSymbolBreakdown(reportData: ReportData): string {
  const bySymbol = new Map<
    string,
    { trades: number; wins: number; losses: number; totalR: number }
  >()

  reportData.trades.forEach((trade) => {
    const symbol = trade.symbol || 'Unknown'
    const existing = bySymbol.get(symbol) || { trades: 0, wins: 0, losses: 0, totalR: 0 }

    existing.trades++
    existing.totalR += trade.result_r || 0
    if ((trade.result_r || 0) > 0) existing.wins++
    if ((trade.result_r || 0) < 0) existing.losses++

    bySymbol.set(symbol, existing)
  })

  const headers = ['Symbol', 'Trades', 'Wins', 'Losses', 'Win Rate', 'Total R', 'Avg R']
  const rows = Array.from(bySymbol.entries())
    .sort((a, b) => b[1].totalR - a[1].totalR)
    .map(([symbol, data]) => [
      symbol,
      data.trades.toString(),
      data.wins.toString(),
      data.losses.toString(),
      `${((data.wins / data.trades) * 100).toFixed(2)}%`,
      data.totalR.toFixed(2),
      (data.totalR / data.trades).toFixed(2),
    ])

  return [headers.join(','), ...rows.map((row) => row.map((c) => `"${c}"`).join(','))].join('\n')
}

/**
 * Export trades by session breakdown
 */
export function exportSessionBreakdown(reportData: ReportData): string {
  const bySession = new Map<
    string,
    { trades: number; wins: number; losses: number; totalR: number }
  >()

  reportData.trades.forEach((trade) => {
    const session = trade.session || 'Unknown'
    const existing = bySession.get(session) || { trades: 0, wins: 0, losses: 0, totalR: 0 }

    existing.trades++
    existing.totalR += trade.result_r || 0
    if ((trade.result_r || 0) > 0) existing.wins++
    if ((trade.result_r || 0) < 0) existing.losses++

    bySession.set(session, existing)
  })

  const headers = ['Session', 'Trades', 'Wins', 'Losses', 'Win Rate', 'Total R', 'Avg R']
  const rows = Array.from(bySession.entries())
    .sort((a, b) => b[1].totalR - a[1].totalR)
    .map(([session, data]) => [
      session,
      data.trades.toString(),
      data.wins.toString(),
      data.losses.toString(),
      `${((data.wins / data.trades) * 100).toFixed(2)}%`,
      data.totalR.toFixed(2),
      (data.totalR / data.trades).toFixed(2),
    ])

  return [headers.join(','), ...rows.map((row) => row.map((c) => `"${c}"`).join(','))].join('\n')
}
