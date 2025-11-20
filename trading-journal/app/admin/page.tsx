'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Shield,
  Activity,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile, requireAdmin } from '@/lib/auth-utils'
import type { AdminDashboardStats } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [stats, setStats] = React.useState<AdminDashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = React.useState<any[]>([])

  // Check authorization
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        await requireAdmin()
        setAuthorized(true)
      } catch (error) {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  // Load dashboard data
  React.useEffect(() => {
    if (!authorized) return

    const loadDashboard = async () => {
      setLoading(true)
      try {
        // Get stats
        const [
          usersCount,
          mentorsCount,
          activeMentorsCount,
          pendingReviewsCount,
          completedReviewsCount,
          newUsersWeek,
          newUsersMonth,
          pendingApplications,
        ] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_mentor', true),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_mentor', true).eq('mentor_approved', true).eq('mentor_available', true),
          supabase.from('trade_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('trade_reviews').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('mentor_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ])

        setStats({
          total_users: usersCount.count || 0,
          total_mentors: mentorsCount.count || 0,
          total_active_mentors: activeMentorsCount.count || 0,
          total_reviews_pending: pendingReviewsCount.count || 0,
          total_reviews_completed: completedReviewsCount.count || 0,
          new_users_this_week: newUsersWeek.count || 0,
          new_users_this_month: newUsersMonth.count || 0,
          pending_applications: pendingApplications.count || 0,
        })

        // Get recent activity
        const { data: auditLogs } = await supabase
          .from('admin_audit_log')
          .select('*, admin:admin_id(full_name, email), target_user:target_user_id(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(10)

        setRecentActivity(auditLogs || [])
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [authorized, supabase])

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">You need administrator privileges to access this page</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, mentors, and platform settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/mentors')}>
            <UserCheck className="h-4 w-4 mr-2" />
            Manage Mentors
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.new_users_this_week || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_active_mentors || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.total_mentors || 0} total mentors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_reviews_pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_reviews_completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_applications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Mentor applications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Activity</CardTitle>
          <CardDescription>
            Latest actions performed by administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By {log.admin?.full_name || log.admin?.email || 'Unknown'}
                      {log.target_user && ` • Target: ${log.target_user.full_name || log.target_user.email}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all users</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/admin/users')}>
              <Users className="h-4 w-4 mr-2" />
              View Users
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mentor Applications</CardTitle>
            <CardDescription>Review pending mentor requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/admin/mentors/applications')}>
              <UserCheck className="h-4 w-4 mr-2" />
              Review Applications
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>View system activity logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => router.push('/admin/audit')}>
              <Activity className="h-4 w-4 mr-2" />
              View Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
