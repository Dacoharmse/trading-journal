'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  ArrowLeft,
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  Target,
  Calendar,
  User,
  Filter,
  FileText,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'

interface Trade {
  id: string
  symbol: string
  trade_type: string
  entry_date: string
  exit_date: string | null
  entry_price: number
  exit_price: number | null
  quantity: number
  pnl: number
  chart_image_url: string | null
  notes: string | null
  strategy: string | null
}

interface ReviewRequest {
  id: string
  trade_id: string
  mentor_id: string
  student_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  specific_questions: string | null
  mentor_feedback: string | null
  created_at: string
  updated_at: string
  trade: Trade
  mentor: {
    id: string
    full_name: string | null
    email: string
  }
}

interface Mentor {
  id: string
  full_name: string | null
  email: string
  bio: string | null
}

export default function StudentReviewsPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [reviewRequests, setReviewRequests] = React.useState<ReviewRequest[]>([])
  const [myTrades, setMyTrades] = React.useState<Trade[]>([])
  const [mentors, setMentors] = React.useState<Mentor[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [mentorFilter, setMentorFilter] = React.useState<string>('all')

  const [showRequestDialog, setShowRequestDialog] = React.useState(false)
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const [selectedMentor, setSelectedMentor] = React.useState<string>('')
  const [specificQuestions, setSpecificQuestions] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const [showDetailsDialog, setShowDetailsDialog] = React.useState(false)
  const [selectedReview, setSelectedReview] = React.useState<ReviewRequest | null>(null)

  const [showTradeSelectDialog, setShowTradeSelectDialog] = React.useState(false)
  const [tradeSearchTerm, setTradeSearchTerm] = React.useState('')

  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load connected mentors
      const { data: connections, error: connectionsError } = await supabase
        .from('mentorship_connections')
        .select(`
          mentor_id,
          mentor:mentor_id (
            id,
            full_name,
            email,
            bio
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (connectionsError) throw connectionsError

      const mentorsData = connections?.map((conn: any) => conn.mentor) || []
      setMentors(mentorsData)

      // Load review requests
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('trade_review_requests')
        .select(`
          id,
          trade_id,
          mentor_id,
          student_id,
          status,
          specific_questions,
          mentor_feedback,
          created_at,
          updated_at,
          trade:trade_id (
            id,
            symbol,
            trade_type,
            entry_date,
            exit_date,
            entry_price,
            exit_price,
            quantity,
            pnl,
            chart_image_url,
            notes,
            strategy
          ),
          mentor:mentor_id (
            id,
            full_name,
            email
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError
      setReviewRequests(reviewsData || [])

      // Load student's trades for requesting reviews
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(50)

      if (tradesError) throw tradesError
      setMyTrades(tradesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load review requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReview = async () => {
    if (!selectedTrade || !selectedMentor) {
      toast({
        title: 'Missing Information',
        description: 'Please select a trade and mentor',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('trade_review_requests')
        .insert({
          trade_id: selectedTrade.id,
          mentor_id: selectedMentor,
          student_id: user.id,
          status: 'pending',
          specific_questions: specificQuestions.trim() || null,
        })

      if (error) throw error

      toast({
        title: 'Review Requested',
        description: 'Your trade review request has been sent to the mentor',
      })

      setShowRequestDialog(false)
      setShowTradeSelectDialog(false)
      setSelectedTrade(null)
      setSelectedMentor('')
      setSpecificQuestions('')
      await loadData()
    } catch (error) {
      console.error('Error requesting review:', error)
      toast({
        title: 'Error',
        description: 'Failed to request review',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('trade_review_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)

      if (error) throw error

      toast({
        title: 'Request Cancelled',
        description: 'Your review request has been cancelled',
      })

      await loadData()
      setShowDetailsDialog(false)
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast({
        title: 'Error',
        description: 'Failed to cancel request',
        variant: 'destructive',
      })
    }
  }

  const filteredRequests = React.useMemo(() => {
    return reviewRequests.filter((request) => {
      const matchesSearch =
        request.trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.mentor.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || request.status === statusFilter
      const matchesMentor = mentorFilter === 'all' || request.mentor_id === mentorFilter

      return matchesSearch && matchesStatus && matchesMentor
    })
  }, [reviewRequests, searchTerm, statusFilter, mentorFilter])

  const filteredTrades = React.useMemo(() => {
    return myTrades.filter((trade) =>
      trade.symbol.toLowerCase().includes(tradeSearchTerm.toLowerCase())
    )
  }, [myTrades, tradeSearchTerm])

  const stats = React.useMemo(() => {
    return {
      total: reviewRequests.length,
      pending: reviewRequests.filter((r) => r.status === 'pending').length,
      inProgress: reviewRequests.filter((r) => r.status === 'in_progress').length,
      completed: reviewRequests.filter((r) => r.status === 'completed').length,
    }
  }, [reviewRequests])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'outline'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <MessageSquare className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading review requests...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/student/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">Trade Reviews</h1>
          <p className="text-muted-foreground">Request feedback from your mentors on your trades</p>
        </div>
        <Button onClick={() => setShowTradeSelectDialog(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Request Review
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Reviews received</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trades or mentors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={mentorFilter} onValueChange={setMentorFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All mentors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Mentors</SelectItem>
            {mentors.map((mentor) => (
              <SelectItem key={mentor.id} value={mentor.id}>
                {mentor.full_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Review Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {reviewRequests.length === 0 ? 'No review requests yet' : 'No requests match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {reviewRequests.length === 0
                ? 'Request feedback from your mentors to improve your trading'
                : 'Try adjusting your search or filters'}
            </p>
            {reviewRequests.length === 0 && (
              <Button onClick={() => setShowTradeSelectDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Your First Review
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Trade Chart Preview */}
                  <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                    {request.trade.chart_image_url ? (
                      <img
                        src={request.trade.chart_image_url}
                        alt={request.trade.symbol}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 mx-auto mb-1 text-muted-foreground opacity-50" />
                          <p className="text-lg font-bold">{request.trade.symbol}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Request Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold">{request.trade.symbol}</h3>
                          <Badge variant={request.trade.trade_type === 'long' ? 'default' : 'secondary'}>
                            {request.trade.trade_type.toUpperCase()}
                          </Badge>
                          <Badge
                            className={
                              request.trade.pnl > 0
                                ? 'bg-green-500 text-white'
                                : request.trade.pnl < 0
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-500 text-white'
                            }
                          >
                            {request.trade.pnl > 0 ? '+' : ''}
                            {formatCurrency(request.trade.pnl)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Entered {formatDate(request.trade.entry_date)}</span>
                          </div>
                          {request.trade.strategy && (
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span>{request.trade.strategy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                    </div>

                    {/* Mentor Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(request.mentor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        Mentor: {request.mentor.full_name || 'Unknown'}
                      </span>
                    </div>

                    {/* Questions */}
                    {request.specific_questions && (
                      <div className="p-3 bg-muted rounded mb-3">
                        <p className="text-xs font-medium mb-1">Your Questions:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.specific_questions}
                        </p>
                      </div>
                    )}

                    {/* Feedback Preview */}
                    {request.mentor_feedback && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded mb-3">
                        <p className="text-xs font-medium mb-1 text-primary">Mentor Feedback:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.mentor_feedback}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Requested {formatDate(request.created_at)}
                      </span>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReview(request)
                            setShowDetailsDialog(true)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trade Selection Dialog */}
      <Dialog open={showTradeSelectDialog} onOpenChange={setShowTradeSelectDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Trade to Review</DialogTitle>
            <DialogDescription>Choose a trade from your journal to request feedback</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trades by symbol..."
                value={tradeSearchTerm}
                onChange={(e) => setTradeSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredTrades.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {myTrades.length === 0 ? 'No trades found in your journal' : 'No trades match your search'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedTrade?.id === trade.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center">
                          {trade.chart_image_url ? (
                            <img src={trade.chart_image_url} alt={trade.symbol} className="w-full h-full object-cover rounded" />
                          ) : (
                            <p className="font-bold">{trade.symbol}</p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{trade.symbol}</p>
                            <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'} className="text-xs">
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(trade.entry_date)} • {formatCurrency(trade.pnl)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          trade.pnl > 0
                            ? 'bg-green-500 text-white'
                            : trade.pnl < 0
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-500 text-white'
                        }
                      >
                        {trade.pnl > 0 ? '+' : ''}
                        {formatCurrency(trade.pnl)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTradeSelectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTrade) {
                  setShowTradeSelectDialog(false)
                  setShowRequestDialog(true)
                }
              }}
              disabled={!selectedTrade}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Review Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Trade Review</DialogTitle>
            <DialogDescription>
              Get feedback from a mentor on your {selectedTrade?.symbol} trade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selected Trade Summary */}
            {selectedTrade && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center">
                    {selectedTrade.chart_image_url ? (
                      <img src={selectedTrade.chart_image_url} alt={selectedTrade.symbol} className="w-full h-full object-cover rounded" />
                    ) : (
                      <p className="text-xl font-bold">{selectedTrade.symbol}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{selectedTrade.symbol}</h3>
                      <Badge variant={selectedTrade.trade_type === 'long' ? 'default' : 'secondary'}>
                        {selectedTrade.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Entry: {formatCurrency(selectedTrade.entry_price)} • P&L: {formatCurrency(selectedTrade.pnl)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Select Mentor */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Mentor</label>
              {mentors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You need to connect with a mentor first
                </p>
              ) : (
                <Select value={selectedMentor} onValueChange={setSelectedMentor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a mentor" />
                  </SelectTrigger>
                  <SelectContent>
                    {mentors.map((mentor) => (
                      <SelectItem key={mentor.id} value={mentor.id}>
                        {mentor.full_name || mentor.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Specific Questions */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Specific Questions (Optional)
              </label>
              <Textarea
                placeholder="What would you like feedback on? Any specific questions about this trade?"
                value={specificQuestions}
                onChange={(e) => setSpecificQuestions(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Help your mentor provide better feedback by asking specific questions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestDialog(false)
                setSelectedTrade(null)
                setSelectedMentor('')
                setSpecificQuestions('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRequestReview} disabled={submitting || !selectedMentor}>
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Trade Review Details</DialogTitle>
            <DialogDescription>
              Review request for {selectedReview?.trade.symbol}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg border ${
                selectedReview.status === 'completed' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                selectedReview.status === 'in_progress' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                selectedReview.status === 'cancelled' ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' :
                'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
              }`}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedReview.status)}
                  <span className="font-medium capitalize">{selectedReview.status}</span>
                </div>
              </div>

              {/* Trade Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedReview.trade.chart_image_url && (
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={selectedReview.trade.chart_image_url}
                        alt={selectedReview.trade.symbol}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Symbol</p>
                      <p className="text-lg font-semibold">{selectedReview.trade.symbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge variant={selectedReview.trade.trade_type === 'long' ? 'default' : 'secondary'}>
                        {selectedReview.trade.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entry</p>
                      <p className="text-lg">{formatCurrency(selectedReview.trade.entry_price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">P&L</p>
                      <p className={`text-lg font-bold ${selectedReview.trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedReview.trade.pnl)}
                      </p>
                    </div>
                  </div>

                  {selectedReview.trade.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Trade Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReview.trade.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Your Questions */}
              {selectedReview.specific_questions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Your Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedReview.specific_questions}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Mentor Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Mentor Feedback
                  </CardTitle>
                  <CardDescription>
                    From {selectedReview.mentor.full_name || 'Unknown'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedReview.mentor_feedback ? (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedReview.mentor_feedback}
                    </p>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        {selectedReview.status === 'pending'
                          ? 'Waiting for mentor to review'
                          : selectedReview.status === 'in_progress'
                          ? 'Mentor is reviewing your trade'
                          : 'No feedback provided'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested:</span>
                    <span>{formatDate(selectedReview.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{formatDate(selectedReview.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
