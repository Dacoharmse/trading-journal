'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  UserPlus,
  UserMinus,
  Shield,
  Search,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  is_mentor: boolean
  mentor_approved: boolean
  mentor_specialties: string[] | null
  mentor_bio: string | null
  created_at: string
}

export default function ManageMentorsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [users, setUsers] = React.useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = React.useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null)
  const [mentorSpecialties, setMentorSpecialties] = React.useState('')
  const [mentorBio, setMentorBio] = React.useState('')

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

  // Load users via API route (bypasses RLS)
  React.useEffect(() => {
    if (!authorized) return

    const loadUsers = async () => {
      try {
        const res = await fetch('/api/admin/users')
        if (!res.ok) throw new Error('Failed to load users')
        const data = await res.json()
        setUsers(data.users || [])
        setFilteredUsers(data.users || [])
      } catch (error) {
        console.error('Failed to load users:', error)
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [authorized, toast])

  // Search filter
  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
      return
    }

    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  const handleMakeMentor = async (user: UserProfile) => {
    setSelectedUser(user)
    setMentorBio(user.mentor_bio || '')
    setMentorSpecialties(user.mentor_specialties?.join(', ') || '')
    setShowCreateDialog(true)
  }

  const handleConfirmMakeMentor = async () => {
    if (!selectedUser) return

    try {
      const specialtiesArray = mentorSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: {
            is_mentor: true,
            mentor_approved: true,
            mentor_available: true,
            mentor_specialties: specialtiesArray,
            mentor_bio: mentorBio || null,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to create mentor')

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                is_mentor: true,
                mentor_approved: true,
                mentor_specialties: specialtiesArray,
                mentor_bio: mentorBio || null,
              }
            : u
        )
      )

      toast({
        title: 'Success',
        description: `${selectedUser.full_name || selectedUser.email} is now a mentor`,
      })

      setShowCreateDialog(false)
      setSelectedUser(null)
      setMentorBio('')
      setMentorSpecialties('')
    } catch (error) {
      console.error('Failed to create mentor:', error)
      toast({
        title: 'Error',
        description: 'Failed to create mentor',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveMentor = async (user: UserProfile) => {
    if (!confirm(`Remove mentor status from ${user.full_name || user.email}?`)) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            is_mentor: false,
            mentor_approved: false,
            mentor_available: false,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to remove mentor')

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === user.id
            ? {
                ...u,
                is_mentor: false,
                mentor_approved: false,
              }
            : u
        )
      )

      toast({
        title: 'Success',
        description: 'Mentor status removed',
      })
    } catch (error) {
      console.error('Failed to remove mentor:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove mentor status',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
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

  const mentors = filteredUsers.filter((u) => u.is_mentor && u.mentor_approved)
  const nonMentors = filteredUsers.filter((u) => !u.is_mentor || !u.mentor_approved)

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Mentors</h1>
          <p className="text-muted-foreground mt-1">
            Create mentors and manage mentor permissions
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by email or name..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Promote</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonMentors.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Current Mentors */}
      <Card>
        <CardHeader>
          <CardTitle>Current Mentors</CardTitle>
          <CardDescription>Users with mentor permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {mentors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No mentors yet. Promote users below.
            </div>
          ) : (
            <div className="space-y-4">
              {mentors.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name || 'No name set'}</p>
                      <Badge variant="default">Mentor</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.mentor_specialties && user.mentor_specialties.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {user.mentor_specialties.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMentor(user)}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Mentor
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Users */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Promote users to mentors</CardDescription>
        </CardHeader>
        <CardContent>
          {nonMentors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              All users are already mentors
            </div>
          ) : (
            <div className="space-y-4">
              {nonMentors.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name || 'No name set'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button onClick={() => handleMakeMentor(user)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Make Mentor
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Mentor Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Mentor</DialogTitle>
            <DialogDescription>
              Set up mentor profile for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties (comma-separated)</Label>
              <Input
                id="specialties"
                placeholder="E.g., Scalping, Day Trading, Risk Management"
                value={mentorSpecialties}
                onChange={(e) => setMentorSpecialties(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Mentor Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Brief bio about trading experience and mentoring approach..."
                value={mentorBio}
                onChange={(e) => setMentorBio(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMakeMentor}>
              <UserCheck className="h-4 w-4 mr-2" />
              Create Mentor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
