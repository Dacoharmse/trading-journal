/**
 * Performance Calculation Utilities
 * Advanced trading performance metrics and analytics
 */

import type { Trade } from '@/types/supabase'
import { format, differenceInDays, startOfDay, eachDayOfInterval } from 'date-fns'

export interface EquityCurvePoint {
  date: string
  equity: number
  drawdown: number
  drawdownPercent: number
  trades: number
  dailyReturn: number
}

export interface DrawdownPeriod {
  start: string
  end: string
  depth: number
  depthPercent: number
  duration: number
  recovery?: string
}

export interface PerformanceMetrics {
  totalTrades: number
  winRate: number
  profitFactor: number
  expectancy: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  avgDrawdown: number
  avgDrawdownDuration: number
  longestDrawdownDuration: number
  recoveryFactor: number
  profitPerTrade: number
  avgWin: number
  avgLoss: number
  avgRMultiple: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
  avgHoldTime: number
  avgWinHoldTime: number
  avgLossHoldTime: number
  totalVolume: number
  avgTradesPerDay: number
  profitableMonths: number
  totalMonths: number
  bestMonth: number
  worstMonth: number
  avgMonthlyReturn: number
  monthlyReturnStdDev: number
}

export interface MonthlyPerformance {
  month: string
  trades: number
  profit: number
  winRate: number
  profitFactor: number
  avgR: number
}

export interface DailyStats {
  date: string
  trades: number
  profit: number
  winRate: number
  wins: number
  losses: number
}

/**
 * Calculate equity curve from trades
 */
export function calculateEquityCurve(
  trades: Trade[],
  startingBalance: number = 10000
): EquityCurvePoint[] {
  const sortedTrades = [...trades]
    .filter((t) => t.closed_at)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime())

  if (sortedTrades.length === 0) return []

  const points: EquityCurvePoint[] = []
  let equity = startingBalance
  let peak = startingBalance
  let tradesCount = 0

  // Group trades by day
  const tradesByDay = new Map<string, Trade[]>()
  sortedTrades.forEach((trade) => {
    const day = format(new Date(trade.closed_at!), 'yyyy-MM-dd')
    if (!tradesByDay.has(day)) {
      tradesByDay.set(day, [])
    }
    tradesByDay.get(day)!.push(trade)
  })

  // Calculate equity for each day
  const days = Array.from(tradesByDay.keys()).sort()

  days.forEach((day) => {
    const dayTrades = tradesByDay.get(day)!
    const dailyProfit = dayTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
    const riskPerTrade = startingBalance * 0.01 // Assume 1% risk per R
    const dollarProfit = dailyProfit * riskPerTrade

    const prevEquity = equity
    equity += dollarProfit
    tradesCount += dayTrades.length

    if (equity > peak) {
      peak = equity
    }

    const drawdown = peak - equity
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0
    const dailyReturn = prevEquity > 0 ? ((equity - prevEquity) / prevEquity) * 100 : 0

    points.push({
      date: day,
      equity,
      drawdown,
      drawdownPercent,
      trades: tradesCount,
      dailyReturn,
    })
  })

  return points
}

/**
 * Identify all drawdown periods
 */
export function identifyDrawdownPeriods(equityCurve: EquityCurvePoint[]): DrawdownPeriod[] {
  const drawdowns: DrawdownPeriod[] = []
  let inDrawdown = false
  let drawdownStart: EquityCurvePoint | null = null
  let maxDepth = 0
  let maxDepthPercent = 0

  equityCurve.forEach((point, idx) => {
    if (point.drawdown > 0) {
      if (!inDrawdown) {
        // Start of new drawdown
        inDrawdown = true
        drawdownStart = point
        maxDepth = point.drawdown
        maxDepthPercent = point.drawdownPercent
      } else {
        // Update max depth
        if (point.drawdown > maxDepth) {
          maxDepth = point.drawdown
          maxDepthPercent = point.drawdownPercent
        }
      }
    } else if (inDrawdown && point.drawdown === 0) {
      // End of drawdown
      if (drawdownStart) {
        const start = new Date(drawdownStart.date)
        const end = new Date(point.date)
        const duration = differenceInDays(end, start)

        drawdowns.push({
          start: drawdownStart.date,
          end: point.date,
          depth: maxDepth,
          depthPercent: maxDepthPercent,
          duration,
          recovery: point.date,
        })
      }

      inDrawdown = false
      drawdownStart = null
      maxDepth = 0
      maxDepthPercent = 0
    }
  })

  // Handle ongoing drawdown
  if (inDrawdown && drawdownStart) {
    const lastPoint = equityCurve[equityCurve.length - 1]
    const start = new Date(drawdownStart.date)
    const end = new Date(lastPoint.date)
    const duration = differenceInDays(end, start)

    drawdowns.push({
      start: drawdownStart.date,
      end: lastPoint.date,
      depth: maxDepth,
      depthPercent: maxDepthPercent,
      duration,
    })
  }

  return drawdowns
}

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(
  trades: Trade[],
  startingBalance: number = 10000
): PerformanceMetrics {
  const closedTrades = trades.filter((t) => t.closed_at)
  const wins = closedTrades.filter((t) => (t.r_multiple || 0) > 0)
  const losses = closedTrades.filter((t) => (t.r_multiple || 0) < 0)

  // Basic metrics
  const totalTrades = closedTrades.length
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0

  const totalProfitR = wins.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
  const totalLossR = Math.abs(losses.reduce((sum, t) => sum + (t.r_multiple || 0), 0))
  const profitFactor = totalLossR > 0 ? totalProfitR / totalLossR : 0

  const avgWin = wins.length > 0 ? totalProfitR / wins.length : 0
  const avgLoss = losses.length > 0 ? totalLossR / losses.length : 0

  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
  const avgRMultiple =
    totalTrades > 0 ? closedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / totalTrades : 0

  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.r_multiple || 0)) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.r_multiple || 0)) : 0

  // Calculate equity curve and drawdowns
  const equityCurve = calculateEquityCurve(closedTrades, startingBalance)
  const drawdowns = identifyDrawdownPeriods(equityCurve)

  const maxDrawdown = drawdowns.length > 0 ? Math.max(...drawdowns.map((d) => d.depth)) : 0
  const maxDrawdownPercent =
    drawdowns.length > 0 ? Math.max(...drawdowns.map((d) => d.depthPercent)) : 0
  const avgDrawdown =
    drawdowns.length > 0 ? drawdowns.reduce((sum, d) => sum + d.depth, 0) / drawdowns.length : 0
  const avgDrawdownDuration =
    drawdowns.length > 0
      ? drawdowns.reduce((sum, d) => sum + d.duration, 0) / drawdowns.length
      : 0
  const longestDrawdownDuration =
    drawdowns.length > 0 ? Math.max(...drawdowns.map((d) => d.duration)) : 0

  // Calculate returns for Sharpe/Sortino
  const dailyReturns = equityCurve.map((p) => p.dailyReturn)
  const avgDailyReturn =
    dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0
  const returnStdDev = calculateStdDev(dailyReturns)

  const negativeReturns = dailyReturns.filter((r) => r < 0)
  const downsideDeviation = calculateStdDev(negativeReturns)

  const sharpeRatio =
    returnStdDev > 0 ? (avgDailyReturn * Math.sqrt(252)) / (returnStdDev * Math.sqrt(252)) : 0
  const sortinoRatio =
    downsideDeviation > 0
      ? (avgDailyReturn * Math.sqrt(252)) / (downsideDeviation * Math.sqrt(252))
      : 0

  // Calmar Ratio = Annual Return / Max Drawdown %
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : startingBalance
  const totalReturn = ((finalEquity - startingBalance) / startingBalance) * 100
  const calmarRatio = maxDrawdownPercent > 0 ? totalReturn / maxDrawdownPercent : 0

  // Recovery Factor = Total Profit / Max Drawdown
  const recoveryFactor = maxDrawdown > 0 ? (finalEquity - startingBalance) / maxDrawdown : 0

  // Consecutive wins/losses
  let consecutiveWins = 0
  let consecutiveLosses = 0
  let currentWinStreak = 0
  let currentLossStreak = 0

  closedTrades.forEach((trade) => {
    const r = trade.r_multiple || 0
    if (r > 0) {
      currentWinStreak++
      currentLossStreak = 0
      if (currentWinStreak > consecutiveWins) consecutiveWins = currentWinStreak
    } else if (r < 0) {
      currentLossStreak++
      currentWinStreak = 0
      if (currentLossStreak > consecutiveLosses) consecutiveLosses = currentLossStreak
    }
  })

  // Hold time metrics
  const tradesWithDuration = closedTrades.filter((t) => t.opened_at && t.closed_at)
  const avgHoldTime =
    tradesWithDuration.length > 0
      ? tradesWithDuration.reduce((sum, t) => {
          const hours =
            (new Date(t.closed_at!).getTime() - new Date(t.opened_at!).getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / tradesWithDuration.length
      : 0

  const winsWithDuration = wins.filter((t) => t.opened_at && t.closed_at)
  const avgWinHoldTime =
    winsWithDuration.length > 0
      ? winsWithDuration.reduce((sum, t) => {
          const hours =
            (new Date(t.closed_at!).getTime() - new Date(t.opened_at!).getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / winsWithDuration.length
      : 0

  const lossesWithDuration = losses.filter((t) => t.opened_at && t.closed_at)
  const avgLossHoldTime =
    lossesWithDuration.length > 0
      ? lossesWithDuration.reduce((sum, t) => {
          const hours =
            (new Date(t.closed_at!).getTime() - new Date(t.opened_at!).getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / lossesWithDuration.length
      : 0

  // Volume and frequency
  const totalVolume = closedTrades.reduce((sum, t) => sum + (t.size || 0), 0)
  const firstTrade = closedTrades.length > 0 ? new Date(closedTrades[0].closed_at!) : new Date()
  const lastTrade =
    closedTrades.length > 0 ? new Date(closedTrades[closedTrades.length - 1].closed_at!) : new Date()
  const tradingDays = Math.max(1, differenceInDays(lastTrade, firstTrade))
  const avgTradesPerDay = totalTrades / tradingDays

  // Monthly stats
  const monthlyData = calculateMonthlyPerformance(closedTrades)
  const profitableMonths = monthlyData.filter((m) => m.profit > 0).length
  const totalMonths = monthlyData.length
  const bestMonth = monthlyData.length > 0 ? Math.max(...monthlyData.map((m) => m.profit)) : 0
  const worstMonth = monthlyData.length > 0 ? Math.min(...monthlyData.map((m) => m.profit)) : 0
  const avgMonthlyReturn =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, m) => sum + m.profit, 0) / monthlyData.length
      : 0
  const monthlyReturnStdDev = calculateStdDev(monthlyData.map((m) => m.profit))

  const profitPerTrade = totalTrades > 0 ? (finalEquity - startingBalance) / totalTrades : 0

  return {
    totalTrades,
    winRate,
    profitFactor,
    expectancy,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    maxDrawdown,
    maxDrawdownPercent,
    avgDrawdown,
    avgDrawdownDuration,
    longestDrawdownDuration,
    recoveryFactor,
    profitPerTrade,
    avgWin,
    avgLoss,
    avgRMultiple,
    largestWin,
    largestLoss,
    consecutiveWins,
    consecutiveLosses,
    avgHoldTime,
    avgWinHoldTime,
    avgLossHoldTime,
    totalVolume,
    avgTradesPerDay,
    profitableMonths,
    totalMonths,
    bestMonth,
    worstMonth,
    avgMonthlyReturn,
    monthlyReturnStdDev,
  }
}

/**
 * Calculate monthly performance breakdown
 */
export function calculateMonthlyPerformance(trades: Trade[]): MonthlyPerformance[] {
  const closedTrades = trades.filter((t) => t.closed_at)
  const monthlyMap = new Map<string, Trade[]>()

  closedTrades.forEach((trade) => {
    const month = format(new Date(trade.closed_at!), 'yyyy-MM')
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, [])
    }
    monthlyMap.get(month)!.push(trade)
  })

  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, monthTrades]) => {
      const wins = monthTrades.filter((t) => (t.r_multiple || 0) > 0)
      const losses = monthTrades.filter((t) => (t.r_multiple || 0) < 0)
      const profit = monthTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
      const winRate = monthTrades.length > 0 ? (wins.length / monthTrades.length) * 100 : 0

      const totalWin = wins.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
      const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.r_multiple || 0), 0))
      const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0

      const avgR = monthTrades.length > 0 ? profit / monthTrades.length : 0

      return {
        month,
        trades: monthTrades.length,
        profit,
        winRate,
        profitFactor,
        avgR,
      }
    })
}

/**
 * Calculate daily statistics
 */
export function calculateDailyStats(trades: Trade[]): DailyStats[] {
  const closedTrades = trades.filter((t) => t.closed_at)
  const dailyMap = new Map<string, Trade[]>()

  closedTrades.forEach((trade) => {
    const day = format(new Date(trade.closed_at!), 'yyyy-MM-dd')
    if (!dailyMap.has(day)) {
      dailyMap.set(day, [])
    }
    dailyMap.get(day)!.push(trade)
  })

  return Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayTrades]) => {
      const wins = dayTrades.filter((t) => (t.r_multiple || 0) > 0).length
      const losses = dayTrades.filter((t) => (t.r_multiple || 0) < 0).length
      const profit = dayTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
      const winRate = dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0

      return {
        date,
        trades: dayTrades.length,
        profit,
        winRate,
        wins,
        losses,
      }
    })
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length

  return Math.sqrt(variance)
}
