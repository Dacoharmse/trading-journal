'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  Eye,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  last_response_at: string | null
}

interface TicketCategory {
  id: string
  name: string
  description: string | null
  color: string
}

export default function SupportPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [categories, setCategories] = React.useState<TicketCategory[]>([])
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  const [newTicket, setNewTicket] = React.useState({
    subject: '',
    description: '',
    category_id: '',
    priority: 'medium' as const,
  })

  // Load tickets
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const [ticketsRes, categoriesRes] = await Promise.all([
          supabase
            .from('support_tickets')
            .select('id, ticket_number, subject, status, priority, created_at, last_response_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('ticket_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order'),
        ])

        if (ticketsRes.error) throw ticketsRes.error
        if (categoriesRes.error) throw categoriesRes.error

        setTickets(ticketsRes.data || [])
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
  }, [supabase, router, toast])

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      const { data: newTicketData, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newTicket.subject.trim(),
          description: newTicket.description.trim(),
          category_id: newTicket.category_id || null,
          priority: newTicket.priority,
          user_email: profile?.email || user.email || '',
          user_name: profile?.full_name || null,
        })
        .select()
        .single()

      if (error) throw error

      setTickets([newTicketData, ...tickets])
      setNewTicket({
        subject: '',
        description: '',
        category_id: '',
        priority: 'medium',
      })
      setShowCreateDialog(false)

      toast({
        title: 'Success',
        description: 'Support ticket created successfully',
      })
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast({
        title: 'Error',
        description: 'Failed to create support ticket',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      open: { variant: 'default', icon: Clock, label: 'Open' },
      in_progress: { variant: 'default', icon: MessageSquare, label: 'In Progress' },
      waiting: { variant: 'secondary', icon: Clock, label: 'Waiting' },
      resolved: { variant: 'default', icon: CheckCircle, label: 'Resolved' },
      closed: { variant: 'outline', icon: CheckCircle, label: 'Closed' },
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading support tickets...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground mt-1">
            Get help with your trading journal
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Support Tickets</CardTitle>
          <CardDescription>View and manage your support requests</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No support tickets yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first support ticket to get help
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/support/${ticket.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h3 className="font-medium">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and we'll get back to you as soon as possible
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={newTicket.subject}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, subject: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newTicket.category_id}
                onValueChange={(value) =>
                  setNewTicket({ ...newTicket, category_id: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTicket.priority}
                onValueChange={(value: any) =>
                  setNewTicket({ ...newTicket, priority: value })
                }
              >
                <SelectTrigger id="priority">
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

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide as much detail as possible about your issue..."
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, description: e.target.value })
                }
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={creating}>
              <Send className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
