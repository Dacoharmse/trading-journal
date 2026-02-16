'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  last_response_at: string | null
}

interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_admin: boolean
  created_at: string
  user_profiles?: {
    full_name: string | null
    email: string
  }
}

export default function UserTicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id as string
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [ticket, setTicket] = React.useState<SupportTicket | null>(null)
  const [messages, setMessages] = React.useState<TicketMessage[]>([])
  const [replyMessage, setReplyMessage] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Load ticket data
  React.useEffect(() => {
    if (!ticketId) return

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        if (!user) {
          router.push('/auth/login')
          return
        }

        const [ticketRes, messagesRes] = await Promise.all([
          supabase
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .eq('user_id', user.id)
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
            .eq('is_internal', false)
            .order('created_at', { ascending: true }),
        ])

        if (ticketRes.error) {
          if (ticketRes.error.code === 'PGRST116') {
            toast({
              title: 'Error',
              description: 'Ticket not found or access denied',
              variant: 'destructive',
            })
            router.push('/support')
            return
          }
          throw ticketRes.error
        }

        if (messagesRes.error) throw messagesRes.error

        setTicket(ticketRes.data)
        setMessages(messagesRes.data || [])
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
  }, [ticketId, supabase, router, toast])

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !ticket) return

    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) throw new Error('Not authenticated')

      const { data: newMessage, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          message: replyMessage.trim(),
          is_admin: false,
          is_internal: false,
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

      // Update ticket status to waiting if it was in progress
      if (ticket.status === 'in_progress') {
        await supabase
          .from('support_tickets')
          .update({ status: 'waiting' })
          .eq('id', ticket.id)

        setTicket({ ...ticket, status: 'waiting' })
      }

      setMessages([...messages, newMessage])
      setReplyMessage('')

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'default', label: 'In Progress' },
      waiting: { variant: 'secondary', label: 'Waiting for Response' },
      resolved: { variant: 'default', label: 'Resolved' },
      closed: { variant: 'outline', label: 'Closed' },
    }

    const config = variants[status] || variants.open

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading ticket...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The ticket you're looking for doesn't exist or you don't have access to it
          </p>
          <Button onClick={() => router.push('/support')}>
            Back to Support
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
            onClick={() => router.push('/support')}
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
        {getStatusBadge(ticket.status)}
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
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">You</CardTitle>
                  <CardDescription>
                    {new Date(ticket.created_at).toLocaleString()}
                  </CardDescription>
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
                          {message.is_admin ? 'A' : 'Y'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {message.is_admin
                              ? message.user_profiles?.full_name || 'Support Team'
                              : 'You'}
                          </span>
                          {message.is_admin && (
                            <Badge variant="default" className="text-xs">
                              Support
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
                <CardTitle>Add Reply</CardTitle>
                <CardDescription>
                  {ticket.status === 'resolved'
                    ? 'This ticket has been marked as resolved. Reply if you need further assistance.'
                    : 'Send a message to our support team'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={6}
                />
                <div className="flex justify-end">
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

          {ticket.status === 'closed' && (
            <Card className="border-muted">
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold mb-2">Ticket Closed</h3>
                <p className="text-muted-foreground mb-4">
                  This ticket has been closed. If you need further assistance, please create a new ticket.
                </p>
                <Button onClick={() => router.push('/support')}>
                  Create New Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(ticket.status)}
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              {ticket.last_response_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span>{new Date(ticket.last_response_at).toLocaleDateString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Messages</span>
                <span>{messages.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Our support team typically responds within 24 hours. You'll receive an email notification when there's a new response.
              </p>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">Response Times:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Urgent: 2-4 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    High: 4-8 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Medium: 8-24 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Low: 24-48 hours
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
