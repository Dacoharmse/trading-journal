'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  User,
  Calendar,
  Eye,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface TradeReviewRequest {
  id: string
  trade_id: string
  student_id: string
  mentor_id: string
  status: 'pending' | 'in_progress' | 'completed'
  request_note: string | null
  created_at: string
  reviewed_at: string | null
  review_feedback: string | null
  student_profile?: {
    full_name: string | null
    email: string
  }
  trade?: {
    symbol: string
    entry_price: number
    exit_price: number | null
    pnl: number
    trade_type: string
    entry_date: string
    status: string
  }
}

export default function MentorTradeReviewsPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [reviews, setReviews] = React.useState<TradeReviewRequest[]>([])
  const [filteredReviews, setFilteredReviews] = React.useState<TradeReviewRequest[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')

  const [selectedReview, setSelectedReview] = React.useState<TradeReviewRequest | null>(null)
  const [showReviewDialog, setShowReviewDialog] = React.useState(false)
  const [reviewFeedback, setReviewFeedback] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const [stats, setStats] = React.useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
  })

  // Load review requests
  React.useEffect(() => {
    const loadReviews = async () => {
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

        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data: reviewsData, error } = await supabase
          .from('trade_review_requests')
          .select(`
            *,
            student_profile:student_id (
              full_name,
              email
            ),
            trade:trade_id (
              symbol,
              entry_price,
              exit_price,
              pnl,
              trade_type,
              entry_date,
              status
            )
          `)
          .eq('mentor_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setReviews(reviewsData || [])
        setFilteredReviews(reviewsData || [])

        // Calculate stats
        const pending = reviewsData?.filter(r => r.status === 'pending').length || 0
        const inProgress = reviewsData?.filter(r => r.status === 'in_progress').length || 0
        const completed = reviewsData?.filter(r => r.status === 'completed').length || 0

        setStats({
          pending,
          inProgress,
          completed,
          total: reviewsData?.length || 0,
        })
      } catch (error: any) {
        console.error('Failed to load reviews:', error)

        // Check if table doesn't exist
        if (error?.message?.includes('relation "trade_review_requests" does not exist')) {
          toast({
            title: 'Database Setup Required',
            description: 'The trade review requests table needs to be created. Please run the migration.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load trade review requests',
            variant: 'destructive',
          })
        }
      } finally {
        setLoading(false)
      }
    }

    loadReviews()
  }, [supabase, router, toast])

  // Filter reviews
  React.useEffect(() => {
    let filtered = [...reviews]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (review) =>
          review.trade?.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.student_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.student_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((review) => review.status === statusFilter)
    }

    setFilteredReviews(filtered)
  }, [reviews, searchTerm, statusFilter])

  const handleStartReview = async (review: TradeReviewRequest) => {
    if (review.status === 'pending') {
      try {
        const { error } = await supabase
          .from('trade_review_requests')
          .update({ status: 'in_progress' })
          .eq('id', review.id)

        if (error) throw error

        setReviews(
          reviews.map((r) =>
            r.id === review.id ? { ...r, status: 'in_progress' } : r
          )
        )
      } catch (error) {
        console.error('Failed to update status:', error)
      }
    }

    setSelectedReview(review)
    setReviewFeedback(review.review_feedback || '')
    setShowReviewDialog(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedReview || !reviewFeedback.trim()) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('trade_review_requests')
        .update({
          status: 'completed',
          review_feedback: reviewFeedback.trim(),
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReview.id)

      if (error) throw error

      setReviews(
        reviews.map((r) =>
          r.id === selectedReview.id
            ? {
                ...r,
                status: 'completed',
                review_feedback: reviewFeedback.trim(),
                reviewed_at: new Date().toISOString(),
              }
            : r
        )
      )

      toast({
        title: 'Success',
        description: 'Trade review submitted successfully',
      })

      setShowReviewDialog(false)
      setSelectedReview(null)
      setReviewFeedback('')
    } catch (error) {
      console.error('Failed to submit review:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      in_progress: { variant: 'default', label: 'In Progress' },
      completed: { variant: 'default', label: 'Completed' },
    }

    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading trade reviews...</div>
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
          <h1 className="text-3xl font-bold tracking-tight">Trade Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Review and provide feedback on your students' trades
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently reviewing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Reviews completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Review Requests</CardTitle>
          <CardDescription>Filter and search through student trade review requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Review Requests</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You haven\'t received any trade review requests yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {review.student_profile?.full_name || 'Student'}
                      </h3>
                      {getStatusBadge(review.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.student_profile?.email}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trade Details */}
                {review.trade && (
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          {review.trade.symbol}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {review.trade.trade_type} • {review.trade.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${review.trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${review.trade.pnl.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${review.trade.entry_price} → {review.trade.exit_price ? `$${review.trade.exit_price}` : 'Open'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {review.request_note && (
                  <div>
                    <p className="text-sm font-medium mb-1">Student's Note:</p>
                    <p className="text-sm text-muted-foreground">{review.request_note}</p>
                  </div>
                )}

                {review.review_feedback && (
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Your Review:</p>
                    <p className="text-sm whitespace-pre-wrap">{review.review_feedback}</p>
                    {review.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed on {new Date(review.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/trades/${review.trade_id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Trade Details
                  </Button>
                  <Button
                    onClick={() => handleStartReview(review)}
                    disabled={review.status === 'completed'}
                  >
                    {review.status === 'completed' ? 'View Review' : 'Review Trade'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.status === 'completed' ? 'Review Details' : 'Review Student Trade'}
            </DialogTitle>
            <DialogDescription>
              Provide constructive feedback to help your student improve
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4 py-4">
              {/* Student Info */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {selectedReview.student_profile?.full_name || 'Student'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedReview.student_profile?.email}
                </p>
              </div>

              {/* Trade Info */}
              {selectedReview.trade && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">{selectedReview.trade.symbol}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span> {selectedReview.trade.trade_type}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entry:</span> ${selectedReview.trade.entry_price}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Exit:</span> {selectedReview.trade.exit_price ? `$${selectedReview.trade.exit_price}` : 'Open'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">P&L:</span>{' '}
                      <span className={selectedReview.trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${selectedReview.trade.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedReview.request_note && (
                <div>
                  <p className="text-sm font-medium mb-1">Student's Request:</p>
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    {selectedReview.request_note}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Your Feedback</label>
                <Textarea
                  placeholder="Provide detailed feedback on the trade execution, entry/exit timing, risk management, etc..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={8}
                  disabled={selectedReview.status === 'completed'}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false)
                setSelectedReview(null)
                setReviewFeedback('')
              }}
            >
              {selectedReview?.status === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            {selectedReview?.status !== 'completed' && (
              <Button
                onClick={handleSubmitReview}
                disabled={!reviewFeedback.trim() || submitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
