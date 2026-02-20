/**
 * Calendar Utilities
 * Helper functions for calendar calculations, color scaling, and streak tracking
 */

import type { Trade } from '@/types/trade'
import { calculateR } from './trade-stats'

export interface DailyStats {
  date: string // YYYY-MM-DD
  trades: number
  totalPnL: number
  totalR: number
  winRate: number
  currency: string
  tradesList: Trade[]
}

/**
 * Get all days in a month
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1)
  const days: Date[] = []

  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }

  return days
}

/**
 * Get calendar grid (including leading/trailing days from adjacent months)
 */
export function getCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const grid: Date[] = []

  // Add leading days from previous month
  const firstDayOfWeek = firstDay.getDay() // 0 = Sunday
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    grid.push(date)
  }

  // Add days of current month
  const daysInMonth = getDaysInMonth(year, month)
  grid.push(...daysInMonth)

  // Add trailing days from next month to complete the grid (42 cells = 6 weeks)
  const remainingCells = 42 - grid.length
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i)
    grid.push(date)
  }

  return grid
}

/**
 * Format a Date as a local YYYY-MM-DD string (avoids UTC timezone shift)
 */
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Group trades by day
 */
export function groupTradesByDay(
  trades: Trade[],
  displayUnit: 'currency' | 'r' = 'currency'
): Map<string, DailyStats> {
  const dailyMap = new Map<string, DailyStats>()

  trades.forEach(trade => {
    const rawDate = trade.exit_date || trade.entry_date
    // Append T00:00 to date-only strings so they parse as local time, not UTC midnight
    const dateStr = rawDate.length === 10 ? `${rawDate}T00:00` : rawDate
    const tradeDate = new Date(dateStr)
    const dateKey = localDateKey(tradeDate)

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        trades: 0,
        totalPnL: 0,
        totalR: 0,
        winRate: 0,
        currency: 'USD',
        tradesList: [],
      })
    }

    const dayStats = dailyMap.get(dateKey)!
    const r = calculateR(trade) || 0

    dayStats.trades += 1
    dayStats.totalPnL += trade.pnl
    dayStats.totalR += r
    dayStats.tradesList.push(trade)
  })

  // Calculate win rates
  dailyMap.forEach((stats) => {
    const wins = stats.tradesList.filter(t => (calculateR(t) || 0) > 0).length
    stats.winRate = stats.trades > 0 ? (wins / stats.trades) * 100 : 0
  })

  return dailyMap
}

/**
 * Get color for P&L amount (intensity based on magnitude)
 */
export function getPnLColor(pnl: number, maxAbsValue: number): string {
  if (pnl === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-500'

  const intensity = Math.min(Math.abs(pnl) / maxAbsValue, 1)

  if (pnl > 0) {
    // Green scale for profits
    if (intensity > 0.8) return 'bg-green-600 dark:bg-green-700 text-white font-bold'
    if (intensity > 0.6) return 'bg-green-500 dark:bg-green-600 text-white font-semibold'
    if (intensity > 0.4) return 'bg-green-400 dark:bg-green-500 text-white'
    if (intensity > 0.2) return 'bg-green-300 dark:bg-green-400 text-green-900'
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
  } else {
    // Red scale for losses
    if (intensity > 0.8) return 'bg-red-600 dark:bg-red-700 text-white font-bold'
    if (intensity > 0.6) return 'bg-red-500 dark:bg-red-600 text-white font-semibold'
    if (intensity > 0.4) return 'bg-red-400 dark:bg-red-500 text-white'
    if (intensity > 0.2) return 'bg-red-300 dark:bg-red-400 text-red-900'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }
}

/**
 * Calculate trading streaks
 */
export function calculateStreaks(dailyStats: Map<string, DailyStats>): {
  currentStreak: number
  currentStreakType: 'win' | 'loss' | 'none'
  bestWinStreak: number
  bestWinStreakDates: { start: string; end: string } | null
  worstLossStreak: number
  worstLossStreakDates: { start: string; end: string } | null
} {
  const sortedDates = Array.from(dailyStats.keys()).sort()

  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      currentStreakType: 'none',
      bestWinStreak: 0,
      bestWinStreakDates: null,
      worstLossStreak: 0,
      worstLossStreakDates: null,
    }
  }

  // Calculate current streak (from most recent day backward)
  let currentStreak = 0
  let currentStreakType: 'win' | 'loss' | 'none' = 'none'

  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const stats = dailyStats.get(sortedDates[i])!
    const isWin = stats.totalR > 0

    if (i === sortedDates.length - 1) {
      // First iteration (most recent day)
      currentStreak = 1
      currentStreakType = isWin ? 'win' : 'loss'
    } else {
      // Check if streak continues
      if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) {
        currentStreak++
      } else {
        break // Streak broken
      }
    }
  }

  // Calculate best win streak
  let bestWinStreak = 0
  let bestWinStart = ''
  let bestWinEnd = ''
  let tempWinStreak = 0
  let tempWinStart = ''

  sortedDates.forEach((date) => {
    const stats = dailyStats.get(date)!
    if (stats.totalR > 0) {
      if (tempWinStreak === 0) tempWinStart = date
      tempWinStreak++

      if (tempWinStreak > bestWinStreak) {
        bestWinStreak = tempWinStreak
        bestWinStart = tempWinStart
        bestWinEnd = date
      }
    } else {
      tempWinStreak = 0
    }
  })

  // Calculate worst loss streak
  let worstLossStreak = 0
  let worstLossStart = ''
  let worstLossEnd = ''
  let tempLossStreak = 0
  let tempLossStart = ''

  sortedDates.forEach((date) => {
    const stats = dailyStats.get(date)!
    if (stats.totalR < 0) {
      if (tempLossStreak === 0) tempLossStart = date
      tempLossStreak++

      if (tempLossStreak > worstLossStreak) {
        worstLossStreak = tempLossStreak
        worstLossStart = tempLossStart
        worstLossEnd = date
      }
    } else {
      tempLossStreak = 0
    }
  })

  return {
    currentStreak,
    currentStreakType,
    bestWinStreak,
    bestWinStreakDates: bestWinStart ? { start: bestWinStart, end: bestWinEnd } : null,
    worstLossStreak,
    worstLossStreakDates: worstLossStart ? { start: worstLossStart, end: worstLossEnd } : null,
  }
}

/**
 * Get weekday statistics
 */
export function getWeekdayStats(dailyStats: Map<string, DailyStats>): Array<{
  day: string
  dayIndex: number
  avgR: number
  avgPnL: number
  totalTrades: number
  winRate: number
}> {
  const weekdayMap = new Map<number, { totalR: number; totalPnL: number; days: number; totalTrades: number; wins: number }>()

  // Initialize all weekdays
  for (let i = 0; i < 7; i++) {
    weekdayMap.set(i, { totalR: 0, totalPnL: 0, days: 0, totalTrades: 0, wins: 0 })
  }

  // Aggregate by weekday
  dailyStats.forEach((stats, dateStr) => {
    const date = new Date(dateStr)
    const dayIndex = date.getDay() // 0 = Sunday

    const dayData = weekdayMap.get(dayIndex)!
    dayData.totalR += stats.totalR
    dayData.totalPnL += stats.totalPnL
    dayData.days += 1
    dayData.totalTrades += stats.trades

    const dayWins = stats.tradesList.filter(t => (calculateR(t) || 0) > 0).length
    dayData.wins += dayWins
  })

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return Array.from(weekdayMap.entries()).map(([dayIndex, data]) => ({
    day: dayNames[dayIndex],
    dayIndex,
    avgR: data.days > 0 ? data.totalR / data.days : 0,
    avgPnL: data.days > 0 ? data.totalPnL / data.days : 0,
    totalTrades: data.totalTrades,
    winRate: data.totalTrades > 0 ? (data.wins / data.totalTrades) * 100 : 0,
  }))
}

/**
 * Format date for display
 */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if date is in current month
 */
export function isCurrentMonth(date: Date, month: number): boolean {
  return date.getMonth() === month
}
