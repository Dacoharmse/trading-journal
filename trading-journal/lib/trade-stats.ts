/**
 * Trade Statistics and Analysis Functions
 * Re-exports from trade-calculations.ts for backwards compatibility
 * New code should import from trade-calculations.ts directly
 */

import { Trade } from '@/types/supabase'
import { TradeStats } from '@/types/trade'

// Re-export all calculation functions from the consolidated module
export {
  calculateR,
  calculateExpectancyR,
  calculateNetR,
  calculateSharpeR,
  calculateSortinoR,
  calculateMaxDrawdownR,
  calculateRecoveryFactorR,
  calculateDayWinPct,
  calculateTotalR,
  calculateWinRate,
  calculateProfitFactor,
  calculateTotalPnL,
  calculateTotalFees,
  calculateNetPnL,
  calculateHoldTime,
  removeOutliers,
  getTradeResult,
} from './trade-calculations'

const hoursFromMs = (ms: number) => ms / (1000 * 60 * 60)

/**
 * Calculate MAE (Maximum Adverse Excursion) in R
 * Placeholder - requires intra-trade data
 */
export function calculateMAE_R(trade: Trade): number | null {
  // This would need tick/bar data to calculate properly
  // For now, check if MAE is stored in trade object
  return trade.mae_r ?? null
}

/**
 * Calculate MFE (Maximum Favorable Excursion) in R
 * Placeholder - requires intra-trade data
 */
export function calculateMFE_R(trade: Trade): number | null {
  // This would need tick/bar data to calculate properly
  // For now, check if MFE is stored in trade object
  return trade.mfe_r ?? null
}

/**
 * Calculate Zella Score - A composite score from 0-100 evaluating trading performance
 * Based on 6 key metrics:
 * 1. Win Rate (20 points)
 * 2. Profit Factor (20 points)
 * 3. Avg Win/Loss Ratio (15 points)
 * 4. Consistency (15 points)
 * 5. Max Drawdown (15 points)
 * 6. Recovery Factor (15 points)
 */
export function calculateTraderScore(stats: TradeStats, totalBalance: number): number {
  // Return 0 if no trades
  if (!stats || stats.total_trades === 0) {
    return 0
  }

  let score = 0

  // 1. Win Rate Score (0-20 points)
  // Optimal: 50-70%, scales down outside this range
  const winRate = stats.win_rate || 0
  if (winRate >= 50 && winRate <= 70) {
    score += 20
  } else if (winRate >= 40 && winRate < 50) {
    score += 15 + ((winRate - 40) / 10) * 5
  } else if (winRate > 70 && winRate <= 80) {
    score += 15 + ((80 - winRate) / 10) * 5
  } else if (winRate >= 30 && winRate < 40) {
    score += 10 + ((winRate - 30) / 10) * 5
  } else if (winRate > 80 && winRate <= 90) {
    score += 10 + ((90 - winRate) / 10) * 5
  } else if (winRate >= 20 && winRate < 30) {
    score += 5 + ((winRate - 20) / 10) * 5
  } else if (winRate > 90) {
    score += 5
  }

  // 2. Profit Factor Score (0-20 points)
  // Optimal: 2.0+, scales from 1.0
  const profitFactor = stats.profit_factor || 0
  if (profitFactor >= 2.5) {
    score += 20
  } else if (profitFactor >= 2.0) {
    score += 18 + ((profitFactor - 2.0) / 0.5) * 2
  } else if (profitFactor >= 1.5) {
    score += 14 + ((profitFactor - 1.5) / 0.5) * 4
  } else if (profitFactor >= 1.2) {
    score += 10 + ((profitFactor - 1.2) / 0.3) * 4
  } else if (profitFactor >= 1.0) {
    score += 5 + ((profitFactor - 1.0) / 0.2) * 5
  }

  // 3. Avg Win/Loss Ratio Score (0-15 points)
  const avgWin = Math.abs(stats.avg_win || 0)
  const avgLoss = Math.abs(stats.avg_loss || 0)
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0
  if (winLossRatio >= 2.0) {
    score += 15
  } else if (winLossRatio >= 1.5) {
    score += 12 + ((winLossRatio - 1.5) / 0.5) * 3
  } else if (winLossRatio >= 1.0) {
    score += 8 + ((winLossRatio - 1.0) / 0.5) * 4
  } else if (winLossRatio >= 0.5) {
    score += 4 + ((winLossRatio - 0.5) / 0.5) * 4
  }

  // 4. Consistency Score (0-15 points)
  // Based on ratio of best day to worst day (lower is better = more consistent)
  const bestDay = Math.abs(stats.best_day || 0)
  const worstDay = Math.abs(stats.worst_day || 0)
  const volatility = worstDay > 0 ? bestDay / worstDay : 0
  if (volatility > 0 && volatility <= 2) {
    score += 15 // Very consistent
  } else if (volatility <= 3) {
    score += 12 + ((3 - volatility) / 1) * 3
  } else if (volatility <= 5) {
    score += 8 + ((5 - volatility) / 2) * 4
  } else if (volatility <= 10) {
    score += 4 + ((10 - volatility) / 5) * 4
  }

  // 5. Max Drawdown Score (0-15 points)
  // Lower drawdown relative to total profit = better
  const netProfit = stats.net_profit || 0
  const maxDrawdown = Math.abs(stats.worst_day || 0)
  const drawdownRatio = netProfit > 0 ? (maxDrawdown / netProfit) * 100 : 100
  if (drawdownRatio <= 10) {
    score += 15
  } else if (drawdownRatio <= 20) {
    score += 12 + ((20 - drawdownRatio) / 10) * 3
  } else if (drawdownRatio <= 30) {
    score += 8 + ((30 - drawdownRatio) / 10) * 4
  } else if (drawdownRatio <= 50) {
    score += 4 + ((50 - drawdownRatio) / 20) * 4
  }

  // 6. Recovery Factor Score (0-15 points)
  // Net profit divided by max drawdown
  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0
  if (recoveryFactor >= 5) {
    score += 15
  } else if (recoveryFactor >= 3) {
    score += 12 + ((recoveryFactor - 3) / 2) * 3
  } else if (recoveryFactor >= 2) {
    score += 9 + ((recoveryFactor - 2) / 1) * 3
  } else if (recoveryFactor >= 1) {
    score += 5 + ((recoveryFactor - 1) / 1) * 4
  }

  // Cap at 100
  return Math.min(100, Math.max(0, Math.round(score * 100) / 100))
}

export function calculateTradeStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      total_trades: 0,
      win_rate: 0,
      total_pnl: 0,
      avg_win: 0,
      avg_loss: 0,
      profit_factor: 0,
      best_day: 0,
      worst_day: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_fees: 0,
      net_profit: 0,
      roi_percentage: 0,
    }
  }

  // Use all trades with a recorded PnL (open trades with pnl set count toward stats)
  const closedTrades = trades.filter((trade) => trade.status === 'closed' || (trade.pnl != null && trade.pnl !== 0) || trade.outcome)
  const winningTrades = closedTrades.filter((trade) => {
    if (trade.pnl > 0) return true
    if (trade.pnl < 0) return false
    // pnl === 0: use outcome field as tiebreaker
    return trade.outcome === 'win'
  })
  const losingTrades = closedTrades.filter((trade) => {
    if (trade.pnl < 0) return true
    if (trade.pnl > 0) return false
    return trade.outcome === 'loss'
  })

  const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
  const totalFees = trades.reduce((sum, trade) => sum + ((trade.fees ?? 0) + (trade.commission ?? 0) + (trade.swap ?? 0) + (trade.slippage ?? 0)), 0)
  const grossWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLosses = Math.abs(
    losingTrades.reduce((sum, trade) => sum + trade.pnl, 0),
  )

  const avgWin = winningTrades.length ? grossWins / winningTrades.length : 0
  const avgLoss = losingTrades.length
    ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) /
      losingTrades.length
    : 0

  const rawProfitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0

  let bestDay = Number.NEGATIVE_INFINITY
  let worstDay = Number.POSITIVE_INFINITY
  const dailyPnL = new Map<string, number>()

  trades.forEach((trade) => {
    const entryDate = new Date(trade.entry_date)
    if (Number.isNaN(entryDate.getTime())) {
      return
    }
    const key = entryDate.toISOString().slice(0, 10)
    const current = dailyPnL.get(key) ?? 0
    const updated = current + (trade.pnl ?? 0)
    dailyPnL.set(key, updated)
  })

  if (dailyPnL.size === 0) {
    bestDay = 0
    worstDay = 0
  } else {
    bestDay = Math.max(...dailyPnL.values())
    worstDay = Math.min(...dailyPnL.values())
  }

  const largestWin = winningTrades.length
    ? Math.max(...winningTrades.map((trade) => trade.pnl))
    : 0
  const largestLoss = losingTrades.length
    ? Math.min(...losingTrades.map((trade) => trade.pnl))
    : 0

  const avgDurationHours = (() => {
    const durations = closedTrades
      .filter((trade) => trade.exit_date || trade.close_time)
      .map((trade) => {
        const exitBaseDate = trade.exit_date || trade.entry_date
        const entryStr = trade.open_time
          ? `${trade.entry_date}T${trade.open_time}`
          : trade.entry_date
        const exitStr = trade.close_time
          ? `${exitBaseDate}T${trade.close_time}`
          : exitBaseDate
        const entry = new Date(entryStr)
        const exit = new Date(exitStr)
        return exit.getTime() - entry.getTime()
      })
      .filter((ms) => ms > 0)

    if (durations.length === 0) {
      return undefined
    }

    const avgMs = durations.reduce((sum, ms) => sum + ms, 0) / durations.length
    return Number(hoursFromMs(avgMs).toFixed(2))
  })()

  const averageRiskReward = (() => {
    const ratios = trades
      .map((trade) => trade.rr_planned ?? trade.r_multiple ?? null)
      .filter((ratio): ratio is number => ratio !== null && Number.isFinite(ratio))
    if (!ratios.length) {
      return undefined
    }
    const average = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
    return Number(average.toFixed(2))
  })()

  return {
    total_trades: trades.length,
    win_rate: closedTrades.length
      ? Number(((winningTrades.length / closedTrades.length) * 100).toFixed(2))
      : 0,
    total_pnl: Number(totalPnl.toFixed(2)),
    avg_win: Number(avgWin.toFixed(2)),
    avg_loss: Number(avgLoss.toFixed(2)),
    profit_factor: Number.isNaN(rawProfitFactor) ? 0
      : Number.isFinite(rawProfitFactor) ? Number(rawProfitFactor.toFixed(2))
      : Infinity,
    best_day: Number(bestDay.toFixed(2)),
    worst_day: Number(worstDay.toFixed(2)),
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    largest_win: Number(largestWin.toFixed(2)),
    largest_loss: Number(largestLoss.toFixed(2)),
    avg_trade_duration: avgDurationHours,
    total_fees: Number(totalFees.toFixed(2)),
    net_profit: Number((totalPnl - totalFees).toFixed(2)),
    avg_risk_reward: averageRiskReward,
    roi_percentage: 0,
  }
}
