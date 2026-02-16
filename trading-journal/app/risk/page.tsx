'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade, Account } from '@/types/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  Settings,
  Calculator,
  BarChart3,
  Target,
} from 'lucide-react'
import {
  calculateRiskMetrics,
  evaluateRiskRules,
  calculateOptimalPositionSize,
  type RiskSettings,
  type RiskMetrics,
  type RiskRule,
} from '@/lib/risk-calculator'
import { PositionSizeCalculator } from '@/components/risk-management/PositionSizeCalculator'
import { RiskRulesMonitor } from '@/components/risk-management/RiskRulesMonitor'

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxRiskPerTrade: 1,
  maxDailyRisk: 3,
  maxWeeklyRisk: 6,
  maxMonthlyRisk: 10,
  maxDrawdown: 20,
  maxConsecutiveLosses: 5,
  maxOpenPositions: 3,
  maxCorrelatedPositions: 2,
  stopLossBuffer: 2,
  riskRewardMinimum: 1.5,
}

export default function RiskManagementPage() {
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [allTrades, setAllTrades] = React.useState<Trade[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [selectedAccountBalance, setSelectedAccountBalance] = React.useState<number>(10000)

  const [riskSettings, setRiskSettings] = React.useState<RiskSettings>(DEFAULT_RISK_SETTINGS)
  const [metrics, setMetrics] = React.useState<RiskMetrics | null>(null)
  const [riskRules, setRiskRules] = React.useState<RiskRule[]>([])
  const [optimalSize, setOptimalSize] = React.useState<ReturnType<
    typeof calculateOptimalPositionSize
  > | null>(null)

  // Load data
  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || cancelled) return

        const [tradesRes, accountsRes] = await Promise.all([
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', session.user.id)
            .order('closed_at', { ascending: false }),
          supabase.from('accounts').select('*').eq('user_id', session.user.id),
        ])

        if (!cancelled) {
          setAllTrades((tradesRes.data as Trade[]) ?? [])
          const accountsList = (accountsRes.data as Account[]) ?? []
          setAccounts(accountsList)

          if (accountsList.length > 0) {
            setSelectedAccountBalance(accountsList[0].initial_balance)
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

  // Calculate risk metrics
  React.useEffect(() => {
    if (allTrades.length > 0) {
      const calculatedMetrics = calculateRiskMetrics(
        allTrades,
        selectedAccountBalance,
        riskSettings
      )
      const rules = evaluateRiskRules(
        calculatedMetrics,
        riskSettings,
        allTrades.filter((t) => !t.closed_at).length
      )
      const optimal = calculateOptimalPositionSize(allTrades, selectedAccountBalance)

      setMetrics(calculatedMetrics)
      setRiskRules(rules)
      setOptimalSize(optimal)
    }
  }, [allTrades, selectedAccountBalance, riskSettings])

  const handleUpdateSettings = (key: keyof RiskSettings, value: number) => {
    setRiskSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const openPositions = allTrades.filter((t) => !t.closed_at).length
  const violatedRules = riskRules.filter((r) => r.status === 'violated').length
  const warningRules = riskRules.filter((r) => r.status === 'warning').length

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-muted-foreground">
          Monitor and control your trading risk exposure
        </p>
      </div>

      {/* Account Balance Input */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Current Account Balance ($)</Label>
              <Input
                type="number"
                value={selectedAccountBalance}
                onChange={(e) => setSelectedAccountBalance(Number(e.target.value))}
                placeholder="10000"
              />
            </div>
            <Button variant="outline">Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Banner */}
      {violatedRules > 0 && (
        <div className="rounded-lg border-2 border-red-600 bg-red-50 p-4 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-600">Risk Rules Violated</h3>
              <p className="text-sm text-muted-foreground">
                You have {violatedRules} active risk violation{violatedRules !== 1 ? 's' : ''}.
                Trading may be restricted.
              </p>
            </div>
          </div>
        </div>
      )}

      {warningRules > 0 && violatedRules === 0 && (
        <div className="rounded-lg border-2 border-yellow-600 bg-yellow-50 p-4 dark:bg-yellow-950/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-600">Risk Warnings Active</h3>
              <p className="text-sm text-muted-foreground">
                You have {warningRules} risk warning{warningRules !== 1 ? 's' : ''}. Consider
                reducing exposure.
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {!metrics ? (
            <Card>
              <CardContent className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                <Shield className="mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">No Risk Data Available</p>
                <p className="text-sm">Add trades to see risk metrics</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Account Equity</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(metrics.accountEquity)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Balance:{' '}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(metrics.accountBalance)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Drawdown</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.currentDrawdownPercent.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(metrics.currentDrawdown)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily Risk Used</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((metrics.dailyRiskUsed / metrics.accountBalance) * 100).toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Remaining:{' '}
                      {((metrics.dailyRiskRemaining / metrics.accountBalance) * 100).toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{openPositions}</div>
                    <p className="text-xs text-muted-foreground">
                      Risk: {metrics.openPositionsRisk.toFixed(2)}R
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Usage Progress Bars */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Usage</CardTitle>
                  <CardDescription>Current risk utilization across time periods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Daily Risk */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Daily Risk</Label>
                      <span className="text-sm text-muted-foreground">
                        {((metrics.dailyRiskUsed / metrics.accountBalance) * 100).toFixed(2)}% of{' '}
                        {riskSettings.maxDailyRisk}%
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all ${
                          metrics.dailyRiskUsed / metrics.accountBalance >=
                          riskSettings.maxDailyRisk / 100
                            ? 'bg-red-600'
                            : metrics.dailyRiskUsed / metrics.accountBalance >=
                                (riskSettings.maxDailyRisk * 0.8) / 100
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.min(100, (metrics.dailyRiskUsed / metrics.accountBalance / (riskSettings.maxDailyRisk / 100)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Weekly Risk */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Weekly Risk</Label>
                      <span className="text-sm text-muted-foreground">
                        {((metrics.weeklyRiskUsed / metrics.accountBalance) * 100).toFixed(2)}% of{' '}
                        {riskSettings.maxWeeklyRisk}%
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all ${
                          metrics.weeklyRiskUsed / metrics.accountBalance >=
                          riskSettings.maxWeeklyRisk / 100
                            ? 'bg-red-600'
                            : metrics.weeklyRiskUsed / metrics.accountBalance >=
                                (riskSettings.maxWeeklyRisk * 0.8) / 100
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.min(100, (metrics.weeklyRiskUsed / metrics.accountBalance / (riskSettings.maxWeeklyRisk / 100)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Monthly Risk */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Monthly Risk</Label>
                      <span className="text-sm text-muted-foreground">
                        {((metrics.monthlyRiskUsed / metrics.accountBalance) * 100).toFixed(2)}% of{' '}
                        {riskSettings.maxMonthlyRisk}%
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all ${
                          metrics.monthlyRiskUsed / metrics.accountBalance >=
                          riskSettings.maxMonthlyRisk / 100
                            ? 'bg-red-600'
                            : metrics.monthlyRiskUsed / metrics.accountBalance >=
                                (riskSettings.maxMonthlyRisk * 0.8) / 100
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.min(100, (metrics.monthlyRiskUsed / metrics.accountBalance / (riskSettings.maxMonthlyRisk / 100)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Metrics */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Consecutive Losses</span>
                      <span className="font-semibold text-red-600">
                        {metrics.consecutiveLosses}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Risk Per Trade</span>
                      <span className="font-semibold">
                        {metrics.averageRiskPerTrade.toFixed(2)}R
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Largest Loss</span>
                      <span className="font-semibold text-red-600">
                        {metrics.largestLoss.toFixed(2)}R
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {optimalSize && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        <CardTitle>Optimal Position Sizing</CardTitle>
                      </div>
                      <CardDescription>Based on Kelly Criterion</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Kelly %</span>
                        <span className="font-semibold">{optimalSize.kelly.toFixed(2)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fractional Kelly (50%)</span>
                        <span className="font-semibold">
                          {optimalSize.fractionalKelly.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Suggested Risk</span>
                        <span className="text-lg font-bold text-green-600">
                          {optimalSize.suggestedRisk.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on {allTrades.filter((t) => t.closed_at).length} closed trades
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <PositionSizeCalculator />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <RiskRulesMonitor rules={riskRules} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Risk Management Settings</CardTitle>
              </div>
              <CardDescription>Configure your risk limits and rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Max Risk Per Trade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={riskSettings.maxRiskPerTrade}
                    onChange={(e) => handleUpdateSettings('maxRiskPerTrade', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Daily Risk (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={riskSettings.maxDailyRisk}
                    onChange={(e) => handleUpdateSettings('maxDailyRisk', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Weekly Risk (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={riskSettings.maxWeeklyRisk}
                    onChange={(e) => handleUpdateSettings('maxWeeklyRisk', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Monthly Risk (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={riskSettings.maxMonthlyRisk}
                    onChange={(e) => handleUpdateSettings('maxMonthlyRisk', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Drawdown (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={riskSettings.maxDrawdown}
                    onChange={(e) => handleUpdateSettings('maxDrawdown', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Consecutive Losses</Label>
                  <Input
                    type="number"
                    value={riskSettings.maxConsecutiveLosses}
                    onChange={(e) =>
                      handleUpdateSettings('maxConsecutiveLosses', Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Open Positions</Label>
                  <Input
                    type="number"
                    value={riskSettings.maxOpenPositions}
                    onChange={(e) => handleUpdateSettings('maxOpenPositions', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Risk:Reward Ratio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={riskSettings.riskRewardMinimum}
                    onChange={(e) =>
                      handleUpdateSettings('riskRewardMinimum', Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <Button className="w-full">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
