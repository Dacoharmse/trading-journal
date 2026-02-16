'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Award,
} from 'lucide-react'
import {
  calculateReportData,
  exportToCSV,
  exportSummaryToCSV,
  exportSymbolBreakdown,
  exportSessionBreakdown,
  downloadFile,
  generateFilename,
  filterTrades,
  type ReportFilter,
} from '@/lib/report-generator'
import { format } from 'date-fns'

export default function ReportsPage() {
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [allTrades, setAllTrades] = React.useState<Trade[]>([])
  const [playbooks, setPlaybooks] = React.useState<Array<{ id: string; name: string }>>([])
  const [symbols, setSymbols] = React.useState<string[]>([])

  // Report filters
  const [dateFrom, setDateFrom] = React.useState(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = React.useState(new Date().toISOString().split('T')[0])
  const [selectedSymbol, setSelectedSymbol] = React.useState('all')
  const [selectedSession, setSelectedSession] = React.useState('all')
  const [selectedPlaybook, setSelectedPlaybook] = React.useState('all')
  const [selectedGrade, setSelectedGrade] = React.useState('all')
  const [outcomeFilter, setOutcomeFilter] = React.useState<'all' | 'wins' | 'losses' | 'breakeven'>(
    'all'
  )

  // Generated report data
  const [reportData, setReportData] = React.useState<ReturnType<
    typeof calculateReportData
  > | null>(null)

  // Load trades and metadata
  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || cancelled) return

        const [tradesRes, playbooksRes] = await Promise.all([
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', session.user.id)
            .order('closed_at', { ascending: false }),
          supabase.from('playbooks').select('id, name').eq('user_id', session.user.id),
        ])

        if (!cancelled) {
          const trades = (tradesRes.data as Trade[]) ?? []
          setAllTrades(trades)
          setPlaybooks((playbooksRes.data as Array<{ id: string; name: string }>) ?? [])

          // Extract unique symbols
          const uniqueSymbols = Array.from(new Set(trades.map((t) => t.symbol).filter(Boolean)))
          setSymbols(uniqueSymbols.sort())
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

  // Generate report
  const handleGenerateReport = () => {
    setGenerating(true)

    try {
      const filter: ReportFilter = {
        dateFrom,
        dateTo,
        symbol: selectedSymbol,
        session: selectedSession,
        playbookId: selectedPlaybook,
        minGrade: selectedGrade,
        outcomeFilter,
      }

      const filteredTrades = filterTrades(allTrades, filter)
      const data = calculateReportData(filteredTrades, dateFrom, dateTo)
      setReportData(data)
    } finally {
      setGenerating(false)
    }
  }

  // Export handlers
  const handleExportDetailedCSV = () => {
    if (!reportData) return
    const csv = exportToCSV(reportData)
    downloadFile(csv, generateFilename('trade_details', 'csv'), 'text/csv')
  }

  const handleExportSummaryCSV = () => {
    if (!reportData) return
    const csv = exportSummaryToCSV(reportData)
    downloadFile(csv, generateFilename('report_summary', 'csv'), 'text/csv')
  }

  const handleExportSymbolBreakdown = () => {
    if (!reportData) return
    const csv = exportSymbolBreakdown(reportData)
    downloadFile(csv, generateFilename('symbol_breakdown', 'csv'), 'text/csv')
  }

  const handleExportSessionBreakdown = () => {
    if (!reportData) return
    const csv = exportSessionBreakdown(reportData)
    downloadFile(csv, generateFilename('session_breakdown', 'csv'), 'text/csv')
  }

  const handleQuickReport = (days: number) => {
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

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate detailed trading reports and export your performance data
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Configure your report parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Date Ranges */}
            <div className="space-y-2">
              <Label>Quick Ranges</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickReport(7)}>
                  Last 7 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickReport(30)}>
                  Last 30 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickReport(90)}>
                  Last 90 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickReport(365)}>
                  Last Year
                </Button>
              </div>
            </div>

            <Separator />

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <Separator />

            {/* Filters */}
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {symbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                  <SelectItem value="London">London</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Playbook</Label>
              <Select value={selectedPlaybook} onValueChange={setSelectedPlaybook}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Playbooks</SelectItem>
                  {playbooks.map((playbook) => (
                    <SelectItem key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Minimum Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A+">A+ and above</SelectItem>
                  <SelectItem value="A">A and above</SelectItem>
                  <SelectItem value="B">B and above</SelectItem>
                  <SelectItem value="C">C and above</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select
                value={outcomeFilter}
                onValueChange={(v) => setOutcomeFilter(v as typeof outcomeFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="wins">Wins Only</SelectItem>
                  <SelectItem value="losses">Losses Only</SelectItem>
                  <SelectItem value="breakeven">Break-Even Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Button className="w-full" onClick={handleGenerateReport} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Report Display */}
        <div className="space-y-6 lg:col-span-2">
          {!reportData ? (
            <Card>
              <CardContent className="flex h-96 flex-col items-center justify-center text-muted-foreground">
                <FileText className="mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">No Report Generated</p>
                <p className="text-sm">Configure filters and click Generate Report</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.totalTrades}</div>
                    <p className="text-xs text-muted-foreground">
                      {reportData.winningTrades}W / {reportData.losingTrades}L /{' '}
                      {reportData.breakEvenTrades}BE
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {reportData.winningTrades} winning trades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                    {reportData.totalPnL >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${reportData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {reportData.totalPnL >= 0 ? '+' : ''}
                      {reportData.totalPnL.toFixed(2)}R
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {reportData.avgRMultiple.toFixed(2)}R per trade
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.profitFactor.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                      Expectancy: {reportData.expectancy.toFixed(2)}R
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Metrics</CardTitle>
                  <CardDescription>
                    Report period: {format(new Date(reportData.dateFrom), 'MMM dd, yyyy')} -{' '}
                    {format(new Date(reportData.dateTo), 'MMM dd, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="font-semibold">Performance</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Average Win:</span>
                          <span className="font-medium text-green-600">
                            +{reportData.avgWin.toFixed(2)}R
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Average Loss:</span>
                          <span className="font-medium text-red-600">
                            -{reportData.avgLoss.toFixed(2)}R
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Largest Win:</span>
                          <span className="font-medium text-green-600">
                            +{reportData.largestWin.toFixed(2)}R
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Largest Loss:</span>
                          <span className="font-medium text-red-600">
                            {reportData.largestLoss.toFixed(2)}R
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold">Additional Stats</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Best Day:</span>
                          <span className="font-medium text-green-600">
                            +{reportData.bestDay.toFixed(2)}R
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Worst Day:</span>
                          <span className="font-medium text-red-600">
                            {reportData.worstDay.toFixed(2)}R
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Hold Time:</span>
                          <span className="font-medium">
                            {reportData.avgHoldTime.toFixed(1)} hours
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Fees:</span>
                          <span className="font-medium">{reportData.totalFees.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Export Report</CardTitle>
                  <CardDescription>Download your report in various formats</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" onClick={handleExportDetailedCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Detailed CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportSummaryCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Summary CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportSymbolBreakdown}>
                      <Download className="mr-2 h-4 w-4" />
                      Symbol Breakdown CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportSessionBreakdown}>
                      <Download className="mr-2 h-4 w-4" />
                      Session Breakdown CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
