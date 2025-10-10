"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown } from "lucide-react"
import { calculateTradeStats, calculateTraderScore } from "@/lib/trade-stats"
import { useTradeStore, useAccountStore } from "@/stores"

// Equity Curve Component
function EquityCurveCard({
  accountName,
  accountPnL,
  accountBalance,
  accountCurrency,
  equityCurveData
}: {
  accountName: string
  accountPnL: number
  accountBalance: number
  accountCurrency: string
  equityCurveData: Array<{ date: string; pnl: number }>
}) {
  const [timeRange, setTimeRange] = React.useState<'weekly' | 'monthly'>('monthly')

  const maxPnL = equityCurveData.length > 0 ? Math.max(...equityCurveData.map(d => d.pnl), 0) : 0
  const minPnL = equityCurveData.length > 0 ? Math.min(...equityCurveData.map(d => d.pnl), 0) : 0
  const range = maxPnL - minPnL || 1

  const formatCurrency = (value: number, currency: string = "USD") => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safeValue)
    } catch {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safeValue)
    }
  }

  return (
    <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{accountName}</CardTitle>
            <CardDescription className="text-xs">Equity Curve</CardDescription>
          </div>
          <div className="flex gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => setTimeRange('weekly')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'weekly' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('monthly')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === 'monthly' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className={`text-2xl font-bold ${accountPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {accountPnL >= 0 ? '+' : ''}{formatCurrency(accountPnL, accountCurrency)}
          </div>
          <div className="text-xs text-muted-foreground">
            Balance: {formatCurrency(accountBalance, accountCurrency)}
          </div>
        </div>
        <div className="flex gap-2">
          {equityCurveData.length > 0 && (
            <div className="flex flex-col justify-between text-xs text-muted-foreground w-12 text-right pr-2">
              <span>${(maxPnL / 1000).toFixed(1)}k</span>
              <span>${((maxPnL + minPnL) / 2000).toFixed(1)}k</span>
              <span>${(minPnL / 1000).toFixed(1)}k</span>
            </div>
          )}
          <div className="flex-1">
            <div className="h-32">
              {equityCurveData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                  No trades in this period
                </div>
              ) : (
                <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`gradient-${accountName}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={accountPnL >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={accountPnL >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const points = equityCurveData.map((d, i) => {
                      const x = (i / (equityCurveData.length - 1 || 1)) * 300
                      const y = 100 - ((d.pnl - minPnL) / range) * 90
                      return `${x},${y}`
                    }).join(' L ')

                    const baselineY = 100 - ((0 - minPnL) / range) * 90
                    const areaPath = `M 0,${baselineY} L ${points} L 300,${baselineY} Z`
                    const linePath = `M ${points}`

                    return (
                      <>
                        <path d={areaPath} fill={`url(#gradient-${accountName})`} />
                        <path
                          d={linePath}
                          fill="none"
                          stroke={accountPnL >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                          strokeWidth="2"
                        />
                      </>
                    )
                  })()}
                </svg>
              )}
            </div>
            {equityCurveData.length > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                {equityCurveData.map((d, i) => (
                  <span key={i} className={i % 2 === 0 || equityCurveData.length <= 4 ? '' : 'invisible'}>
                    {d.date}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const trades = useTradeStore((state) => state.trades)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  // State for global account filter
  const [globalAccountFilter, setGlobalAccountFilter] = React.useState<string>('all')

  // State for Trading Day Performance account selector
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null)

  // State for Recent Trades tab
  const [activeTab, setActiveTab] = React.useState<'recent' | 'open'>('recent')

  React.useEffect(() => {
    void fetchTrades()
    void fetchAccounts()
  }, [fetchTrades, fetchAccounts])

  // Update selected account when accounts change
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  // Filter trades based on global account selection
  const filteredTrades = React.useMemo(() => {
    if (globalAccountFilter === 'all') {
      return trades
    }
    return trades.filter(trade => trade.account_id === globalAccountFilter)
  }, [trades, globalAccountFilter])

  const stats = React.useMemo(() => calculateTradeStats(filteredTrades), [filteredTrades])

  // Calculate additional stats
  const totalPnL = stats.net_profit || 0
  const winRate = stats.win_rate || 0
  const profitFactor = stats.profit_factor || 0
  const avgWin = stats.avg_win || 0
  const avgLoss = Math.abs(stats.avg_loss || 0)

  // Calculate average R:R ratio from trades
  const avgRiskReward = React.useMemo(() => {
    const tradesWithRR = filteredTrades.filter(t => t.risk_reward_ratio && t.risk_reward_ratio > 0)
    if (tradesWithRR.length === 0) return 0
    const totalRR = tradesWithRR.reduce((sum, t) => sum + (t.risk_reward_ratio || 0), 0)
    return totalRR / tradesWithRR.length
  }, [filteredTrades])

  // Calculate average holding period from trades
  const avgHoldingPeriod = React.useMemo(() => {
    const closedTrades = filteredTrades.filter(t => t.exit_date && t.entry_date)
    if (closedTrades.length === 0) return '0m'

    const totalMinutes = closedTrades.reduce((sum, t) => {
      const entryTime = new Date(t.entry_date).getTime()
      const exitTime = new Date(t.exit_date!).getTime()
      return sum + (exitTime - entryTime) / (1000 * 60) // Convert to minutes
    }, 0)

    const avgMinutes = totalMinutes / closedTrades.length

    // Format as hours/days if appropriate
    if (avgMinutes < 60) return `${Math.round(avgMinutes)}m`
    if (avgMinutes < 1440) return `${Math.round(avgMinutes / 60)}h`
    return `${Math.round(avgMinutes / 1440)}d`
  }, [filteredTrades])

  // Day-based stats
  const dayWinRate = 57.58 // Calculate from daily data

  // Calculate total account balance
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.metrics?.currentBalance || 0), 0)

  // Calculate Trader Score
  const traderScore = React.useMemo(() =>
    calculateTraderScore(stats, totalBalance),
    [stats, totalBalance]
  )

  // Calculate individual metric scores for radar chart
  const metricScores = React.useMemo(() => {
    // If no trades, return 0 for all metrics
    if (stats.total_trades === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        avgWinLoss: 0,
        consistency: 0,
        maxDrawdown: 0,
        recoveryFactor: 0,
      };
    }

    // Normalize each metric to 0-100 scale for visualization
    const normalizeWinRate = (wr: number) => {
      if (wr >= 50 && wr <= 70) return 100;
      if (wr >= 40 && wr < 50) return 75 + ((wr - 40) / 10) * 25;
      if (wr > 70 && wr <= 80) return 75 + ((80 - wr) / 10) * 25;
      if (wr >= 30 && wr < 40) return 50 + ((wr - 30) / 10) * 25;
      return Math.min(100, wr);
    };

    const normalizeProfitFactor = (pf: number) => {
      if (pf >= 2.5) return 100;
      if (pf >= 2.0) return 90 + ((pf - 2.0) / 0.5) * 10;
      if (pf >= 1.5) return 70 + ((pf - 1.5) / 0.5) * 20;
      if (pf >= 1.0) return 50 + ((pf - 1.0) / 0.5) * 20;
      return pf * 50;
    };

    const normalizeWinLoss = (ratio: number) => {
      if (ratio >= 2.0) return 100;
      if (ratio >= 1.5) return 80 + ((ratio - 1.5) / 0.5) * 20;
      if (ratio >= 1.0) return 60 + ((ratio - 1.0) / 0.5) * 20;
      return ratio * 60;
    };

    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const bestDay = Math.abs(stats.best_day || 0);
    const worstDay = Math.abs(stats.worst_day || 0);
    const volatility = worstDay > 0 ? bestDay / worstDay : 0;
    const consistency = volatility > 0 && volatility <= 2 ? 100 : Math.max(0, 100 - (volatility * 10));

    const maxDrawdown = worstDay;
    const drawdownScore = maxDrawdown > 0 ? Math.max(0, 100 - ((maxDrawdown / (totalPnL || 1)) * 100)) : 0;

    const recoveryFactor = maxDrawdown > 0 ? (totalPnL / maxDrawdown) : 0;
    const recoveryScore = Math.min(100, recoveryFactor * 20);

    return {
      winRate: normalizeWinRate(winRate),
      profitFactor: normalizeProfitFactor(profitFactor),
      avgWinLoss: normalizeWinLoss(winLossRatio),
      consistency,
      maxDrawdown: drawdownScore,
      recoveryFactor: recoveryScore,
    };
  }, [stats, winRate, profitFactor, avgWin, avgLoss, totalPnL])

  const formatCurrency = (value: number, currency: string = "USD") => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safeValue)
    } catch {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safeValue)
    }
  }

  const formatPercent = (value: number) => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
    return `${safeValue.toFixed(2)}%`
  }

  // Calculate equity curve data from trades
  const equityCurveData = React.useMemo(() => {
    if (trades.length === 0) return []

    // Sort trades by exit date (or entry date if no exit)
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(a.exit_date || a.entry_date).getTime()
      const dateB = new Date(b.exit_date || b.entry_date).getTime()
      return dateA - dateB
    })

    let cumulativePnL = 0
    const points: Array<{ date: string; pnl: number }> = []

    sortedTrades.forEach(trade => {
      cumulativePnL += trade.pnl
      const date = new Date(trade.exit_date || trade.entry_date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      })
      points.push({ date, pnl: cumulativePnL })
    })

    return points
  }, [trades])

  // Calculate weekly P&L data for selected account (Monday - Friday)
  const accountWeeklyPnL = React.useMemo(() => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    if (!selectedAccountId || filteredTrades.length === 0) {
      return weekDays.map(day => ({ day, pnl: 0 }))
    }

    // Get the current week's start (Monday)
    const now = new Date()
    const currentDay = now.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMonday)
    monday.setHours(0, 0, 0, 0)

    // Initialize daily P&L for Monday-Friday
    const dailyPnL = new Map<string, number>(weekDays.map(day => [day, 0]))

    // Filter trades for selected account and this week
    const accountTrades = filteredTrades.filter(t => t.account_id === selectedAccountId)

    accountTrades.forEach(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date)

      if (tradeDate >= monday) {
        const dayOfWeek = tradeDate.getDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayName = weekDays[dayOfWeek - 1]
          const currentPnL = dailyPnL.get(dayName) || 0
          dailyPnL.set(dayName, currentPnL + trade.pnl)
        }
      }
    })

    return weekDays.map(day => ({
      day,
      pnl: dailyPnL.get(day) || 0
    }))
  }, [selectedAccountId, filteredTrades])

  // Find best day from account weekly P&L
  const bestDay = React.useMemo(() => {
    const sorted = [...accountWeeklyPnL].sort((a, b) => b.pnl - a.pnl)
    return sorted[0]
  }, [accountWeeklyPnL])

  // Recent trades for table
  const recentTrades = React.useMemo(() => filteredTrades.slice(0, 10), [filteredTrades])

  // Open positions for table
  const openPositions = React.useMemo(() => filteredTrades.filter(t => !t.exit_date), [filteredTrades])

  // Calculate strategy statistics
  const strategyStats = React.useMemo(() => {
    if (filteredTrades.length === 0) return []

    // Group trades by strategy
    const strategyMap = new Map<string, typeof filteredTrades>()
    filteredTrades.forEach(trade => {
      const strategy = trade.strategy || 'No Strategy'
      if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, [])
      }
      strategyMap.get(strategy)!.push(trade)
    })

    // Calculate stats for each strategy
    const strategies = Array.from(strategyMap.entries()).map(([name, strategyTrades]) => {
      const totalTrades = strategyTrades.length
      const winningTrades = strategyTrades.filter(t => t.pnl > 0).length
      const losingTrades = strategyTrades.filter(t => t.pnl < 0).length
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
      const totalPnL = strategyTrades.reduce((sum, t) => sum + t.pnl, 0)
      const avgWin = winningTrades > 0
        ? strategyTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades
        : 0
      const avgLoss = losingTrades > 0
        ? Math.abs(strategyTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades)
        : 0

      return {
        name,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalPnL,
        avgWin,
        avgLoss,
      }
    })

    // Sort by total P&L descending
    return strategies.sort((a, b) => b.totalPnL - a.totalPnL)
  }, [filteredTrades])

  const topStrategy = strategyStats[0]

  // Calculate confluence statistics
  const confluenceStats = React.useMemo(() => {
    if (filteredTrades.length === 0) return []

    // Collect all confluences from all trades
    const confluenceMap = new Map<string, { wins: number; losses: number; totalPnL: number; count: number }>()

    filteredTrades.forEach(trade => {
      if (trade.confluences && Array.isArray(trade.confluences)) {
        trade.confluences.forEach((confluence: string) => {
          if (!confluenceMap.has(confluence)) {
            confluenceMap.set(confluence, { wins: 0, losses: 0, totalPnL: 0, count: 0 })
          }
          const stats = confluenceMap.get(confluence)!
          stats.count++
          stats.totalPnL += trade.pnl
          if (trade.pnl > 0) {
            stats.wins++
          } else if (trade.pnl < 0) {
            stats.losses++
          }
        })
      }
    })

    // Calculate win rate and sort by profitability when used
    const confluences = Array.from(confluenceMap.entries()).map(([name, data]) => {
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0
      const avgPnL = data.count > 0 ? data.totalPnL / data.count : 0

      return {
        name,
        wins: data.wins,
        losses: data.losses,
        count: data.count,
        winRate,
        totalPnL: data.totalPnL,
        avgPnL,
      }
    })

    // Sort by average P&L when used (profitability rating)
    return confluences.sort((a, b) => b.avgPnL - a.avgPnL)
  }, [filteredTrades])

  const topConfluence = confluenceStats[0]

  return (
    <div className="flex-1 p-8 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 min-h-screen">
      {/* Header with Account Filter */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Last import: <span className="text-foreground font-semibold">Jul 01, 2025 04:55 PM</span>
        </div>

        {/* Account Filter Dropdown */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Account:</span>
            <select
              value={globalAccountFilter}
              onChange={(e) => setGlobalAccountFilter(e.target.value)}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-border rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="all">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Net P&L */}
        <Card className="relative border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net P&L</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {accounts.length === 0 ? (
              <div className="text-3xl font-bold text-muted-foreground">
                {formatCurrency(0)}
              </div>
            ) : accounts.length === 1 ? (
              <div className={`text-3xl font-bold ${accounts[0].metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(accounts[0].metrics.netProfit, accounts[0].currency)}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Group by currency and show totals */}
                {Object.entries(
                  accounts.reduce((acc, account) => {
                    const currency = account.currency;
                    if (!acc[currency]) acc[currency] = 0;
                    acc[currency] += account.metrics.netProfit;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([currency, pnl]) => (
                  <div key={currency} className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(pnl, currency)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trade Win % */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profitability</CardTitle>
              <div className="text-[10px] text-muted-foreground">
                Avg Hold: <span className="font-semibold text-foreground">{avgHoldingPeriod}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Semicircular Donut Chart */}
            <div className="relative h-32 flex items-end justify-center">
              <svg viewBox="0 0 200 120" className="w-full h-full">
                {/* Background semicircle */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="20"
                  strokeLinecap="round"
                />

                {/* Red arc (losses) */}
                <path
                  d={`M 20 100 A 80 80 0 0 1 ${20 + 160 * (100 - winRate) / 100} ${100 - 80 * Math.sin(Math.PI * (100 - winRate) / 100)}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeLinecap="round"
                />

                {/* Green arc (wins) */}
                <path
                  d={`M ${20 + 160 * (100 - winRate) / 100} ${100 - 80 * Math.sin(Math.PI * (100 - winRate) / 100)} A 80 80 0 0 1 180 100`}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="20"
                  strokeLinecap="round"
                />

                {/* Center text */}
                <text x="100" y="75" textAnchor="middle" fill="currentColor" fontSize="12" className="fill-muted-foreground">
                  Trades Taken
                </text>
                <text x="100" y="95" textAnchor="middle" fill="currentColor" fontSize="24" fontWeight="bold" className="fill-foreground">
                  {stats.total_trades}
                </text>
                <text x="100" y="110" textAnchor="middle" fill="currentColor" fontSize="11" className="fill-muted-foreground">
                  Winrate: {formatPercent(winRate)}
                </text>
              </svg>
            </div>

            {/* Won and Lost stats */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col items-start">
                <div className="text-xs text-muted-foreground">Won</div>
                <div className="text-2xl font-bold">{formatPercent(winRate)}</div>
                <div className="text-xs text-muted-foreground">{stats.winning_trades}</div>
              </div>

              <div className="flex flex-col items-end">
                <div className="text-xs text-muted-foreground">Lost</div>
                <div className="text-2xl font-bold">{formatPercent(100 - winRate)}</div>
                <div className="text-xs text-muted-foreground">{stats.losing_trades}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Factor (R:R Ratio) */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{avgRiskReward > 0 ? avgRiskReward.toFixed(2) : '0.00'}</div>

              {/* Circular Progress Gauge */}
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />

                  {/* Progress circle - changes color based on R:R ratio */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={
                      avgRiskReward >= 2 ? "#22c55e" : // Green for great R:R (2+)
                      avgRiskReward >= 1.5 ? "#60a5fa" : // Blue for good R:R (1.5-2)
                      avgRiskReward >= 1 ? "#eab308" : // Yellow for ok R:R (1-1.5)
                      "#ef4444" // Red for poor R:R (<1)
                    }
                    strokeWidth="8"
                    strokeDasharray={`${Math.min(100, (avgRiskReward / 3) * 100) * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Win % */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Day Win %</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-4xl font-bold">{formatPercent(dayWinRate)}</div>

              {/* Semicircular Gauge */}
              <div className="relative w-full h-16 flex items-end justify-center">
                <svg viewBox="0 0 120 70" className="w-full h-full">
                  {/* Background track */}
                  <path
                    d="M 15 60 A 45 45 0 0 1 105 60"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />

                  {/* Green arc - proportional to day win rate */}
                  <path
                    d={`M 15 60 A 45 45 0 0 1 ${15 + (90 * Math.min(dayWinRate, 100) / 100)} ${60 - (45 * Math.sin(Math.PI * Math.min(dayWinRate, 100) / 100))}`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />

                  {/* Red arc - proportional to day loss rate */}
                  {dayWinRate < 100 && (
                    <path
                      d={`M ${15 + (90 * dayWinRate / 100)} ${60 - (45 * Math.sin(Math.PI * dayWinRate / 100))} A 45 45 0 0 1 105 60`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                {/* Labels */}
                <div className="absolute bottom-0 left-2 text-xs font-medium text-muted-foreground">0%</div>
                <div className="absolute bottom-0 right-2 text-xs font-medium text-muted-foreground">100%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Win/Loss Trade */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Win/Loss</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="text-4xl font-bold">{(avgWin / (avgLoss || 1)).toFixed(2)}</div>

              {/* Win/Loss Bars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Avg Win</span>
                  <span className="font-semibold text-green-600">${avgWin.toFixed(0)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (avgWin / Math.max(avgWin, avgLoss)) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 mt-3">
                  <span>Avg Loss</span>
                  <span className="font-semibold text-red-600">${avgLoss.toFixed(0)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (avgLoss / Math.max(avgWin, avgLoss)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Day Performance - Monday to Friday */}
      <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Trading Day Performance</CardTitle>
              <CardDescription className="text-xs mt-1">
                Best Day: <span className="font-semibold">{bestDay.day}</span>
              </CardDescription>
            </div>
            {accounts.length > 0 && (
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            {(() => {
              const maxPnL = Math.max(...accountWeeklyPnL.map(d => d.pnl), 0)
              const minPnL = Math.min(...accountWeeklyPnL.map(d => d.pnl), 0)
              const range = maxPnL - minPnL || 1
              const now = new Date()
              const currentDayOfWeek = now.getDay()

              const formatCurrency = (value: number) => {
                const absValue = Math.abs(value)
                if (absValue >= 1000) {
                  return `$${(absValue / 1000).toFixed(1)}k`
                }
                return `$${absValue.toFixed(0)}`
              }

              return (
                <div className="flex gap-2 h-full">
                  {/* Y-axis price scale */}
                  <div className="flex flex-col justify-between text-[10px] text-muted-foreground w-10 text-right pr-2">
                    <span className="text-green-600">{formatCurrency(maxPnL)}</span>
                    <span>$0</span>
                    <span className="text-red-600">{formatCurrency(minPnL)}</span>
                  </div>

                  {/* Chart container with zero line */}
                  <div className="flex-1 relative">
                    {/* Zero baseline */}
                    <div
                      className="absolute w-full border-t border-muted-foreground/30 border-dashed"
                      style={{
                        top: `${(maxPnL / range) * 100}%`
                      }}
                    />

                    <div className="flex items-center justify-around h-full gap-2">
                      {accountWeeklyPnL.map((d, i) => {
                        const isPositive = d.pnl >= 0
                        const barHeight = (Math.abs(d.pnl) / range) * 100
                        const dayIndex = i + 1
                        const isToday = currentDayOfWeek === dayIndex
                        const isBestDay = d.day === bestDay.day && d.pnl > 0
                        const zeroPosition = (maxPnL / range) * 100

                        return (
                          <div key={i} className="flex flex-col items-center flex-1 h-full relative">
                            <div className="flex-1 flex flex-col items-center w-full relative" style={{ justifyContent: 'center' }}>
                              {/* P&L Value above/below bar */}
                              <div
                                className={`absolute text-[10px] font-semibold ${
                                  d.pnl === 0 ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
                                }`}
                                style={{
                                  top: isPositive
                                    ? `${zeroPosition - barHeight - 12}px`
                                    : `${zeroPosition + barHeight + 2}px`
                                }}
                              >
                                {d.pnl === 0 ? '$0' : `${isPositive ? '+' : '-'}$${Math.abs(d.pnl).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
                              </div>

                              {/* Bar - grows up from zero or down from zero */}
                              <div
                                className={`absolute w-full rounded-md transition-all ${
                                  d.pnl === 0 ? 'bg-muted/30' :
                                  isPositive ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-b from-red-500 to-red-400'
                                } ${isBestDay ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-green-500/20' : ''} ${
                                  isToday ? 'opacity-100' : 'opacity-90'
                                }`}
                                style={{
                                  top: isPositive ? `${zeroPosition - barHeight}%` : `${zeroPosition}%`,
                                  height: `${barHeight}%`,
                                  minHeight: d.pnl !== 0 ? '6px' : '2px'
                                }}
                              />
                            </div>

                            {/* Day Label */}
                            <div className={`mt-2 text-[10px] font-medium ${
                              isToday ? 'text-foreground font-bold' : 'text-muted-foreground'
                            }`}>
                              {d.day}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Trading Calendar - Mini Preview */}
      <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Trading Calendar</CardTitle>
              <CardDescription className="text-xs">Quick view of this week</CardDescription>
            </div>
            <a
              href="/calendar"
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              View Full Calendar
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const now = new Date()
            const currentDay = now.getDay() // 0 = Sunday
            const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
            const monday = new Date(now)
            monday.setDate(now.getDate() - daysFromMonday)
            monday.setHours(0, 0, 0, 0)

            // Get this week's dates (Mon-Fri)
            const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
            const weekData = weekDays.map((dayName, i) => {
              const date = new Date(monday)
              date.setDate(monday.getDate() + i)

              // Find trades for this date
              const dayTrades = filteredTrades.filter(trade => {
                const tradeDate = new Date(trade.exit_date || trade.entry_date)
                return tradeDate.toDateString() === date.toDateString()
              })

              const totalPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0)

              return {
                dayName,
                date: date.getDate(),
                trades: dayTrades,
                totalPnL,
                isToday: date.toDateString() === now.toDateString()
              }
            })

            return (
              <div className="grid grid-cols-5 gap-2">
                {weekData.map((day) => {
                  const hasTrades = day.trades.length > 0
                  const isProfitable = day.totalPnL > 0

                  return (
                    <div
                      key={day.dayName}
                      className={`border rounded-lg p-2 flex flex-col items-center justify-center transition-colors ${
                        day.isToday ? 'border-primary bg-primary/10' : 'border-border'
                      } ${hasTrades ? 'hover:bg-muted/50' : ''}`}
                    >
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {day.dayName}
                      </div>
                      <div className={`text-sm font-semibold mb-1 ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                        {day.date}
                      </div>
                      {hasTrades ? (
                        <>
                          <div className="text-[9px] text-muted-foreground">
                            {day.trades.length} {day.trades.length === 1 ? 'trade' : 'trades'}
                          </div>
                          <div className={`text-[10px] font-semibold ${
                            isProfitable ? 'text-green-600' : day.totalPnL < 0 ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            {isProfitable ? '+' : ''}{day.totalPnL >= 1000 || day.totalPnL <= -1000
                              ? `$${(day.totalPnL / 1000).toFixed(1)}k`
                              : `$${day.totalPnL.toFixed(0)}`}
                          </div>
                        </>
                      ) : (
                        <div className="text-[9px] text-muted-foreground">No trades</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Middle Section - Trader Score, Strategy & Confluence Performance */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {/* Trader Score */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Trader Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {/* Radar Chart with Real Data */}
              <div className="relative w-full h-56 mb-4">
                <svg viewBox="0 0 240 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Background hexagons (grid lines) */}
                  <polygon
                    points="120,30 190,70 190,170 120,210 50,170 50,70"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <polygon
                    points="120,60 165,85 165,155 120,180 75,155 75,85"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <polygon
                    points="120,90 140,102 140,138 120,150 100,138 100,102"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />

                  {/* Radial lines */}
                  <line x1="120" y1="120" x2="120" y2="30" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="120" y1="120" x2="190" y2="70" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="120" y1="120" x2="190" y2="170" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="120" y1="120" x2="120" y2="210" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="120" y1="120" x2="50" y2="170" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="120" y1="120" x2="50" y2="70" stroke="#e5e7eb" strokeWidth="1" />

                  {/* Data hexagon - calculated from metrics */}
                  <polygon
                    points={`
                      ${120},${30 + (90 - metricScores.winRate) * 0.9}
                      ${120 + 70 * (metricScores.profitFactor / 100)},${70 + (50 - metricScores.profitFactor * 0.5)}
                      ${120 + 70 * (metricScores.avgWinLoss / 100)},${120 + 50 * (metricScores.avgWinLoss / 100)}
                      ${120},${120 + 90 * (metricScores.recoveryFactor / 100)}
                      ${120 - 70 * (metricScores.maxDrawdown / 100)},${120 + 50 * (metricScores.maxDrawdown / 100)}
                      ${120 - 70 * (metricScores.consistency / 100)},${70 + (50 - metricScores.consistency * 0.5)}
                    `}
                    fill="rgba(139, 92, 246, 0.3)"
                    stroke="rgba(139, 92, 246, 0.8)"
                    strokeWidth="2"
                  />

                  {/* Labels */}
                  <text x="120" y="20" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500">Win %</text>
                  <text x="205" y="75" textAnchor="start" fill="#9ca3af" fontSize="11" fontWeight="500">Profit factor</text>
                  <text x="205" y="175" textAnchor="start" fill="#9ca3af" fontSize="11" fontWeight="500">Avg win/loss</text>
                  <text x="120" y="230" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500">Recovery factor</text>
                  <text x="35" y="175" textAnchor="end" fill="#9ca3af" fontSize="11" fontWeight="500">Max drawdown</text>
                  <text x="35" y="75" textAnchor="end" fill="#9ca3af" fontSize="11" fontWeight="500">Consistency</text>
                </svg>
              </div>

              <div className="w-full">
                <div className="text-sm font-medium mb-2">Your Trader Score</div>
                {stats.total_trades === 0 ? (
                  <>
                    <div className="text-3xl font-bold mb-2 text-muted-foreground">--</div>
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Start trading to see your score
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-2">{traderScore.toFixed(2)}</div>
                    <div className="relative h-2 w-full rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                      <div
                        className="absolute top-0 bottom-0 right-0 bg-background"
                        style={{ width: `${100 - traderScore}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Profitable Strategy */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Strategy Performance</CardTitle>
            <CardDescription className="text-xs">Most profitable trading strategy</CardDescription>
          </CardHeader>
          <CardContent>
            {!topStrategy ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No strategy data yet
              </div>
            ) : (
              <div className="space-y-4">
                {/* Strategy Name and P&L */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Strategy</div>
                  <div className="text-xl font-bold">{topStrategy.name}</div>
                  <div className={`text-2xl font-bold mt-1 ${topStrategy.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {topStrategy.totalPnL >= 0 ? '+' : ''}{formatCurrency(topStrategy.totalPnL)}
                  </div>
                </div>

                {/* Win Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-semibold text-foreground">{topStrategy.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${
                        topStrategy.winRate >= 60 ? 'bg-green-500' :
                        topStrategy.winRate >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, topStrategy.winRate)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Trades</div>
                    <div className="text-lg font-semibold">{topStrategy.totalTrades}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Win/Loss</div>
                    <div className="text-lg font-semibold">
                      <span className="text-green-600">{topStrategy.winningTrades}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600">{topStrategy.losingTrades}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Win</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(topStrategy.avgWin)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Loss</div>
                    <div className="text-lg font-semibold text-red-600">
                      {formatCurrency(topStrategy.avgLoss)}
                    </div>
                  </div>
                </div>

                {/* All Strategies List */}
                {strategyStats.length > 1 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Other Strategies</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {strategyStats.slice(1, 4).map((strategy, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-foreground truncate flex-1">{strategy.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{strategy.winRate.toFixed(0)}%</span>
                            <span className={`font-semibold ${strategy.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {strategy.totalPnL >= 0 ? '+' : ''}{formatCurrency(strategy.totalPnL)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Confluences */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Confluence</CardTitle>
            <CardDescription className="text-xs">Most profitable when used</CardDescription>
          </CardHeader>
          <CardContent>
            {!topConfluence ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No confluence data yet
              </div>
            ) : (
              <div className="space-y-4">
                {/* Confluence Name and Avg P&L */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Confluence</div>
                  <div className="text-xl font-bold">{topConfluence.name}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-xs text-muted-foreground">Avg P&L:</div>
                    <div className={`text-xl font-bold ${topConfluence.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {topConfluence.avgPnL >= 0 ? '+' : ''}{formatCurrency(topConfluence.avgPnL)}
                    </div>
                  </div>
                </div>

                {/* Win Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-semibold text-foreground">{topConfluence.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${
                        topConfluence.winRate >= 60 ? 'bg-green-500' :
                        topConfluence.winRate >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, topConfluence.winRate)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Times Used</div>
                    <div className="text-lg font-semibold">{topConfluence.count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Win/Loss</div>
                    <div className="text-lg font-semibold">
                      <span className="text-green-600">{topConfluence.wins}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600">{topConfluence.losses}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Total P&L</div>
                    <div className={`text-lg font-semibold ${topConfluence.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {topConfluence.totalPnL >= 0 ? '+' : ''}{formatCurrency(topConfluence.totalPnL)}
                    </div>
                  </div>
                </div>

                {/* Other Confluences List */}
                {confluenceStats.length > 1 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Other Confluences</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {confluenceStats.slice(1, 5).map((confluence, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-foreground truncate flex-1">{confluence.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{confluence.winRate.toFixed(0)}%</span>
                            <span className={`font-semibold ${confluence.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {confluence.avgPnL >= 0 ? '+' : ''}{formatCurrency(confluence.avgPnL)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Stats Cards */}
      <div className={`grid gap-4 ${
        accounts.length === 0 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        accounts.length === 1 ? 'grid-cols-1' :
        accounts.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {accounts.length === 0 ? (
          // Demo account stats
          <>
            <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Personal Account</CardTitle>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Personal</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Balance Info */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                    <div className="text-2xl font-bold">$12,450</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Started: $10,000</span>
                      <span className="text-xs font-semibold text-green-600">+24.5%</span>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Win Rate</span>
                      <span className="font-semibold text-foreground">65.2%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '65.2%' }} />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Trades</div>
                      <div className="text-lg font-semibold">46</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Net P&L</div>
                      <div className="text-lg font-semibold text-green-600">+$2,450</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Funded Account #1</CardTitle>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Funded</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Balance Info */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                    <div className="text-2xl font-bold">$55,820</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Started: $50,000</span>
                      <span className="text-xs font-semibold text-green-600">+11.6%</span>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Win Rate</span>
                      <span className="font-semibold text-foreground">58.3%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '58.3%' }} />
                    </div>
                  </div>

                  {/* Profit Target */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Profit Target</span>
                      <span className="font-semibold text-foreground">$5,820 / $10,000</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '58.2%' }} />
                    </div>
                  </div>

                  {/* Drawdown */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Max Drawdown</span>
                      <span className="font-semibold text-foreground">$850 / $2,500</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: '34%' }} />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Trades</div>
                      <div className="text-lg font-semibold">84</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Net P&L</div>
                      <div className="text-lg font-semibold text-green-600">+$5,820</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Funded Account #2</CardTitle>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Funded</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Balance Info */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                    <div className="text-2xl font-bold">$48,750</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Started: $50,000</span>
                      <span className="text-xs font-semibold text-red-600">-2.5%</span>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Win Rate</span>
                      <span className="font-semibold text-foreground">45.8%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '45.8%' }} />
                    </div>
                  </div>

                  {/* Profit Target */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Profit Target</span>
                      <span className="font-semibold text-foreground">-$1,250 / $10,000</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>

                  {/* Drawdown */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Max Drawdown</span>
                      <span className="font-semibold text-red-600">$1,850 / $2,500</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '74%' }} />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Trades</div>
                      <div className="text-lg font-semibold">72</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Net P&L</div>
                      <div className="text-lg font-semibold text-red-600">-$1,250</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          // Real account stats - filter by global account selection
          accounts
            .filter(account => globalAccountFilter === 'all' || account.id === globalAccountFilter)
            .map((account) => {
            const accountTrades = trades.filter(t => t.account_id === account.id)
            const accountStats = calculateTradeStats(accountTrades)
            const isFunded = account.accountType === 'prop-firm'
            const startingBalance = account.metrics?.startingBalance || 0
            const currentBalance = account.metrics?.currentBalance || 0
            const balanceChange = startingBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0

            return (
              <Card key={account.id} className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{account.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isFunded
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {isFunded ? 'Funded' : 'Personal'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Balance Info */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                      <div className="text-2xl font-bold">{formatCurrency(currentBalance, account.currency)}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Started: {formatCurrency(startingBalance, account.currency)}
                        </span>
                        <span className={`text-xs font-semibold ${balanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {balanceChange >= 0 ? '+' : ''}{balanceChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Win Rate</span>
                        <span className="font-semibold text-foreground">{accountStats.win_rate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${
                            accountStats.win_rate >= 50 ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(100, accountStats.win_rate)}%` }}
                        />
                      </div>
                    </div>

                    {/* Funded Account Specific Metrics */}
                    {isFunded && (
                      <>
                        {/* Profit Target */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted-foreground">Profit Target</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(account.metrics.netProfit, account.currency)} / {formatCurrency(account.propFirmSettings?.profitTarget || 0, account.currency)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, (account.metrics.netProfit / (account.propFirmSettings?.profitTarget || 1)) * 100))}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Drawdown */}
                        <div>
                          {(() => {
                            // Use currentDrawdown from propFirmSettings if account status is 'drawdown', otherwise use calculated max_drawdown
                            const currentDrawdownValue = account.propFirmSettings?.status === 'drawdown'
                              ? Math.abs(account.propFirmSettings?.currentDrawdown || 0)
                              : Math.abs(accountStats.max_drawdown || 0)
                            const maxDrawdownLimit = account.propFirmSettings?.maxDrawdown || 1
                            const drawdownPercentage = (currentDrawdownValue / maxDrawdownLimit) * 100

                            return (
                              <>
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span className="text-muted-foreground">Current Drawdown</span>
                                  <span className={`font-semibold ${
                                    drawdownPercentage > 80
                                      ? 'text-red-600'
                                      : 'text-foreground'
                                  }`}>
                                    {formatCurrency(currentDrawdownValue, account.currency)} / {formatCurrency(maxDrawdownLimit, account.currency)}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                  <div
                                    className={`h-full rounded-full ${
                                      drawdownPercentage > 80
                                        ? 'bg-red-500'
                                        : drawdownPercentage > 50
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, drawdownPercentage)}%`
                                    }}
                                  />
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">Total Trades</div>
                        <div className="text-lg font-semibold">{accountStats.total_trades}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Net P&L</div>
                        <div className={`text-lg font-semibold ${
                          account.metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {account.metrics.netProfit >= 0 ? '+' : ''}{formatCurrency(account.metrics.netProfit, account.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Account Performance - Daily Cumulative P&L per Account */}
      <div className={`grid gap-4 ${
        accounts.length === 0 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        accounts.length === 1 ? 'grid-cols-1' :
        accounts.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {accounts.length === 0 ? (
          // Demo data when no accounts exist
          <>
            <EquityCurveCard
              accountName="Personal Account"
              accountPnL={2450}
              accountBalance={12450}
              accountCurrency="USD"
              equityCurveData={[
                { date: '10/01', pnl: 10200 },
                { date: '10/08', pnl: 10800 },
                { date: '10/15', pnl: 11200 },
                { date: '10/22', pnl: 12450 },
              ]}
            />
            <EquityCurveCard
              accountName="Funded Account #1"
              accountPnL={5820}
              accountBalance={55820}
              accountCurrency="USD"
              equityCurveData={[
                { date: '10/01', pnl: 51000 },
                { date: '10/08', pnl: 52500 },
                { date: '10/15', pnl: 54200 },
                { date: '10/22', pnl: 55820 },
              ]}
            />
            <EquityCurveCard
              accountName="Funded Account #2"
              accountPnL={-1250}
              accountBalance={48750}
              accountCurrency="USD"
              equityCurveData={[
                { date: '10/01', pnl: 49800 },
                { date: '10/08', pnl: 49200 },
                { date: '10/15', pnl: 48900 },
                { date: '10/22', pnl: 48750 },
              ]}
            />
          </>
        ) : (
          // Real account data - filter by global account selection
          accounts
            .filter(account => globalAccountFilter === 'all' || account.id === globalAccountFilter)
            .map((account) => {
            // Calculate equity curve for this specific account
            const accountTrades = trades.filter(t => t.account_id === account.id)

            const accountEquityCurve = (() => {
              if (accountTrades.length === 0) return []

              const sortedTrades = [...accountTrades].sort((a, b) => {
                const dateA = new Date(a.exit_date || a.entry_date).getTime()
                const dateB = new Date(b.exit_date || b.entry_date).getTime()
                return dateA - dateB
              })

              // Filter to last 30 days
              const now = new Date()
              const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

              const filteredTrades = sortedTrades.filter(trade => {
                const tradeDate = new Date(trade.exit_date || trade.entry_date)
                return tradeDate >= cutoffDate
              })

              let cumulativePnL = 0
              return filteredTrades.map(trade => {
                  cumulativePnL += trade.pnl
                  const tradeDate = new Date(trade.exit_date || trade.entry_date)
                  return {
                    date: tradeDate.toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit'
                    }),
                    pnl: cumulativePnL
                  }
                })
            })()

            return (
              <EquityCurveCard
                key={account.id}
                accountName={account.name}
                accountPnL={account.metrics.netProfit}
                accountBalance={account.metrics.currentBalance}
                accountCurrency={account.currency}
                equityCurveData={accountEquityCurve}
              />
            )
          })
        )}
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 grid-cols-1">
        {/* Recent Trades & Open Positions */}
        <Card className="border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm shadow-lg shadow-black/5">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-6 border-b border-border/50">
                  <button
                    onClick={() => setActiveTab('recent')}
                    className={`pb-3 text-sm font-semibold transition-colors ${
                      activeTab === 'recent'
                        ? 'border-b-2 border-primary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Recent Trades
                  </button>
                  <button
                    onClick={() => setActiveTab('open')}
                    className={`pb-3 text-sm font-semibold transition-colors ${
                      activeTab === 'open'
                        ? 'border-b-2 border-primary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Open Positions
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left pb-2 font-medium">
                          {activeTab === 'recent' ? 'Close Date' : 'Entry Date'}
                        </th>
                        <th className="text-left pb-2 font-medium">Symbol</th>
                        <th className="text-right pb-2 font-medium">
                          {activeTab === 'recent' ? 'Net P&L' : 'Unrealized P&L'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab === 'recent' ? (
                        recentTrades.length > 0 ? (
                          recentTrades.map((trade) => (
                            <tr key={trade.id} className="border-b last:border-0">
                              <td className="py-3">{trade.exit_date || trade.entry_date}</td>
                              <td className="py-3">{trade.symbol}</td>
                              <td className={`py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                              No trades yet
                            </td>
                          </tr>
                        )
                      ) : (
                        openPositions.length > 0 ? (
                          openPositions.map((trade) => (
                            <tr key={trade.id} className="border-b last:border-0">
                              <td className="py-3">{trade.entry_date}</td>
                              <td className="py-3">{trade.symbol}</td>
                              <td className={`py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                              No open positions
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
      </div>
    </div>
  )
}
