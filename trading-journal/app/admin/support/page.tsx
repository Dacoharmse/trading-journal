'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  User,
  Calendar,
  ArrowUpDown,
  Eye,
  CheckCheck,
  X,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface SupportTicket {
  id: string
  ticket_number: string
  user_id: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  user_email: string
  user_name: string | null
  category_id: string | null
  created_at: string
  updated_at: string
  last_response_at: string | null
  resolved_at: string | null
}

interface TicketCategory {
  id: string
  name: string
  color: string
}

export default function SupportCenterPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [filteredTickets, setFilteredTickets] = React.useState<SupportTicket[]>([])
  const [categories, setCategories] = React.useState<TicketCategory[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')

  // Check authorization
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        await requireAdmin()
        setAuthorized(true)
      } catch (error) {
        console.error('Authorization failed:', error)
        setAuthorized(false)
        setLoading(false)
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  // Load tickets and categories
  React.useEffect(() => {
    if (!authorized) return

    const loadData = async () => {
      try {
        const [ticketsRes, categoriesRes] = await Promise.all([
          supabase
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('ticket_categories')
            .select('id, name, color')
            .eq('is_active', true),
        ])

        if (ticketsRes.error) throw ticketsRes.error
        if (categoriesRes.error) throw categoriesRes.error

        setTickets(ticketsRes.data || [])
        setFilteredTickets(ticketsRes.data || [])
        setCategories(categoriesRes.data || [])
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load support tickets',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authorized, supabase, toast])

  // Filter tickets
  React.useEffect(() => {
    let filtered = tickets

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter)
    }

    setFilteredTickets(filtered)
  }, [tickets, searchTerm, statusFilter, priorityFilter])

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }

      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) updateData.resolved_by = user.id
      } else if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) updateData.closed_by = user.id
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)

      if (error) throw error

      setTickets(
        tickets.map((t) =>
          t.id === ticketId ? { ...t, ...updateData } : t
        )
      )

      toast({
        title: 'Success',
        description: 'Ticket status updated',
      })
    } catch (error) {
      console.error('Failed to update status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      open: { variant: 'default', icon: Clock, label: 'Open' },
      in_progress: { variant: 'default', icon: Loader2, label: 'In Progress' },
      waiting: { variant: 'secondary', icon: Clock, label: 'Waiting' },
      resolved: { variant: 'default', icon: CheckCircle, label: 'Resolved' },
      closed: { variant: 'outline', icon: CheckCheck, label: 'Closed' },
    }

    const config = variants[status] || variants.open
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    }

    return (
      <Badge className={colors[priority] || colors.medium}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading support center...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need administrator privileges to access this page
          </p>
        </div>
      </div>
    )
  }

  const stats = {
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolvedToday: tickets.filter((t) => {
      if (!t.resolved_at) return false
      const today = new Date().toDateString()
      return new Date(t.resolved_at).toDateString() === today
    }).length,
    total: tickets.length,
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="text-muted-foreground mt-1">
            Manage user support tickets and inquiries
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedToday}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
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
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Search and manage support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket #, subject, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{ticket.subject}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {ticket.user_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ticket.user_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/support/${ticket.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ticket.status !== 'closed' && (
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => handleUpdateStatus(ticket.id, value)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="waiting">Waiting</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
