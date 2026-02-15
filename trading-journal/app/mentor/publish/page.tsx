'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  ArrowLeft,
  Search,
  Share2,
  Users,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  DollarSign,
  Calendar,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Target,
  Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
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
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'

interface Trade {
  id: string
  symbol: string
  entry_price: number
  exit_price: number | null
  quantity: number
  pnl: number
  trade_type: 'long' | 'short'
  entry_date: string
  exit_date: string | null
  status: 'open' | 'closed'
  notes: string | null
  setup_name: string | null
  chart_image_url: string | null
  timeframe: string | null
  rr_ratio: number | null
  win_rate: number | null
  tags: string[]
}

interface PublishedTrade {
  id: string
  trade_id: string
  title: string
  description: string | null
  lessons_learned: string | null
  tags: string[]
  visibility: 'students' | 'public' | 'specific_students'
  student_ids: string[]
  view_count: number
  created_at: string
  trade?: Trade
}

interface Student {
  id: string
  full_name: string | null
  email: string
}

export default function PublishTradePage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [publishedTrades, setPublishedTrades] = React.useState<PublishedTrade[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [filteredTrades, setFilteredTrades] = React.useState<Trade[]>([])

  const [showPublishDialog, setShowPublishDialog] = React.useState(false)
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const [publishTitle, setPublishTitle] = React.useState('')
  const [publishDescription, setPublishDescription] = React.useState('')
  const [lessonsLearned, setLessonsLearned] = React.useState('')
  const [publishTags, setPublishTags] = React.useState('')
  const [visibility, setVisibility] = React.useState<'students' | 'public' | 'specific_students'>('students')
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  // Load data
  React.useEffect(() => {
    const loadData = async () => {
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

        // Load mentor's trades
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })

        if (tradesError) throw tradesError

        setTrades(tradesData || [])
        setFilteredTrades(tradesData || [])

        // Load published trades
        const { data: publishedData, error: publishedError} = await supabase
          .from('published_trades')
          .select(`
            *,
            trade:trade_id (*)
          `)
          .eq('mentor_id', user.id)
          .order('created_at', { ascending: false })

        if (publishedError) throw publishedError

        setPublishedTrades(publishedData || [])

        // Load students
        const { data: studentsData, error: studentsError } = await supabase
          .from('mentorship_connections')
          .select(`
            student_id,
            student_profile:student_id (
              id,
              full_name,
              email
            )
          `)
          .eq('mentor_id', user.id)
          .eq('status', 'active')

        if (studentsError) throw studentsError

        const studentsList = studentsData?.map((conn: any) => ({
          id: conn.student_profile.id,
          full_name: conn.student_profile.full_name,
          email: conn.student_profile.email,
        })) || []

        setStudents(studentsList)
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load trades',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, router, toast])

  // Filter trades
  React.useEffect(() => {
    let filtered = [...trades]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter)
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.symbol.toLowerCase().includes(search) ||
          t.setup_name?.toLowerCase().includes(search) ||
          t.notes?.toLowerCase().includes(search)
      )
    }

    setFilteredTrades(filtered)
  }, [searchTerm, statusFilter, trades])

  const handlePublishTrade = async () => {
    if (!selectedTrade) return

    if (!publishTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title',
        variant: 'destructive',
      })
      return
    }

    if (visibility === 'specific_students' && selectedStudents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one student',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tagsArray = publishTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const { error } = await supabase
        .from('published_trades')
        .upsert({
          mentor_id: user.id,
          trade_id: selectedTrade.id,
          title: publishTitle.trim(),
          description: publishDescription.trim() || null,
          lessons_learned: lessonsLearned.trim() || null,
          tags: tagsArray,
          visibility,
          student_ids: visibility === 'specific_students' ? selectedStudents : [],
        }, {
          onConflict: 'mentor_id,trade_id'
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: `Trade "${publishTitle}" published successfully`,
      })

      // Reload published trades
      const { data: publishedData } = await supabase
        .from('published_trades')
        .select(`
          *,
          trade:trade_id (*)
        `)
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false })

      setPublishedTrades(publishedData || [])
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to publish trade:', error)
      toast({
        title: 'Error',
        description: 'Failed to publish trade',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnpublishTrade = async (publishedId: string) => {
    try {
      const { error } = await supabase
        .from('published_trades')
        .delete()
        .eq('id', publishedId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Trade unpublished successfully',
      })

      setPublishedTrades(publishedTrades.filter((pt) => pt.id !== publishedId))
    } catch (error) {
      console.error('Failed to unpublish trade:', error)
      toast({
        title: 'Error',
        description: 'Failed to unpublish trade',
        variant: 'destructive',
      })
    }
  }

  const handleOpenPublishDialog = (trade: Trade, existingPublish?: PublishedTrade) => {
    setSelectedTrade(trade)
    if (existingPublish) {
      setPublishTitle(existingPublish.title)
      setPublishDescription(existingPublish.description || '')
      setLessonsLearned(existingPublish.lessons_learned || '')
      setPublishTags(existingPublish.tags.join(', '))
      setVisibility(existingPublish.visibility)
      setSelectedStudents(existingPublish.student_ids)
    } else {
      setPublishTitle(`${trade.symbol} ${trade.trade_type.toUpperCase()} - ${new Date(trade.entry_date).toLocaleDateString()}`)
      setPublishDescription(trade.notes || '')
      setLessonsLearned('')
      setPublishTags(trade.tags?.join(', ') || '')
    }
    setShowPublishDialog(true)
  }

  const handleCloseDialog = () => {
    setShowPublishDialog(false)
    setSelectedTrade(null)
    setPublishTitle('')
    setPublishDescription('')
    setLessonsLearned('')
    setPublishTags('')
    setVisibility('students')
    setSelectedStudents([])
  }

  const handleToggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  const getPublishStatus = (trade: Trade) => {
    return publishedTrades.find((pt) => pt.trade_id === trade.id)
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading trades...</div>
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
          <h1 className="text-3xl font-bold tracking-tight">Publish Trades</h1>
          <p className="text-muted-foreground mt-1">
            Share educational trades with your students
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
            <p className="text-xs text-muted-foreground">Your trading history</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedTrades.length}</div>
            <p className="text-xs text-muted-foreground">Educational content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {publishedTrades.reduce((sum, pt) => sum + pt.view_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Student engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trades.length > 0
                ? ((trades.filter((t) => t.pnl > 0).length / trades.length) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Published */}
      {publishedTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currently Published</CardTitle>
            <CardDescription>Trades you've shared with students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publishedTrades.map((published) => {
                const trade = published.trade
                if (!trade) return null

                return (
                  <Card key={published.id} className="overflow-hidden">
                    {/* Trade Thumbnail */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                      {trade.chart_image_url ? (
                        <img
                          src={trade.chart_image_url}
                          alt={trade.symbol}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <BarChart3 className="h-16 w-16 mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-4xl font-bold">{trade.symbol}</p>
                            <Badge
                              variant={trade.trade_type === 'long' ? 'default' : 'secondary'}
                              className="mt-2"
                            >
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={trade.pnl >= 0 ? 'default' : 'destructive'}
                          className="font-bold"
                        >
                          {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg">{published.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {published.description || 'No description'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{formatDate(trade.entry_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{published.view_count} views</span>
                        </div>
                      </div>

                      {published.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {published.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Badge variant={
                        published.visibility === 'public' ? 'default' :
                        published.visibility === 'students' ? 'secondary' : 'outline'
                      }>
                        {published.visibility === 'public' ? 'Public' :
                         published.visibility === 'students' ? `All Students (${students.length})` :
                         `${published.student_ids.length} Students`}
                      </Badge>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenPublishDialog(trade, published)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnpublishTrade(published.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Your Trades</CardTitle>
          <CardDescription>Select a trade to publish as educational content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredTrades.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No trades found' : 'No trades yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Record trades in your journal to publish them'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrades.map((trade) => {
                const publishStatus = getPublishStatus(trade)
                return (
                  <Card key={trade.id} className="overflow-hidden hover:border-primary transition-colors">
                    {/* Trade Thumbnail */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                      {trade.chart_image_url ? (
                        <img
                          src={trade.chart_image_url}
                          alt={trade.symbol}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <BarChart3 className="h-16 w-16 mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-4xl font-bold">{trade.symbol}</p>
                            <Badge
                              variant={trade.trade_type === 'long' ? 'default' : 'secondary'}
                              className="mt-2"
                            >
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={trade.pnl >= 0 ? 'default' : 'destructive'}
                          className="font-bold"
                        >
                          {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                        </Badge>
                      </div>
                      {trade.status === 'open' && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="bg-background/80 backdrop-blur">
                            OPEN
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{trade.symbol}</CardTitle>
                          <CardDescription>
                            {trade.setup_name || 'No setup name'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Entry</p>
                          <p className="font-medium">{formatCurrency(trade.entry_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Exit</p>
                          <p className="font-medium">
                            {trade.exit_price ? formatCurrency(trade.exit_price) : '--'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(trade.entry_date)}</span>
                      </div>

                      {trade.rr_ratio && (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>R:R {trade.rr_ratio.toFixed(2)}</span>
                        </div>
                      )}

                      {publishStatus && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 dark:text-green-400">
                            Published • {publishStatus.view_count} views
                          </span>
                        </div>
                      )}

                      <Separator />

                      <Button
                        variant={publishStatus ? 'secondary' : 'default'}
                        size="sm"
                        className="w-full"
                        onClick={() => handleOpenPublishDialog(trade, publishStatus)}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        {publishStatus ? 'Update' : 'Publish'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish Trade</DialogTitle>
            <DialogDescription>
              Share {selectedTrade?.symbol} as educational content for your students
            </DialogDescription>
          </DialogHeader>

          {selectedTrade && (
            <div className="space-y-4 mt-4">
              {/* Trade Preview */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedTrade.symbol}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={selectedTrade.trade_type === 'long' ? 'default' : 'secondary'}>
                          {selectedTrade.trade_type.toUpperCase()}
                        </Badge>
                        <Badge variant={selectedTrade.pnl >= 0 ? 'default' : 'destructive'}>
                          {selectedTrade.pnl >= 0 ? '+' : ''}{formatCurrency(selectedTrade.pnl)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  placeholder="E.g., Perfect Breakout Trade on AAPL"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe the trade setup, market conditions, and key observations..."
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Lessons Learned</label>
                <Textarea
                  placeholder="What did you learn from this trade? What would you do differently?"
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                <Input
                  placeholder="breakout, momentum, reversal"
                  value={publishTags}
                  onChange={(e) => setPublishTags(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Visibility</label>
                <Select value={visibility} onValueChange={(val: any) => setVisibility(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">
                      All My Students ({students.length})
                    </SelectItem>
                    <SelectItem value="specific_students">
                      Specific Students
                    </SelectItem>
                    <SelectItem value="public">
                      Public (Anyone can view)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {visibility === 'specific_students' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Students ({selectedStudents.length} selected)
                  </label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleToggleStudent(student.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{student.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handlePublishTrade} disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish Trade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
