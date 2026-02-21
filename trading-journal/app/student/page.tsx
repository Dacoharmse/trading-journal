'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import type { UserProfile } from '@/types/mentorship'
import {
  GraduationCap,
  Users,
  Eye,
  BookOpen,
  TrendingUp,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  mentorCount: number
  publishedTradesCount: number
  sharedPlaybooksCount: number
  recentActivity: RecentActivity[]
}

interface RecentActivity {
  id: string
  type: 'trade' | 'playbook' | 'mentor'
  title: string
  description: string
  timestamp: string
  mentorName?: string
}

export default function StudentDashboard() {
  const [loading, setLoading] = React.useState(true)
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null)
  const [stats, setStats] = React.useState<DashboardStats>({
    mentorCount: 0,
    publishedTradesCount: 0,
    sharedPlaybooksCount: 0,
    recentActivity: [],
  })

  React.useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profile, dashRes] = await Promise.all([
          getCurrentUserProfile(),
          fetch('/api/student/dashboard'),
        ])
        setUserProfile(profile)

        if (!dashRes.ok) {
          console.error('Dashboard API error:', dashRes.status)
          return
        }

        const data = await dashRes.json()
        const mentors: any[] = data.mentors || []
        const publishedTrades: any[] = data.publishedTrades || []
        const sharedPlaybooks: any[] = data.sharedPlaybooks || []

        const recentActivity: RecentActivity[] = publishedTrades.slice(0, 5).map((t: any) => ({
          id: t.id,
          type: 'trade' as const,
          title: t.title || 'Untitled Trade',
          description: t.description || '',
          timestamp: t.published_at,
          mentorName: t.mentor?.full_name || 'Unknown Mentor',
        }))

        setStats({
          mentorCount: mentors.length,
          publishedTradesCount: publishedTrades.length,
          sharedPlaybooksCount: sharedPlaybooks.length,
          recentActivity,
        })
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {userProfile?.full_name || userProfile?.email}
          </p>
        </div>
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Mentors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mentorCount}</div>
            <p className="text-xs text-muted-foreground">Active mentor relationships</p>
            <Link href="/student/mentors">
              <Button variant="link" className="px-0 mt-2">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Trades</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedTradesCount}</div>
            <p className="text-xs text-muted-foreground">Available to learn from</p>
            <Link href="/student/published-trades">
              <Button variant="link" className="px-0 mt-2">
                Browse trades <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Playbooks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sharedPlaybooksCount}</div>
            <p className="text-xs text-muted-foreground">Playbooks from mentors</p>
            <Link href="/student/playbooks">
              <Button variant="link" className="px-0 mt-2">
                View playbooks <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest published trades and updates from mentors</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No recent activity yet</p>
              <p className="text-sm">Check back soon for published trades from your mentors</p>
              <Link href="/student/published-trades">
                <Button className="mt-4">Browse Published Trades</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {activity.type === 'trade' && (
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    )}
                    {activity.type === 'playbook' && (
                      <BookOpen className="h-5 w-5 text-green-500" />
                    )}
                    {activity.type === 'mentor' && (
                      <Users className="h-5 w-5 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    {activity.mentorName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        By {activity.mentorName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link href="/student/mentors">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              View Your Mentors
            </Button>
          </Link>
          <Link href="/student/published-trades">
            <Button variant="outline" className="w-full justify-start">
              <Eye className="mr-2 h-4 w-4" />
              Browse Published Trades
            </Button>
          </Link>
          <Link href="/student/playbooks">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Access Shared Playbooks
            </Button>
          </Link>
          <Link href="/trades">
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              View My Trades
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
