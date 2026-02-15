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
  DollarSign,
  BarChart3,
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

interface StudentConnection {
  id: string
  student_id: string
  mentor_id: string
  status: string
  created_at: string
  student_profile?: {
    full_name: string | null
    email: string
    avatar_url: string | null
    experience_level: string | null
    years_of_experience: number | null
    trading_style: string | null
  }
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
  const [students, setStudents] = React.useState<StudentConnection[]>([])
  const [filteredStudents, setFilteredStudents] = React.useState<StudentConnection[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')

  const [selectedStudent, setSelectedStudent] = React.useState<StudentConnection | null>(null)
  const [studentStats, setStudentStats] = React.useState<StudentStats | null>(null)
  const [studentTrades, setStudentTrades] = React.useState<StudentTrade[]>([])
  const [showStudentDialog, setShowStudentDialog] = React.useState(false)
  const [loadingStudentData, setLoadingStudentData] = React.useState(false)

  // Load students
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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data: studentsData, error } = await supabase
          .from('mentorship_connections')
          .select(`
            *,
            student_profile:student_id (
              full_name,
              email,
              avatar_url,
              experience_level,
              years_of_experience,
              trading_style
            )
          `)
          .eq('mentor_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Failed to query mentorship_connections:', error)
        }

        setStudents(studentsData || [])
        setFilteredStudents(studentsData || [])
      } catch (error) {
        console.error('Failed to load students:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [supabase, router, toast])

  // Filter students by search
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students)
      return
    }

    const filtered = students.filter((student) => {
      const name = student.student_profile?.full_name?.toLowerCase() || ''
      const email = student.student_profile?.email.toLowerCase() || ''
      const search = searchTerm.toLowerCase()

      return name.includes(search) || email.includes(search)
    })

    setFilteredStudents(filtered)
  }, [searchTerm, students])

  // Load student details
  const handleViewStudent = async (student: StudentConnection) => {
    setSelectedStudent(student)
    setShowStudentDialog(true)
    setLoadingStudentData(true)

    try {
      // Load student's trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', student.student_id)
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
            <p className="text-xs text-muted-foreground">Active connections</p>
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
          <CardDescription>View all your active student connections</CardDescription>
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
                  : 'Students will appear here when they connect with you'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.student_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(
                            student.student_profile?.full_name || null,
                            student.student_profile?.email || ''
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {student.student_profile?.full_name || 'Unknown Student'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {student.student_profile?.email}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Connected</span>
                      <span className="font-medium">{formatDate(student.created_at)}</span>
                    </div>
                    <Badge variant="secondary" className="w-full justify-center">
                      {student.status}
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedStudent?.student_profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {selectedStudent && getInitials(
                    selectedStudent.student_profile?.full_name || null,
                    selectedStudent.student_profile?.email || ''
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>
                  {selectedStudent?.student_profile?.full_name || 'Student'}'s Trading Journal
                </DialogTitle>
                <DialogDescription>
                  {selectedStudent?.student_profile?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loadingStudentData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading trading data...</div>
            </div>
          ) : studentStats ? (
            <div className="space-y-6 mt-6">
              {/* Student Profile Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Student's trading background and experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Experience Level</p>
                      <p className="text-lg font-semibold">
                        {formatExperienceLevel(selectedStudent?.student_profile?.experience_level || null)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Years of Experience</p>
                      <p className="text-lg font-semibold">
                        {selectedStudent?.student_profile?.years_of_experience
                          ? `${selectedStudent.student_profile.years_of_experience} years`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Primary Trading Style</p>
                      <p className="text-lg font-semibold">
                        {formatTradingStyle(selectedStudent?.student_profile?.trading_style || null)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${studentStats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(studentStats.total_pnl)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {studentStats.total_trades} total trades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentStats.win_rate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {studentStats.winning_trades}W / {studentStats.losing_trades}L
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Best Trade</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(studentStats.best_trade)}
                    </div>
                    <p className="text-xs text-muted-foreground">Highest profit</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Worst Trade</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(studentStats.worst_trade)}
                    </div>
                    <p className="text-xs text-muted-foreground">Largest loss</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Trades */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                  <CardDescription>Last 50 trades from this student</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentTrades.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No trades yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentTrades.slice(0, 10).map((trade) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">{trade.symbol}</h4>
                              <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                                {trade.status}
                              </Badge>
                              <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                                {trade.trade_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Entry: {formatCurrency(trade.entry_price)}</span>
                              {trade.exit_price && (
                                <span>Exit: {formatCurrency(trade.exit_price)}</span>
                              )}
                              <span>{formatDate(trade.entry_date)}</span>
                              {trade.setup_name && (
                                <span className="text-primary">{trade.setup_name}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    router.push(`/trades?student=${selectedStudent?.student_id}`)
                    setShowStudentDialog(false)
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Journal
                </Button>
                <Button variant="outline" disabled>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Student
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
