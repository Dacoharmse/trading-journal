'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  BarChart3,
  Target,
  Star,
  Eye,
  ArrowRight,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface DashboardStats {
  connectedMentors: number
  sharedPlaybooks: number
  publishedTrades: number
  pendingReviews: number
}

interface Mentor {
  id: string
  full_name: string | null
  email: string
  bio: string | null
  connected_at: string
}

interface SharedPlaybook {
  id: string
  playbook_id: string
  shared_note: string | null
  created_at: string
  playbook: {
    name: string
    description: string | null
    category: string
  }
  mentor: {
    full_name: string | null
  }
}

interface PublishedTrade {
  id: string
  trade_id: string
  title: string
  description: string | null
  view_count: number
  published_at: string
  trade: {
    symbol: string
    trade_type: string
    pnl: number
    chart_image_url: string | null
  }
  mentor: {
    full_name: string | null
  }
}

interface ReviewRequest {
  id: string
  trade_id: string
  status: string
  created_at: string
  trade: {
    symbol: string
    trade_type: string
    entry_date: string
  }
  mentor: {
    full_name: string | null
  }
}

export default function StudentDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState<DashboardStats>({
    connectedMentors: 0,
    sharedPlaybooks: 0,
    publishedTrades: 0,
    pendingReviews: 0,
  })
  const [mentors, setMentors] = React.useState<Mentor[]>([])
  const [recentPlaybooks, setRecentPlaybooks] = React.useState<SharedPlaybook[]>([])
  const [recentTrades, setRecentTrades] = React.useState<PublishedTrade[]>([])
  const [recentReviews, setRecentReviews] = React.useState<ReviewRequest[]>([])

  React.useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/student/dashboard')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load dashboard')
      }

      const data = await res.json()
      const mentorsData: Mentor[] = data.mentors || []
      const playbooksData: SharedPlaybook[] = data.sharedPlaybooks || []
      const tradesData: PublishedTrade[] = data.publishedTrades || []
      const reviewsData: ReviewRequest[] = data.reviews || []

      setMentors(mentorsData)
      setRecentPlaybooks(playbooksData.slice(0, 3))
      setRecentTrades(tradesData.slice(0, 3))
      setRecentReviews(reviewsData.slice(0, 3))

      setStats({
        connectedMentors: mentorsData.length,
        sharedPlaybooks: playbooksData.length,
        publishedTrades: tradesData.length,
        pendingReviews: reviewsData.filter((r) => r.status === 'pending').length,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-muted-foreground">
          Access educational content, track your progress, and connect with mentors
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Mentors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connectedMentors}</div>
            <p className="text-xs text-muted-foreground">Active mentor relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Playbooks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sharedPlaybooks}</div>
            <p className="text-xs text-muted-foreground">Available to study</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedTrades}</div>
            <p className="text-xs text-muted-foreground">Educational content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">Awaiting feedback</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Connected Mentors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Mentors</CardTitle>
                <CardDescription>Active mentorship connections</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/student/mentors')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mentors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No mentors connected yet</p>
                <Button onClick={() => router.push('/student/mentors')}>
                  Find Mentors
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {mentors.slice(0, 3).map((mentor) => (
                  <div key={mentor.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(mentor.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mentor.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground truncate">{mentor.email}</p>
                      {mentor.bio && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mentor.bio}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">Connected</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Review Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trade Reviews</CardTitle>
                <CardDescription>Your recent review requests</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/student/reviews')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentReviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No review requests yet</p>
                <Button onClick={() => router.push('/student/reviews')}>
                  Request Review
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{review.trade.symbol}</span>
                        <Badge variant={review.trade.trade_type === 'long' ? 'default' : 'secondary'} className="text-xs">
                          {review.trade.trade_type.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          review.status === 'completed' ? 'default' :
                          review.status === 'pending' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {review.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Mentor: {review.mentor.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDate(review.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shared Playbooks */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shared Playbooks</CardTitle>
              <CardDescription>Trading strategies shared by your mentors</CardDescription>
            </div>
            <Button onClick={() => router.push('/student/playbooks')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentPlaybooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No playbooks shared yet</p>
              <p className="text-sm text-muted-foreground">
                Your mentors can share their trading playbooks with you
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {recentPlaybooks.map((shared) => (
                <div
                  key={shared.id}
                  className="p-6 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/student/playbooks/${shared.playbook_id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <Badge variant="outline" className="text-xs">
                      {shared.playbook.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-2 line-clamp-1">{shared.playbook.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {shared.playbook.description || 'No description'}
                  </p>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {shared.mentor.full_name || 'Unknown'}</span>
                    <span>{formatDate(shared.created_at)}</span>
                  </div>
                  {shared.shared_note && (
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                      <p className="line-clamp-2">{shared.shared_note}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published Trades */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Educational Trades</CardTitle>
              <CardDescription>Real trades published by mentors for learning</CardDescription>
            </div>
            <Button onClick={() => router.push('/student/trades')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No published trades yet</p>
              <p className="text-sm text-muted-foreground">
                Your mentors can publish their trades to help you learn
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {recentTrades.map((published) => (
                <div
                  key={published.id}
                  className="rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/student/trades/${published.id}`)}
                >
                  {/* Trade Preview */}
                  <div className="relative h-40 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                    {published.trade.chart_image_url ? (
                      <img
                        src={published.trade.chart_image_url}
                        alt={published.trade.symbol}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-2xl font-bold">{published.trade.symbol}</p>
                        </div>
                      </div>
                    )}
                    {/* P&L Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        className={
                          published.trade.pnl > 0
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : published.trade.pnl < 0
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-500 text-white hover:bg-gray-600'
                        }
                      >
                        {published.trade.pnl > 0 ? '+' : ''}
                        ${Math.abs(published.trade.pnl).toFixed(2)}
                      </Badge>
                    </div>
                  </div>

                  {/* Trade Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold line-clamp-1">{published.title}</h3>
                      <Badge variant={published.trade.trade_type === 'long' ? 'default' : 'secondary'} className="text-xs ml-2">
                        {published.trade.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                    {published.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {published.description}
                      </p>
                    )}
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>By {published.mentor.full_name || 'Unknown'}</span>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{published.view_count}</span>
                      </div>
                    </div>
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
