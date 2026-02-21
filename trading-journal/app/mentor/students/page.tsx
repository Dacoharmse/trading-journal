'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare,
  Calendar,
  Activity,
  GraduationCap,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface StudentProfile {
  id: string
  user_id: string | null
  full_name: string | null
  email: string
  avatar_url: string | null
  experience_level: string | null
  years_of_experience: number | null
  trading_style: string | null
  created_at: string
}

interface StudentStats {
  total_trades: number
  winning_trades: number
  losing_trades: number
  total_pnl: number
  win_rate: number
  average_win: number
  average_loss: number
  best_trade: number
  worst_trade: number
  active_trades: number
  last_trade_date: string | null
}

interface StudentTrade {
  id: string
  symbol: string
  entry_price: number
  exit_price: number | null
  quantity: number
  pnl: number
  trade_type: string
  entry_date: string
  exit_date: string | null
  status: string
  notes: string | null
  setup_name: string | null
}

export default function MentorStudentsPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [students, setStudents] = React.useState<StudentProfile[]>([])
  const [filteredStudents, setFilteredStudents] = React.useState<StudentProfile[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')

  const [selectedStudent, setSelectedStudent] = React.useState<StudentProfile | null>(null)
  const [studentStats, setStudentStats] = React.useState<StudentStats | null>(null)
  const [studentTrades, setStudentTrades] = React.useState<StudentTrade[]>([])
  const [showStudentDialog, setShowStudentDialog] = React.useState(false)
  const [loadingStudentData, setLoadingStudentData] = React.useState(false)

  // Load all traders as students
  React.useEffect(() => {
    const loadStudents = async () => {
      try {
        const profile = await getCurrentUserProfile()
        if (!profile) {
          router.push('/auth/login')
          return
        }

        const isAdmin = profile.role === 'admin'
        if (!isAdmin && (!profile.is_mentor || !profile.mentor_approved)) {
          router.push('/')
          return
        }

        const res = await fetch('/api/mentor/students')
        if (!res.ok) {
          console.error('Failed to fetch students:', res.statusText)
          return
        }

        const { students: studentsData } = await res.json()
        setStudents(studentsData || [])
        setFilteredStudents(studentsData || [])
      } catch (error) {
        console.error('Failed to load students:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [router])

  // Filter students by search
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students)
      return
    }

    const filtered = students.filter((student) => {
      const name = student.full_name?.toLowerCase() || ''
      const email = student.email?.toLowerCase() || ''
      const search = searchTerm.toLowerCase()

      return name.includes(search) || email.includes(search)
    })

    setFilteredStudents(filtered)
  }, [searchTerm, students])

  // Load student details
  const handleViewStudent = async (student: StudentProfile) => {
    setSelectedStudent(student)
    setShowStudentDialog(true)
    setLoadingStudentData(true)

    const studentUserId = student.user_id || student.id

    try {
      // Load student's trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', studentUserId)
        .order('entry_date', { ascending: false })
        .limit(50)

      if (tradesError) throw tradesError

      setStudentTrades(tradesData || [])

      // Calculate stats
      const trades = tradesData || []
      const closedTrades = trades.filter((t) => t.status === 'closed')
      const winningTrades = closedTrades.filter((t) => t.pnl > 0)
      const losingTrades = closedTrades.filter((t) => t.pnl < 0)

      const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

      const avgWin = winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
        : 0

      const avgLoss = losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
        : 0

      const bestTrade = closedTrades.length > 0
        ? Math.max(...closedTrades.map((t) => t.pnl))
        : 0

      const worstTrade = closedTrades.length > 0
        ? Math.min(...closedTrades.map((t) => t.pnl))
        : 0

      const lastTrade = trades.length > 0 ? trades[0].entry_date : null

      setStudentStats({
        total_trades: trades.length,
        winning_trades: winningTrades.length,
        losing_trades: losingTrades.length,
        total_pnl: totalPnl,
        win_rate: winRate,
        average_win: avgWin,
        average_loss: avgLoss,
        best_trade: bestTrade,
        worst_trade: worstTrade,
        active_trades: trades.filter((t) => t.status === 'open').length,
        last_trade_date: lastTrade,
      })
    } catch (error) {
      console.error('Failed to load student data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load student trading data',
        variant: 'destructive',
      })
    } finally {
      setLoadingStudentData(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const formatExperienceLevel = (level: string | null) => {
    if (!level) return 'Not specified'
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  const formatTradingStyle = (style: string | null) => {
    if (!style) return 'Not specified'
    return style.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/mentor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">My Students</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your student connections
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Total traders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                return new Date(s.created_at) > monthAgo
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">New students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">High</div>
            <p className="text-xs text-muted-foreground">Student activity level</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>View all traders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Students Grid */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No students found' : 'No students yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'No traders found'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(student.full_name, student.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {student.full_name || 'Unknown Student'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Joined</span>
                      <span className="font-medium">{formatDate(student.created_at)}</span>
                    </div>
                    <Badge variant="secondary" className="w-full justify-center">
                      Trader
                    </Badge>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewStudent(student)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Journal
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="sm:max-w-[90vw] sm:w-[90vw] max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <DialogHeader>
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src={selectedStudent?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {selectedStudent && getInitials(selectedStudent.full_name, selectedStudent.email || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-2xl">
                    {selectedStudent?.full_name || 'Student'}
                  </DialogTitle>
                  <Badge variant="secondary" className="text-sm px-3 py-0.5">Trader</Badge>
                </div>
                <DialogDescription className="mt-1 text-base">{selectedStudent?.email}</DialogDescription>
                <p className="text-sm text-muted-foreground mt-1">
                  Joined {selectedStudent?.created_at ? formatDate(selectedStudent.created_at) : '—'}
                </p>
              </div>
            </div>
          </DialogHeader>

          {loadingStudentData ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-muted-foreground">Loading trading data...</div>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Profile strip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                    <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="text-base font-semibold truncate">
                      {formatExperienceLevel(selectedStudent?.experience_level || null)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Years Trading</p>
                    <p className="text-base font-semibold">
                      {selectedStudent?.years_of_experience
                        ? `${selectedStudent.years_of_experience} yrs`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                    <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Style</p>
                    <p className="text-base font-semibold truncate">
                      {formatTradingStyle(selectedStudent?.trading_style || null)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              {studentStats && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-5 rounded-xl border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-2">Total P&L</p>
                      <p className={`text-2xl font-bold ${studentStats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(studentStats.total_pnl)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{studentStats.total_trades} trades</p>
                    </div>
                    <div className="text-center p-5 rounded-xl border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-2">Win Rate</p>
                      <p className="text-2xl font-bold">{studentStats.win_rate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {studentStats.winning_trades}W / {studentStats.losing_trades}L
                      </p>
                    </div>
                    <div className="text-center p-5 rounded-xl border bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
                      <p className="text-sm text-muted-foreground mb-2">Best Trade</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(studentStats.best_trade)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Highest profit</p>
                    </div>
                    <div className="text-center p-5 rounded-xl border bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
                      <p className="text-sm text-muted-foreground mb-2">Worst Trade</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(studentStats.worst_trade)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Largest loss</p>
                    </div>
                  </div>

                  {/* Win/Loss bar */}
                  {studentStats.total_trades > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600 font-medium">{studentStats.winning_trades} wins</span>
                        <span className="text-muted-foreground text-xs">Win / Loss Split</span>
                        <span className="text-red-600 font-medium">{studentStats.losing_trades} losses</span>
                      </div>
                      <div className="h-2.5 bg-red-200 dark:bg-red-900/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${studentStats.win_rate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Recent Trades */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Recent Trades</h3>
                  <span className="text-sm text-muted-foreground">
                    Last 10 of {studentStats?.total_trades || 0}
                  </span>
                </div>
                {studentTrades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-xl border border-dashed">
                    <Activity className="h-10 w-10 mb-3 opacity-40" />
                    <p>No trades recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentTrades.slice(0, 10).map((trade) => (
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
                            {trade.setup_name && (
                              <span className="text-sm text-primary truncate">{trade.setup_name}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formatDate(trade.entry_date)}
                          </p>
                        </div>
                        <div className={`font-bold tabular-nums ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    const studentUserId = selectedStudent?.user_id || selectedStudent?.id
                    router.push(`/trades?student=${studentUserId}`)
                    setShowStudentDialog(false)
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Journal
                </Button>
                <Button size="lg" variant="outline" disabled>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Student
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
