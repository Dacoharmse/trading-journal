'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  BookOpen,
  Eye,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Star,
  ArrowRight,
  Activity,
  Target,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

interface StudentProgress {
  id: string
  student_id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  connected_at: string
  total_trades: number
  win_rate: number
  total_pnl: number
  last_trade_date: string | null
  needs_attention: boolean
  trend: 'up' | 'down' | 'stable'
}

export default function MentorDashboardPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [studentProgress, setStudentProgress] = React.useState<StudentProgress[]>([])
  const [stats, setStats] = React.useState({
    totalStudents: 0,
    activeStudents: 0,
    sharedPlaybooks: 0,
    publishedTrades: 0,
    averageRating: 0,
    totalReviews: 0,
  })

  // Step 1: Authorization check (separate from data loading)
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await getCurrentUserProfile()
        console.log('[Mentor] Profile result:', profile ? { role: profile.role, is_mentor: profile.is_mentor, mentor_approved: profile.mentor_approved } : null)

        if (!profile) {
          console.log('[Mentor] No profile, redirecting to login')
          router.push('/auth/login')
          return
        }

        const isAdmin = profile.role === 'admin'
        const isMentorApproved = profile.is_mentor && profile.mentor_approved

        if (!isAdmin && !isMentorApproved) {
          console.log('[Mentor] Not admin or approved mentor, redirecting to /')
          router.push('/')
          return
        }

        console.log('[Mentor] Authorized (admin:', isAdmin, ', mentor:', isMentorApproved, ')')
        setAuthorized(true)
      } catch (error) {
        console.error('[Mentor] Auth check failed:', error)
        router.push('/')
      }
    }

    checkAuth()
  }, [router])

  // Step 2: Load data only after authorized
  React.useEffect(() => {
    if (!authorized) return

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        if (!user) return

        const profile = await getCurrentUserProfile()

        const [studentsCount, playbooksCount, tradesCount] = await Promise.all([
          supabase
            .from('mentorship_connections')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', user.id)
            .eq('status', 'active'),
          supabase
            .from('shared_playbooks')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', user.id),
          supabase
            .from('published_trades')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', user.id),
        ])

        setStats({
          totalStudents: studentsCount.count || 0,
          activeStudents: studentsCount.count || 0,
          sharedPlaybooks: playbooksCount.count || 0,
          publishedTrades: tradesCount.count || 0,
          averageRating: profile?.mentor_rating || 0,
          totalReviews: profile?.mentor_total_reviews || 0,
        })

        // Load student progress data
        const { data: studentsData } = await supabase
          .from('mentorship_connections')
          .select(`
            id,
            student_id,
            created_at,
            student_profile:student_id (
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('mentor_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10)

        if (studentsData && studentsData.length > 0) {
          const progressData: StudentProgress[] = await Promise.all(
            studentsData.map(async (student: any) => {
              const { data: trades } = await supabase
                .from('trades')
                .select('pnl, status, entry_date')
                .eq('user_id', student.student_id)
                .order('entry_date', { ascending: false })
                .limit(50)

              const closedTrades = (trades || []).filter((t: any) => t.status === 'closed')
              const winningTrades = closedTrades.filter((t: any) => t.pnl > 0)
              const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
              const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

              const recentTrades = closedTrades.slice(0, 10)
              const recentPnl = recentTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
              const trend = recentPnl > 50 ? 'up' : recentPnl < -50 ? 'down' : 'stable'

              const lastTradeDate = trades?.[0]?.entry_date || null
              const daysSinceLastTrade = lastTradeDate
                ? Math.floor((Date.now() - new Date(lastTradeDate).getTime()) / (1000 * 60 * 60 * 24))
                : 999
              const needsAttention = daysSinceLastTrade > 7 || (winRate < 40 && closedTrades.length >= 5)

              return {
                id: student.id,
                student_id: student.student_id,
                full_name: student.student_profile?.full_name || null,
                email: student.student_profile?.email || '',
                avatar_url: student.student_profile?.avatar_url || null,
                connected_at: student.created_at,
                total_trades: (trades || []).length,
                win_rate: winRate,
                total_pnl: totalPnl,
                last_trade_date: lastTradeDate,
                needs_attention: needsAttention,
                trend,
              }
            })
          )
          setStudentProgress(progressData)
        }
      } catch (error) {
        console.error('[Mentor] Failed to load data (non-fatal):', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authorized, supabase])

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading mentor dashboard...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading mentor data...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mentor Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your students and share your trading knowledge
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              Total: {stats.totalStudents}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Playbooks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sharedPlaybooks}</div>
            <p className="text-xs text-muted-foreground">
              Educational resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedTrades}</div>
            <p className="text-xs text-muted-foreground">
              For student learning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating.toFixed(1)} ⭐
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReviews} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/mentor/students')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>My Students</CardTitle>
                <CardDescription>Manage student connections</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Students
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/mentor/reviews')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <CardTitle>Trade Reviews</CardTitle>
                <CardDescription>View student feedback</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Reviews
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/mentor/playbooks')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Share Playbook</CardTitle>
                <CardDescription>Share strategies with students</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Manage Playbooks
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/mentor/publish')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Publish Trade</CardTitle>
                <CardDescription>Create educational content</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Publish New Trade
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Student Progress Tracker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Progress Tracker</CardTitle>
              <CardDescription>
                Monitor your students' trading performance and identify who needs guidance
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push('/mentor/students')}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {studentProgress.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Students Yet</h3>
              <p className="text-muted-foreground">
                Students will appear here once they connect with you as their mentor.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Students needing attention alert */}
              {studentProgress.filter(s => s.needs_attention).length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {studentProgress.filter(s => s.needs_attention).length} student(s) may need your attention
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Inactive for 7+ days or struggling with win rate
                    </p>
                  </div>
                </div>
              )}

              {/* Student list */}
              <div className="space-y-3">
                {studentProgress.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${
                      student.needs_attention ? 'border-yellow-300 dark:border-yellow-700' : ''
                    }`}
                    onClick={() => router.push('/mentor/students')}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback>
                        {student.full_name
                          ? student.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                          : student.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">
                          {student.full_name || 'Unknown Student'}
                        </h4>
                        {student.needs_attention && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                            Needs Attention
                          </Badge>
                        )}
                        {student.trend === 'up' && (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                        {student.trend === 'down' && (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {student.total_trades} trades
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {student.win_rate.toFixed(0)}% win rate
                        </span>
                        {student.last_trade_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last: {new Date(student.last_trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-semibold ${student.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {student.total_pnl >= 0 ? '+' : ''}
                        ${Math.abs(student.total_pnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-muted-foreground">Total P&L</div>
                    </div>

                    <div className="w-24 hidden md:block">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className="font-medium">{student.win_rate.toFixed(0)}%</span>
                      </div>
                      <Progress
                        value={student.win_rate}
                        className={`h-2 ${student.win_rate >= 50 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Stats Summary */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {studentProgress.filter(s => s.trend === 'up').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Improving</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {studentProgress.filter(s => s.trend === 'stable').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Stable</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {studentProgress.filter(s => s.trend === 'down').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Struggling</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
