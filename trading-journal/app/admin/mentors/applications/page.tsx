'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Shield,
  Mail,
  Calendar,
  Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { requireAdmin, logAdminAction } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MentorApplication {
  id: string
  user_id: string
  trading_experience: string
  specialties: string[]
  why_mentor: string
  teaching_experience?: string
  availability?: string
  certifications?: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  admin_notes?: string
  user_profiles: {
    email: string
    full_name?: string
  }
}

export default function MentorApplicationsPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [applications, setApplications] = React.useState<MentorApplication[]>([])
  const [selectedApplication, setSelectedApplication] = React.useState<MentorApplication | null>(null)
  const [showReviewDialog, setShowReviewDialog] = React.useState(false)
  const [reviewAction, setReviewAction] = React.useState<'approve' | 'reject'>('approve')
  const [adminNotes, setAdminNotes] = React.useState('')

  // Check authorization
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        await requireAdmin()
        setAuthorized(true)
      } catch (error) {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  // Load applications
  React.useEffect(() => {
    if (!authorized) return

    const loadApplications = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('mentor_applications')
          .select('*, user_profiles!inner(email, full_name)')
          .order('submitted_at', { ascending: false })

        if (error) throw error
        setApplications(data || [])
      } catch (error) {
        console.error('Failed to load applications:', error)
        toast({
          title: 'Error',
          description: 'Failed to load mentor applications',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [authorized, supabase, toast])

  const handleReviewApplication = async () => {
    if (!selectedApplication) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Map action to status
      const newStatus = reviewAction === 'approve' ? 'approved' : 'rejected'

      // Update application
      const { error: appError } = await supabase
        .from('mentor_applications')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: adminNotes || null,
        })
        .eq('id', selectedApplication.id)

      if (appError) throw appError

      if (reviewAction === 'approve') {
        // Update user profile to approved mentor
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            is_mentor: true,
            mentor_approved: true,
            mentor_available: true,
            mentor_specialties: selectedApplication.specialties,
            mentor_bio: selectedApplication.why_mentor,
          })
          .eq('id', selectedApplication.user_id)

        if (profileError) throw profileError

        // Create notification for user
        await supabase.rpc('create_notification', {
          p_user_id: selectedApplication.user_id,
          p_type: 'mentor_approved',
          p_title: 'Mentor Application Approved',
          p_message: 'Congratulations! Your mentor application has been approved. You can now start reviewing trades and sharing your expertise.',
          p_priority: 'high',
        })
      } else {
        // Rejected - create notification
        await supabase.rpc('create_notification', {
          p_user_id: selectedApplication.user_id,
          p_type: 'mentor_rejected',
          p_title: 'Mentor Application Update',
          p_message: `Your mentor application has been reviewed. ${adminNotes ? 'Feedback: ' + adminNotes : ''}`,
          p_priority: 'normal',
        })
      }

      // Log admin action
      await logAdminAction(
        reviewAction === 'approve' ? 'approve_mentor' : 'reject_mentor',
        selectedApplication.user_id,
        { application_id: selectedApplication.id, notes: adminNotes }
      )

      // Update local state
      setApplications(
        applications.map((app) =>
          app.id === selectedApplication.id
            ? {
                ...app,
                status: newStatus,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id,
                admin_notes: adminNotes || undefined,
              }
            : app
        )
      )

      toast({
        title: 'Success',
        description: `Mentor application ${reviewAction === 'approve' ? 'approved' : 'rejected'}`,
      })

      setShowReviewDialog(false)
      setSelectedApplication(null)
      setAdminNotes('')
    } catch (error) {
      console.error('Failed to review application:', error)
      toast({
        title: 'Error',
        description: 'Failed to process application',
        variant: 'destructive',
      })
    }
  }

  const openReviewDialog = (application: MentorApplication, action: 'approve' | 'reject') => {
    setSelectedApplication(application)
    setReviewAction(action)
    setAdminNotes(application.admin_notes || '')
    setShowReviewDialog(true)
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading applications...</div>
      </div>
    )
  }

  const pendingApplications = applications.filter((app) => app.status === 'pending')
  const approvedApplications = applications.filter((app) => app.status === 'approved')
  const rejectedApplications = applications.filter((app) => app.status === 'rejected')

  const ApplicationCard = ({ application }: { application: MentorApplication }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>{application.user_profiles.full_name || 'No name set'}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              {application.user_profiles.email}
            </CardDescription>
          </div>
          <Badge
            variant={
              application.status === 'approved'
                ? 'default'
                : application.status === 'rejected'
                ? 'destructive'
                : 'secondary'
            }
          >
            {application.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Submission Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Submitted {new Date(application.submitted_at).toLocaleDateString()}
        </div>

        {/* Specialties */}
        <div>
          <Label className="text-sm font-medium">Specialties</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {application.specialties.map((specialty) => (
              <Badge key={specialty} variant="outline">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        {/* Trading Experience */}
        <div>
          <Label className="text-sm font-medium">Trading Experience</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {application.trading_experience}
          </p>
        </div>

        {/* Why Mentor */}
        <div>
          <Label className="text-sm font-medium">Why Become a Mentor?</Label>
          <p className="text-sm text-muted-foreground mt-1">{application.why_mentor}</p>
        </div>

        {/* Teaching Experience */}
        {application.teaching_experience && (
          <div>
            <Label className="text-sm font-medium">Teaching Experience</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {application.teaching_experience}
            </p>
          </div>
        )}

        {/* Availability */}
        {application.availability && (
          <div>
            <Label className="text-sm font-medium">Availability</Label>
            <p className="text-sm text-muted-foreground mt-1">{application.availability}</p>
          </div>
        )}

        {/* Certifications */}
        {application.certifications && (
          <div>
            <Label className="text-sm font-medium">Certifications</Label>
            <p className="text-sm text-muted-foreground mt-1">{application.certifications}</p>
          </div>
        )}

        {/* Admin Notes */}
        {application.admin_notes && (
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Admin Notes</Label>
            <p className="text-sm text-muted-foreground mt-1">{application.admin_notes}</p>
          </div>
        )}

        {/* Actions */}
        {application.status === 'pending' && (
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1"
              onClick={() => openReviewDialog(application, 'approve')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => openReviewDialog(application, 'reject')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentor Applications</h1>
          <p className="text-muted-foreground mt-1">Review and approve mentor applications</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApplications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedApplications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedApplications.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingApplications.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedApplications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No pending applications
              </CardContent>
            </Card>
          ) : (
            pendingApplications.map((app) => <ApplicationCard key={app.id} application={app} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-6">
          {approvedApplications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No approved applications
              </CardContent>
            </Card>
          ) : (
            approvedApplications.map((app) => <ApplicationCard key={app.id} application={app} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {rejectedApplications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No rejected applications
              </CardContent>
            </Card>
          ) : (
            rejectedApplications.map((app) => <ApplicationCard key={app.id} application={app} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Mentor Application
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'This will grant mentor privileges to the user.'
                : 'This will reject the application. You can provide feedback below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-notes">
                {reviewAction === 'approve' ? 'Notes (Optional)' : 'Feedback for Applicant'}
              </Label>
              <Textarea
                id="admin-notes"
                placeholder={
                  reviewAction === 'approve'
                    ? 'Internal notes about this approval...'
                    : 'Provide feedback on why the application was rejected...'
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleReviewApplication}
            >
              {reviewAction === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Application
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
