'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Crown,
  MoreVertical,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { requireAdmin, logAdminAction, getRoleBadgeColor, getRoleDisplayName } from '@/lib/auth-utils'
import type { UserProfile, UserRole } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [users, setUsers] = React.useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = React.useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<UserRole | 'all'>('all')
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null)
  const [showRoleDialog, setShowRoleDialog] = React.useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = React.useState(false)
  const [showConfirmEmailDialog, setShowConfirmEmailDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [newRole, setNewRole] = React.useState<UserRole>('trader')
  const [confirming, setConfirming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

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

  // Load users function
  const loadUsers = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
      setFilteredUsers(data || [])
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
  }, [supabase, toast])

  // Load users on mount
  React.useEffect(() => {
    if (!authorized) return
    loadUsers()
  }, [authorized, loadUsers])

  // Filter users
  React.useEffect(() => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter])

  // Change user role
  const handleChangeRole = async () => {
    if (!selectedUser) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id)

      if (error) throw error

      // Log admin action
      await logAdminAction('change_user_role', selectedUser.id, {
        old_role: selectedUser.role,
        new_role: newRole,
      })

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, role: newRole } : user
        )
      )

      toast({
        title: 'Success',
        description: `User role changed to ${getRoleDisplayName(newRole)}`,
      })

      setShowRoleDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Failed to change role:', error)
      toast({
        title: 'Error',
        description: 'Failed to change user role',
        variant: 'destructive',
      })
    }
  }

  // Toggle user active status
  const handleToggleActive = async () => {
    if (!selectedUser) return

    try {
      const newStatus = !selectedUser.is_active

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', selectedUser.id)

      if (error) throw error

      // Log admin action
      await logAdminAction(
        newStatus ? 'activate_user' : 'deactivate_user',
        selectedUser.id
      )

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, is_active: newStatus } : user
        )
      )

      toast({
        title: 'Success',
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      })

      setShowDeactivateDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Failed to toggle user status:', error)
      toast({
        title: 'Error',
        description: 'Failed to change user status',
        variant: 'destructive',
      })
    }
  }

  // Confirm user email
  const handleConfirmEmail = async () => {
    if (!selectedUser) return

    try {
      setConfirming(true)

      // Call Supabase admin API to confirm email
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No active session')
      }

      // Use the admin API to update the user's email confirmation status
      const response = await fetch('/api/admin/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          email: selectedUser.email,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to confirm email')
      }

      // Log admin action
      await logAdminAction('confirm_user_email', selectedUser.id)

      // Reload users to refresh the UI
      await loadUsers()

      toast({
        title: 'Success',
        description: 'User email confirmed successfully',
      })

      setShowConfirmEmailDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Failed to confirm email:', error)
      toast({
        title: 'Error',
        description: 'Failed to confirm user email. Please try using Supabase Dashboard.',
        variant: 'destructive',
      })
    } finally {
      setConfirming(false)
    }
  }

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setDeleting(true)

      // Log admin action before deletion
      await logAdminAction('delete_user', selectedUser.id, {
        email: selectedUser.email,
        full_name: selectedUser.full_name,
      })

      // Call API route to delete user (uses service role to bypass RLS)
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      // Reload users from database to refresh the UI
      await loadUsers()

      toast({
        title: 'Success',
        description: 'User and all related data deleted successfully',
      })

      setShowDeleteDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast({
        title: 'Error',
        description: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading users...</div>
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

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, roles, and permissions
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
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.is_mentor && u.mentor_approved).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => !u.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="trader">Trader</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.full_name || 'No name set'}</p>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                        {user.is_mentor && user.mentor_approved && (
                          <Badge variant="outline" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Mentor
                          </Badge>
                        )}
                        {!user.is_active && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {user.is_mentor && user.mentor_approved && (
                        <div className="text-sm text-muted-foreground">
                          Rating: {user.mentor_rating?.toFixed(1) || '0.0'} ⭐ ({user.mentor_total_reviews || 0} reviews)
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setNewRole(user.role)
                          setShowRoleDialog(true)
                        }}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setShowConfirmEmailDialog(true)
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Email
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDeactivateDialog(true)
                        }}
                      >
                        {user.is_active ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate User
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate User
                          </>
                        )}
                      </DropdownMenuItem>
                      {user.is_mentor && (
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/mentors/${user.id}`)}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          View Mentor Profile
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="premium">Premium Trader</SelectItem>
                <SelectItem value="trader">Trader</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole}>Change Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.is_active ? 'Deactivate' : 'Activate'} User
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_active
                ? 'This will prevent the user from accessing the platform.'
                : 'This will restore access to the platform.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedUser?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
            >
              {selectedUser?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Email Dialog */}
      <Dialog open={showConfirmEmailDialog} onOpenChange={setShowConfirmEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm User Email</DialogTitle>
            <DialogDescription>
              Manually confirm the email address for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium">Important:</p>
                  <p className="text-muted-foreground">
                    This will bypass the email verification process and allow the user to sign in immediately.
                    Only use this for trusted users or testing purposes.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Email:</strong> {selectedUser?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEmail} disabled={confirming}>
              {confirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.full_name || selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium text-red-900 dark:text-red-100">Warning: This action cannot be undone!</p>
                  <p className="text-red-800 dark:text-red-200">
                    Deleting this user will permanently remove their profile from the system.
                    Their trades, playbooks, and other related data may also be affected.
                  </p>
                  <p className="text-red-800 dark:text-red-200">
                    <strong>Email:</strong> {selectedUser?.email}
                  </p>
                  <p className="text-red-800 dark:text-red-200">
                    <strong>Role:</strong> {selectedUser?.role && getRoleDisplayName(selectedUser.role)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
