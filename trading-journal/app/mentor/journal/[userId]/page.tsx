'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Calendar,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Trade {
  id: string
  symbol: string
  trade_type: string
  entry_price: number
  exit_price: number | null
  pnl: number
  entry_date: string
  exit_date: string | null
  status: string
  setup_name: string | null
  notes: string | null
  actual_rr: number | null
}

interface StudentProfile {
  full_name: string | null
  email: string
  avatar_url: string | null
  experience_level: string | null
  years_of_experience: number | null
  trading_style: string | null
}

export default function StudentJournalPage() {
  const router = useRouter()
  const params = useParams<{ userId: string }>()
  const studentUserId = params?.userId

  const [loading, setLoading] = React.useState(true)
  const [studentProfile, setStudentProfile] = React.useState<StudentProfile | null>(null)
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    if (!studentUserId) return

    const loadData = async () => {
      try {
        const res = await fetch(`/api/mentor/student-trades?userId=${studentUserId}`)
        if (!res.ok) {
          console.error('Failed to fetch student journal:', res.status)
          router.push('/mentor/students')
          return
        }
        const data = await res.json()
        setStudentProfile(data.studentProfile || null)
        setTrades(data.trades || [])
      } catch (error) {
        console.error('Error loading student journal:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [studentUserId, router])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatDate = (date: string) =>
    new Date(date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    return email.slice(0, 2).toUpperCase()
  }

  const closedTrades = trades.filter((t) => t.pnl !== null && t.status !== 'open')
  const winningTrades = closedTrades.filter((t) => t.pnl > 0)
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl)) : 0
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl)) : 0

  const filteredTrades = trades.filter((t) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      t.symbol?.toLowerCase().includes(q) ||
      t.setup_name?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading student journal...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/mentor/students')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarFallback className="font-bold bg-primary/10 text-primary">
              {studentProfile && getInitials(studentProfile.full_name, studentProfile.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {studentProfile?.full_name || studentProfile?.email || 'Student'}'s Journal
            </h1>
            <p className="text-muted-foreground text-sm">{studentProfile?.email}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">Read-only view</Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPnl)}
            </div>
            <p className="text-xs text-muted-foreground">{closedTrades.length} closed trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {winningTrades.length}W / {closedTrades.length - winningTrades.length}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Trade</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(bestTrade)}</div>
            <p className="text-xs text-muted-foreground">Highest profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worst Trade</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(worstTrade)}</div>
            <p className="text-xs text-muted-foreground">Largest loss</p>
          </CardContent>
        </Card>
      </div>

      {/* Trade List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Trades ({trades.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol, setup..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-xl border border-dashed">
              <Activity className="h-10 w-10 mb-3 opacity-40" />
              <p>{search ? 'No trades match your search' : 'No trades recorded yet'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{trade.symbol}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs px-2 py-0.5 ${
                          trade.trade_type === 'long'
                            ? 'text-green-600 border-green-300 dark:border-green-800'
                            : 'text-red-600 border-red-300 dark:border-red-800'
                        }`}
                      >
                        {trade.trade_type}
                      </Badge>
                      <Badge variant={trade.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                        {trade.status}
                      </Badge>
                      {trade.setup_name && (
                        <span className="text-xs text-primary">{trade.setup_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(trade.entry_date)}
                      </span>
                      {trade.actual_rr != null && (
                        <span>{trade.actual_rr.toFixed(2)}R</span>
                      )}
                    </div>
                  </div>
                  <div className={`font-bold tabular-nums text-right ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
