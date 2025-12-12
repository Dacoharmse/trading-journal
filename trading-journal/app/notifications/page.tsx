'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import type { UserProfile } from '@/types/mentorship'
import {
  Bell,
  CheckCircle,
  Eye,
  MessageSquare,
  TrendingUp,
  BookOpen,
  UserPlus,
  AlertCircle,
  Clock,
  Check,
  Trash2,
  Filter,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Notification {
  id: string
  user_id: string
  type: 'trade_published' | 'playbook_shared' | 'mentor_request' | 'trade_review' | 'system' | 'mentor_accepted'
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  metadata?: any
}

export default function NotificationsPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const [activeTab, setActiveTab] = React.useState<'all' | 'mentions' | 'requests'>('all')

  React.useEffect(() => {
    loadNotifications()
  }, [supabase])

  const loadNotifications = async () => {
    try {
      const profile = await getCurrentUserProfile()
      setUserProfile(profile)

      if (!profile) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!userProfile) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userProfile.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      })
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))

      toast({
        title: 'Success',
        description: 'Notification deleted',
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      })
    }
  }

  const clearAllNotifications = async () => {
    if (!userProfile) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userProfile.id)

      if (error) throw error

      setNotifications([])

      toast({
        title: 'Success',
        description: 'All notifications cleared',
      })
    } catch (error) {
      console.error('Failed to clear notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      })
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'trade_published':
        return <TrendingUp className="h-5 w-5 text-blue-500" />
      case 'playbook_shared':
        return <BookOpen className="h-5 w-5 text-green-500" />
      case 'mentor_request':
      case 'mentor_accepted':
        return <UserPlus className="h-5 w-5 text-purple-500" />
      case 'trade_review':
        return <MessageSquare className="h-5 w-5 text-orange-500" />
      case 'system':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications

    // Filter by read/unread
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.is_read)
    }

    // Filter by tab
    if (activeTab === 'mentions') {
      filtered = filtered.filter((n) => n.type === 'trade_review' || n.type === 'playbook_shared')
    } else if (activeTab === 'requests') {
      filtered = filtered.filter((n) => n.type === 'mentor_request')
    }

    return filtered
  }, [notifications, filter, activeTab])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading notifications...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Stay updated with your trading journey</p>
        </div>
        <Bell className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
          >
            <Filter className="h-4 w-4 mr-2" />
            {filter === 'all' ? 'Show Unread' : 'Show All'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllNotifications}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for different notification categories */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mentions">
            Mentions & Reviews
            {notifications.filter((n) => n.type === 'trade_review' || n.type === 'playbook_shared').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter((n) => n.type === 'trade_review' || n.type === 'playbook_shared').length}
              </Badge>
            )}
          </TabsTrigger>
          {userProfile?.is_mentor && (
            <TabsTrigger value="requests">
              Requests
              {notifications.filter((n) => n.type === 'mentor_request').length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notifications.filter((n) => n.type === 'mentor_request').length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Bell className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No Notifications</p>
                  <p className="text-sm mt-2">
                    {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-colors ${
                    !notification.is_read ? 'bg-accent/50 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="mt-1">{getNotificationIcon(notification.type)}</div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold">{notification.title}</h4>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="ml-2">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(notification.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {notification.link && (
                          <Link href={notification.link}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        )}
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
