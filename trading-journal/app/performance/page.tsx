'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade, Account } from '@/types/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  AlertTriangle,
  Clock,
  BarChart3,
  Calendar,
  Percent,
  DollarSign,
} from 'lucide-react'
import {
  calculateEquityCurve,
  calculatePerformanceMetrics,
  calculateMonthlyPerformance,
  identifyDrawdownPeriods,
  type PerformanceMetrics,
} from '@/lib/performance-calculator'
import { EquityCurveChart } from '@/components/performance/EquityCurveChart'
import { DrawdownChart } from '@/components/performance/DrawdownChart'
import { MonthlyReturnsTable } from '@/components/performance/MonthlyReturnsTable'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default function PerformancePage() {
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [allTrades, setAllTrades] = React.useState<Trade[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = React.useState<string>('all')
  const [startingBalance, setStartingBalance] = React.useState<number>(10000)

  // Date filters
  const [dateFrom, setDateFrom] = React.useState(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = React.useState(new Date().toISOString().split('T')[0])

  // Performance data
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null)
  const [equityCurve, setEquityCurve] = React.useState<ReturnType<typeof calculateEquityCurve>>([])
  const [monthlyData, setMonthlyData] = React.useState<ReturnType<typeof calculateMonthlyPerformance>>([])
  const [drawdowns, setDrawdowns] = React.useState<ReturnType<typeof identifyDrawdownPeriods>>([])

  // Load data
  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user || cancelled) return

        const [tradesRes, accountsRes] = await Promise.all([
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', userData.user.id)
            .order('closed_at', { ascending: false }),
          supabase.from('accounts').select('*').eq('user_id', userData.user.id),
        ])

        if (!cancelled) {
          setAllTrades((tradesRes.data as Trade[]) ?? [])
          const accountsList = (accountsRes.data as Account[]) ?? []
          setAccounts(accountsList)

          // Set starting balance from first account
          if (accountsList.length > 0) {
            setStartingBalance(accountsList[0].initial_balance)
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  // Calculate performance metrics
  React.useEffect(() => {
    const filteredTrades = allTrades.filter((trade) => {
      if (!trade.closed_at) return false

      const tradeDate = new Date(trade.closed_at)
      if (tradeDate < new Date(dateFrom) || tradeDate > new Date(dateTo)) return false

      if (selectedAccount !== 'all' && trade.account_id !== selectedAccount) return false

      return true
    })

    if (filteredTrades.length > 0) {
      const calculatedMetrics = calculatePerformanceMetrics(filteredTrades, startingBalance)
      const curve = calculateEquityCurve(filteredTrades, startingBalance)
      const monthly = calculateMonthlyPerformance(filteredTrades)
      const drawdownPeriods = identifyDrawdownPeriods(curve)

      setMetrics(calculatedMetrics)
      setEquityCurve(curve)
      setMonthlyData(monthly)
      setDrawdowns(drawdownPeriods)
    } else {
      setMetrics(null)
      setEquityCurve([])
      setMonthlyData([])
      setDrawdowns([])
    }
  }, [allTrades, dateFrom, dateTo, selectedAccount, startingBalance])

  const handleQuickDateRange = (days: number) => {
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    setDateFrom(format(from, 'yyyy-MM-dd'))
    setDateTo(format(to, 'yyyy-MM-dd'))
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : startingBalance
  const totalReturn = ((finalEquity - startingBalance) / startingBalance) * 100

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Track your trading performance and analyze risk metrics
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Starting Balance</Label>
              <Input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                placeholder="10000"
              />
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickDateRange(30)}>
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateRange(90)}>
              Last 90 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateRange(180)}>
              Last 6 Months
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateRange(365)}>
              Last Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {!metrics ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <Activity className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">No Performance Data</p>
            <p className="text-sm">Adjust filters or add more trades</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
            <TabsTrigger value="drawdowns">Drawdowns</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                  {totalReturn >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalReturn >= 0 ? '+' : ''}
                    {totalReturn.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      finalEquity - startingBalance
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalTrades} total trades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.profitFactor.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Expectancy: {metrics.expectancy.toFixed(2)}R
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Risk-adjusted return
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <EquityCurveChart data={equityCurve} startingBalance={startingBalance} />
              <DrawdownChart data={equityCurve} />
            </div>

            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Win</p>
                    <p className="text-lg font-semibold text-green-600">+{metrics.avgWin.toFixed(2)}R</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Loss</p>
                    <p className="text-lg font-semibold text-red-600">-{metrics.avgLoss.toFixed(2)}R</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average R-Multiple</p>
                    <p className={`text-lg font-semibold ${metrics.avgRMultiple >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.avgRMultiple >= 0 ? '+' : ''}{metrics.avgRMultiple.toFixed(2)}R
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Largest Win</p>
                    <p className="text-lg font-semibold text-green-600">+{metrics.largestWin.toFixed(2)}R</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Largest Loss</p>
                    <p className="text-lg font-semibold text-red-600">{metrics.largestLoss.toFixed(2)}R</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Profit per Trade</p>
                    <p className="text-lg font-semibold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                        metrics.profitPerTrade
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk Metrics Tab */}
          <TabsContent value="risk" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.maxDrawdownPercent.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      metrics.maxDrawdown
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sortino Ratio</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.sortinoRatio.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Downside risk-adjusted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Calmar Ratio</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.calmarRatio.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Return / Max DD
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recovery Factor</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.recoveryFactor.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Profit / Max DD
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Drawdown</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      metrics.avgDrawdown
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average decline
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Longest DD Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.longestDrawdownDuration}</div>
                  <p className="text-xs text-muted-foreground">
                    days
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Consistency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Consecutive Wins</p>
                    <p className="text-lg font-semibold text-green-600">{metrics.consecutiveWins}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Consecutive Losses</p>
                    <p className="text-lg font-semibold text-red-600">{metrics.consecutiveLosses}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Hold Time</p>
                    <p className="text-lg font-semibold">{metrics.avgHoldTime.toFixed(1)}h</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Trades/Day</p>
                    <p className="text-lg font-semibold">{metrics.avgTradesPerDay.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hold Time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Hold Time</p>
                    <p className="text-lg font-semibold">{metrics.avgHoldTime.toFixed(1)} hours</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Win Hold Time</p>
                    <p className="text-lg font-semibold text-green-600">{metrics.avgWinHoldTime.toFixed(1)} hours</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Loss Hold Time</p>
                    <p className="text-lg font-semibold text-red-600">{metrics.avgLossHoldTime.toFixed(1)} hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Analysis Tab */}
          <TabsContent value="monthly" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profitable Months</CardTitle>
                  <Calendar className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.profitableMonths}/{metrics.totalMonths}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalMonths > 0 ? ((metrics.profitableMonths / metrics.totalMonths) * 100).toFixed(1) : 0}% win rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Best Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    +{metrics.bestMonth.toFixed(2)}R
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highest monthly return
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Worst Month</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.worstMonth.toFixed(2)}R
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lowest monthly return
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Monthly Return</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${metrics.avgMonthlyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.avgMonthlyReturn >= 0 ? '+' : ''}{metrics.avgMonthlyReturn.toFixed(2)}R
                  </div>
                  <p className="text-xs text-muted-foreground">
                    StdDev: {metrics.monthlyReturnStdDev.toFixed(2)}R
                  </p>
                </CardContent>
              </Card>
            </div>

            <MonthlyReturnsTable data={monthlyData} />
          </TabsContent>

          {/* Drawdowns Tab */}
          <TabsContent value="drawdowns" className="space-y-6">
            <DrawdownChart data={equityCurve} />

            <Card>
              <CardHeader>
                <CardTitle>Drawdown Periods</CardTitle>
                <CardDescription>All periods of equity decline</CardDescription>
              </CardHeader>
              <CardContent>
                {drawdowns.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    No drawdown periods found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 pr-4 text-left font-medium">Start</th>
                          <th className="pb-2 pr-4 text-left font-medium">End</th>
                          <th className="pb-2 pr-4 text-right font-medium">Depth</th>
                          <th className="pb-2 pr-4 text-right font-medium">Depth %</th>
                          <th className="pb-2 pr-4 text-right font-medium">Duration</th>
                          <th className="pb-2 text-left font-medium">Recovery</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawdowns.map((dd, idx) => (
                          <tr key={idx} className="border-b border-border/50">
                            <td className="py-2 pr-4">{format(new Date(dd.start), 'MMM dd, yyyy')}</td>
                            <td className="py-2 pr-4">{format(new Date(dd.end), 'MMM dd, yyyy')}</td>
                            <td className="py-2 pr-4 text-right font-medium text-red-600">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dd.depth)}
                            </td>
                            <td className="py-2 pr-4 text-right font-medium text-red-600">
                              {dd.depthPercent.toFixed(2)}%
                            </td>
                            <td className="py-2 pr-4 text-right">{dd.duration} days</td>
                            <td className="py-2">
                              {dd.recovery ? format(new Date(dd.recovery), 'MMM dd, yyyy') : (
                                <span className="text-orange-600">Ongoing</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
