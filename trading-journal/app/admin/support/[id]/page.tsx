'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  MessageSquare,
  Shield,
  Clock,
  User,
  Calendar,
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_admin: boolean
  is_internal: boolean
  created_at: string
  user_profiles?: {
    full_name: string | null
    email: string
  }
}

interface TicketCategory {
  id: string
  name: string
  color: string
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id as string
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [ticket, setTicket] = React.useState<SupportTicket | null>(null)
  const [messages, setMessages] = React.useState<TicketMessage[]>([])
  const [categories, setCategories] = React.useState<TicketCategory[]>([])
  const [replyMessage, setReplyMessage] = React.useState('')
  const [isInternal, setIsInternal] = React.useState(false)
  const [sending, setSending] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

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

  // Load ticket data
  React.useEffect(() => {
    if (!authorized || !ticketId) return

    const loadData = async () => {
      try {
        const [ticketRes, messagesRes, categoriesRes] = await Promise.all([
          supabase
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single(),
          supabase
            .from('ticket_messages')
            .select(`
              *,
              user_profiles:user_id (
                full_name,
                email
              )
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true }),
          supabase
            .from('ticket_categories')
            .select('id, name, color')
            .eq('is_active', true),
        ])

        if (ticketRes.error) throw ticketRes.error
        if (messagesRes.error) throw messagesRes.error
        if (categoriesRes.error) throw categoriesRes.error

        setTicket(ticketRes.data)
        setMessages(messagesRes.data || [])
        setCategories(categoriesRes.data || [])
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load ticket details',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authorized, ticketId, supabase, toast])

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !ticket) return

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newMessage, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          message: replyMessage.trim(),
          is_admin: true,
          is_internal: isInternal,
        })
        .select(`
          *,
          user_profiles:user_id (
            full_name,
            email
          )
        `)
        .single()

      if (messageError) throw messageError

      // Update ticket status if it was waiting
      if (ticket.status === 'waiting') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticket.id)

        setTicket({ ...ticket, status: 'in_progress' })
      }

      setMessages([...messages, newMessage])
      setReplyMessage('')
      setIsInternal(false)

      toast({
        title: 'Success',
        description: 'Reply sent successfully',
      })
    } catch (error) {
      console.error('Failed to send reply:', error)
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!ticket) return

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
        .eq('id', ticket.id)

      if (error) throw error

      setTicket({ ...ticket, ...updateData })

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

  const handleUpdatePriority = async (newPriority: string) => {
    if (!ticket) return

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority: newPriority })
        .eq('id', ticket.id)

      if (error) throw error

      setTicket({ ...ticket, priority: newPriority as any })

      toast({
        title: 'Success',
        description: 'Priority updated',
      })
    } catch (error) {
      console.error('Failed to update priority:', error)
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'default', label: 'In Progress' },
      waiting: { variant: 'secondary', label: 'Waiting' },
      resolved: { variant: 'default', label: 'Resolved' },
      closed: { variant: 'outline', label: 'Closed' },
    }

    const config = variants[status] || variants.open

    return <Badge variant={config.variant}>{config.label}</Badge>
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
        <div className="text-muted-foreground">Loading ticket...</div>
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

  if (!ticket) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold">Ticket Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The ticket you're looking for doesn't exist
          </p>
          <Button className="mt-4" onClick={() => router.push('/admin/support')}>
            Back to Support Center
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/support')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Ticket #{ticket.ticket_number}
            </h1>
            <p className="text-muted-foreground mt-1">{ticket.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Message */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {ticket.user_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {ticket.user_name || 'Unknown User'}
                  </CardTitle>
                  <CardDescription>{ticket.user_email}</CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Messages */}
          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.user_profiles?.full_name?.charAt(0).toUpperCase() ||
                            message.user_profiles?.email?.charAt(0).toUpperCase() ||
                            'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {message.user_profiles?.full_name || 'User'}
                          </span>
                          {message.is_admin && (
                            <Badge variant="default" className="text-xs">
                              Admin
                            </Badge>
                          )}
                          {message.is_internal && (
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`ml-11 p-3 rounded-lg ${
                        message.is_admin
                          ? 'bg-blue-50 dark:bg-blue-950'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>
          )}

          {/* Reply Box */}
          {ticket.status !== 'closed' && (
            <Card>
              <CardHeader>
                <CardTitle>Send Reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={6}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="internal" className="text-sm">
                      Internal note (not visible to user)
                    </label>
                  </div>
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={ticket.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={ticket.priority} onValueChange={handleUpdatePriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
              {ticket.last_response_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Response</span>
                  <span>{new Date(ticket.last_response_at).toLocaleString()}</span>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{new Date(ticket.resolved_at).toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Messages</span>
                <span>{messages.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
