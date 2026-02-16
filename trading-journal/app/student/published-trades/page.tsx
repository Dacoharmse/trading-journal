'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  ArrowLeft,
  Search,
  Eye,
  BarChart3,
  Target,
  Calendar,
  DollarSign,
  Filter,
  Users,
  BookOpen,
  Tag,
  ThumbsUp,
  MessageSquare,
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface PublishedTrade {
  id: string
  trade_id: string
  mentor_id: string
  title: string
  description: string | null
  lessons_learned: string | null
  tags: string[]
  visibility: string
  student_ids: string[]
  view_count: number
  published_at: string
  trade: Trade
  mentor: {
    id: string
    full_name: string | null
    email: string
    bio: string | null
  }
}

export default function StudentTradesPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [publishedTrades, setPublishedTrades] = React.useState<PublishedTrade[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [mentorFilter, setMentorFilter] = React.useState<string>('all')
  const [tradeTypeFilter, setTradeTypeFilter] = React.useState<string>('all')
  const [outcomeFilter, setOutcomeFilter] = React.useState<string>('all')

  const [showTradeDetails, setShowTradeDetails] = React.useState(false)
  const [selectedTrade, setSelectedTrade] = React.useState<PublishedTrade | null>(null)

  React.useEffect(() => {
    loadPublishedTrades()
  }, [])

  const loadPublishedTrades = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) {
        router.push('/login')
        return
      }

      // Get connected mentor IDs
      const { data: connections, error: connectionsError } = await supabase
        .from('mentorship_connections')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (connectionsError) throw connectionsError

      const mentorIds = connections?.map((c: any) => c.mentor_id) || []

      // Load published trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('published_trades')
        .select(`
          id,
          trade_id,
          mentor_id,
          title,
          description,
          lessons_learned,
          tags,
          visibility,
          student_ids,
          view_count,
          published_at,
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
            email,
            bio
          )
        `)
        .order('published_at', { ascending: false })

      if (tradesError) throw tradesError

      // Filter trades based on visibility rules
      const accessibleTrades = tradesData?.filter((trade: any) => {
        if (trade.visibility === 'public') return true
        if (trade.visibility === 'all_students' && mentorIds.includes(trade.mentor_id)) return true
        if (trade.visibility === 'specific_students' && trade.student_ids?.includes(user.id)) return true
        return false
      }) || []

      setPublishedTrades(accessibleTrades)
    } catch (error) {
      console.error('Error loading published trades:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewTrade = async (publishedTrade: PublishedTrade) => {
    setSelectedTrade(publishedTrade)
    setShowTradeDetails(true)

    // Increment view count
    try {
      await supabase
        .from('published_trades')
        .update({ view_count: publishedTrade.view_count + 1 })
        .eq('id', publishedTrade.id)

      // Update local state
      setPublishedTrades((prev) =>
        prev.map((t) =>
          t.id === publishedTrade.id ? { ...t, view_count: t.view_count + 1 } : t
        )
      )
    } catch (error) {
      console.error('Error updating view count:', error)
    }
  }

  const filteredTrades = React.useMemo(() => {
    return publishedTrades.filter((published) => {
      const matchesSearch =
        published.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        published.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        published.trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        published.mentor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        published.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesMentor = mentorFilter === 'all' || published.mentor_id === mentorFilter
      const matchesType = tradeTypeFilter === 'all' || published.trade.trade_type === tradeTypeFilter
      const matchesOutcome =
        outcomeFilter === 'all' ||
        (outcomeFilter === 'win' && published.trade.pnl > 0) ||
        (outcomeFilter === 'loss' && published.trade.pnl < 0) ||
        (outcomeFilter === 'breakeven' && published.trade.pnl === 0)

      return matchesSearch && matchesMentor && matchesType && matchesOutcome
    })
  }, [publishedTrades, searchTerm, mentorFilter, tradeTypeFilter, outcomeFilter])

  const mentors = React.useMemo(() => {
    const mentorMap = new Map()
    publishedTrades.forEach((pt) => {
      if (!mentorMap.has(pt.mentor_id)) {
        mentorMap.set(pt.mentor_id, pt.mentor)
      }
    })
    return Array.from(mentorMap.values())
  }, [publishedTrades])

  const stats = React.useMemo(() => {
    const wins = publishedTrades.filter((t) => t.trade.pnl > 0).length
    const losses = publishedTrades.filter((t) => t.trade.pnl < 0).length
    const totalPnl = publishedTrades.reduce((sum, t) => sum + t.trade.pnl, 0)
    const winRate = publishedTrades.length > 0 ? (wins / publishedTrades.length) * 100 : 0

    return { total: publishedTrades.length, wins, losses, totalPnl, winRate }
  }, [publishedTrades])

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading published trades...</p>
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
          <h1 className="text-4xl font-bold mb-2">Educational Trades</h1>
          <p className="text-muted-foreground">Learn from real trades published by your mentors</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Published for learning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.wins}W / {stats.losses}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalPnl)}
            </div>
            <p className="text-xs text-muted-foreground">Combined results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentors.length}</div>
            <p className="text-xs text-muted-foreground">Sharing content</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trades, symbols, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={mentorFilter} onValueChange={setMentorFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
        <Select value={tradeTypeFilter} onValueChange={setTradeTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Trade type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="win">Winners</SelectItem>
            <SelectItem value="loss">Losers</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trades Grid */}
      {filteredTrades.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {publishedTrades.length === 0 ? 'No published trades yet' : 'No trades match your filters'}
            </h3>
            <p className="text-muted-foreground">
              {publishedTrades.length === 0
                ? 'Your mentors can publish their trades to help you learn'
                : 'Try adjusting your search or filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrades.map((published) => (
            <Card
              key={published.id}
              className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => handleViewTrade(published)}
            >
              {/* Trade Preview */}
              <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                {published.trade.chart_image_url ? (
                  <img
                    src={published.trade.chart_image_url}
                    alt={published.trade.symbol}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-4xl font-bold">{published.trade.symbol}</p>
                      <Badge
                        variant={published.trade.trade_type === 'long' ? 'default' : 'secondary'}
                        className="mt-2"
                      >
                        {published.trade.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}
                {/* P&L Badge */}
                <div className="absolute top-3 right-3">
                  <Badge
                    className={
                      published.trade.pnl > 0
                        ? 'bg-green-500 text-white hover:bg-green-600 text-base px-3 py-1'
                        : published.trade.pnl < 0
                        ? 'bg-red-500 text-white hover:bg-red-600 text-base px-3 py-1'
                        : 'bg-gray-500 text-white hover:bg-gray-600 text-base px-3 py-1'
                    }
                  >
                    {published.trade.pnl > 0 ? '+' : ''}
                    {formatCurrency(published.trade.pnl)}
                  </Badge>
                </div>
              </div>

              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1">{published.title}</CardTitle>
                  <Badge variant={published.trade.trade_type === 'long' ? 'default' : 'secondary'}>
                    {published.trade.trade_type.toUpperCase()}
                  </Badge>
                </div>
                {published.description && (
                  <CardDescription className="line-clamp-2">{published.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent>
                {/* Tags */}
                {published.tags && published.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {published.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {published.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{published.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Mentor Info */}
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(published.mentor.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {published.mentor.full_name || 'Unknown'}
                  </span>
                </div>

                <Separator className="my-3" />

                {/* Footer Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{published.view_count} views</span>
                  </div>
                  <span>{formatDate(published.published_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trade Details Dialog */}
      <Dialog open={showTradeDetails} onOpenChange={setShowTradeDetails}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              {selectedTrade?.title}
            </DialogTitle>
            <DialogDescription>
              Published by {selectedTrade?.mentor.full_name || 'Unknown'} on{' '}
              {selectedTrade && formatDate(selectedTrade.published_at)}
            </DialogDescription>
          </DialogHeader>

          {selectedTrade && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Trade Details</TabsTrigger>
                <TabsTrigger value="lessons">Lessons Learned</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Chart Image */}
                {selectedTrade.trade.chart_image_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={selectedTrade.trade.chart_image_url}
                      alt={selectedTrade.trade.symbol}
                      className="w-full h-auto"
                    />
                  </div>
                )}

                {/* Description */}
                {selectedTrade.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{selectedTrade.description}</p>
                  </div>
                )}

                {/* Tags */}
                {selectedTrade.tags && selectedTrade.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrade.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">P&L</p>
                    <p
                      className={`text-2xl font-bold ${
                        selectedTrade.trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(selectedTrade.trade.pnl)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Symbol</p>
                    <p className="text-2xl font-bold">{selectedTrade.trade.symbol}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Type</p>
                    <Badge variant={selectedTrade.trade.trade_type === 'long' ? 'default' : 'secondary'}>
                      {selectedTrade.trade.trade_type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Views</p>
                    <p className="text-2xl font-bold">{selectedTrade.view_count}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Entry Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Entry Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Entry Date</p>
                        <p className="text-lg">{formatDate(selectedTrade.trade.entry_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Entry Price</p>
                        <p className="text-lg">{formatCurrency(selectedTrade.trade.entry_price)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p className="text-lg">{selectedTrade.trade.quantity}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Exit Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exit Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Exit Date</p>
                        <p className="text-lg">
                          {selectedTrade.trade.exit_date
                            ? formatDate(selectedTrade.trade.exit_date)
                            : 'Still Open'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Exit Price</p>
                        <p className="text-lg">
                          {selectedTrade.trade.exit_price
                            ? formatCurrency(selectedTrade.trade.exit_price)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Final P&L</p>
                        <p
                          className={`text-lg font-bold ${
                            selectedTrade.trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(selectedTrade.trade.pnl)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Strategy */}
                {selectedTrade.trade.strategy && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Strategy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{selectedTrade.trade.strategy}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Trade Notes */}
                {selectedTrade.trade.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Trade Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedTrade.trade.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="lessons" className="space-y-6 mt-6">
                {selectedTrade.lessons_learned ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Key Lessons from this Trade
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedTrade.lessons_learned}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No lessons learned documented for this trade</p>
                    </CardContent>
                  </Card>
                )}

                {/* Mentor Bio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      About the Mentor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {getInitials(selectedTrade.mentor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedTrade.mentor.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {selectedTrade.mentor.email}
                        </p>
                        {selectedTrade.mentor.bio && (
                          <p className="text-sm text-muted-foreground">{selectedTrade.mentor.bio}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
