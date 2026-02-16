'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ArrowLeft,
  Search,
  Share2,
  Users,
  UserCheck,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
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

interface Playbook {
  id: string
  name: string
  description: string | null
  category: string
  sessions: string[]
  symbols: string[]
  rr_min: number | null
  active: boolean
  created_at: string
  rule_count?: number
  confluence_count?: number
}

interface SharedPlaybook {
  id: string
  playbook_id: string
  shared_with: 'all_students' | 'specific_students'
  student_ids: string[]
  shared_note: string | null
  created_at: string
  playbook?: Playbook
  student_count?: number
}

interface Student {
  id: string
  full_name: string | null
  email: string
}

export default function SharePlaybookPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [playbooks, setPlaybooks] = React.useState<Playbook[]>([])
  const [sharedPlaybooks, setSharedPlaybooks] = React.useState<SharedPlaybook[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filteredPlaybooks, setFilteredPlaybooks] = React.useState<Playbook[]>([])

  const [showShareDialog, setShowShareDialog] = React.useState(false)
  const [selectedPlaybook, setSelectedPlaybook] = React.useState<Playbook | null>(null)
  const [shareWith, setShareWith] = React.useState<'all_students' | 'specific_students'>('all_students')
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([])
  const [shareNote, setShareNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const [showPlaybookDetails, setShowPlaybookDetails] = React.useState(false)
  const [viewingPlaybook, setViewingPlaybook] = React.useState<Playbook | null>(null)
  const [playbookRules, setPlaybookRules] = React.useState<any[]>([])
  const [playbookConfluences, setPlaybookConfluences] = React.useState<any[]>([])

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

        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Load mentor's playbooks
        const { data: playbooksData, error: playbooksError } = await supabase
          .from('playbooks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (playbooksError) throw playbooksError

        // Get rule and confluence counts for each playbook
        const playbooksWithCounts = await Promise.all(
          (playbooksData || []).map(async (playbook) => {
            const [rulesResult, confResult] = await Promise.all([
              supabase
                .from('playbook_rules')
                .select('id', { count: 'exact', head: true })
                .eq('playbook_id', playbook.id),
              supabase
                .from('playbook_confluences')
                .select('id', { count: 'exact', head: true })
                .eq('playbook_id', playbook.id),
            ])

            return {
              ...playbook,
              rule_count: rulesResult.count || 0,
              confluence_count: confResult.count || 0,
            }
          })
        )

        setPlaybooks(playbooksWithCounts)
        setFilteredPlaybooks(playbooksWithCounts)

        // Load shared playbooks
        const { data: sharedData, error: sharedError } = await supabase
          .from('shared_playbooks')
          .select(`
            *,
            playbook:playbook_id (
              id,
              name,
              description,
              category
            )
          `)
          .eq('mentor_id', user.id)
          .order('created_at', { ascending: false })

        if (sharedError) throw sharedError

        setSharedPlaybooks(sharedData || [])

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
          description: 'Failed to load playbooks',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, router, toast])

  // Filter playbooks
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlaybooks(playbooks)
      return
    }

    const filtered = playbooks.filter((pb) => {
      const name = pb.name.toLowerCase()
      const desc = pb.description?.toLowerCase() || ''
      const category = pb.category.toLowerCase()
      const search = searchTerm.toLowerCase()

      return name.includes(search) || desc.includes(search) || category.includes(search)
    })

    setFilteredPlaybooks(filtered)
  }, [searchTerm, playbooks])

  const handleSharePlaybook = async () => {
    if (!selectedPlaybook) return

    if (shareWith === 'specific_students' && selectedStudents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one student',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) return

      const { error } = await supabase
        .from('shared_playbooks')
        .upsert({
          mentor_id: user.id,
          playbook_id: selectedPlaybook.id,
          shared_with: shareWith,
          student_ids: shareWith === 'specific_students' ? selectedStudents : [],
          shared_note: shareNote.trim() || null,
        }, {
          onConflict: 'mentor_id,playbook_id'
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: `Playbook "${selectedPlaybook.name}" shared successfully`,
      })

      // Reload shared playbooks
      const { data: sharedData } = await supabase
        .from('shared_playbooks')
        .select(`
          *,
          playbook:playbook_id (
            id,
            name,
            description,
            category
          )
        `)
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false })

      setSharedPlaybooks(sharedData || [])
      setShowShareDialog(false)
      setSelectedPlaybook(null)
      setShareWith('all_students')
      setSelectedStudents([])
      setShareNote('')
    } catch (error) {
      console.error('Failed to share playbook:', error)
      toast({
        title: 'Error',
        description: 'Failed to share playbook',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnsharePlaybook = async (sharedId: string) => {
    try {
      const { error } = await supabase
        .from('shared_playbooks')
        .delete()
        .eq('id', sharedId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Playbook unshared successfully',
      })

      setSharedPlaybooks(sharedPlaybooks.filter((sp) => sp.id !== sharedId))
    } catch (error) {
      console.error('Failed to unshare playbook:', error)
      toast({
        title: 'Error',
        description: 'Failed to unshare playbook',
        variant: 'destructive',
      })
    }
  }

  const handleViewPlaybook = async (playbook: Playbook) => {
    setViewingPlaybook(playbook)
    setShowPlaybookDetails(true)

    try {
      const [rulesResult, confResult] = await Promise.all([
        supabase
          .from('playbook_rules')
          .select('*')
          .eq('playbook_id', playbook.id)
          .order('sort', { ascending: true }),
        supabase
          .from('playbook_confluences')
          .select('*')
          .eq('playbook_id', playbook.id)
          .order('sort', { ascending: true }),
      ])

      setPlaybookRules(rulesResult.data || [])
      setPlaybookConfluences(confResult.data || [])
    } catch (error) {
      console.error('Failed to load playbook details:', error)
    }
  }

  const getShareStatus = (playbook: Playbook) => {
    const shared = sharedPlaybooks.find((sp) => sp.playbook_id === playbook.id)
    return shared
  }

  const handleToggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading playbooks...</div>
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
          <h1 className="text-3xl font-bold tracking-tight">Share Playbooks</h1>
          <p className="text-muted-foreground mt-1">
            Share your trading strategies and playbooks with students
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Playbooks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playbooks.length}</div>
            <p className="text-xs text-muted-foreground">Your playbooks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedPlaybooks.length}</div>
            <p className="text-xs text-muted-foreground">Currently shared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playbooks.filter((p) => p.active).length}
            </div>
            <p className="text-xs text-muted-foreground">Active playbooks</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Shared Playbooks */}
      {sharedPlaybooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currently Shared</CardTitle>
            <CardDescription>Playbooks you've shared with students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sharedPlaybooks.map((shared) => (
                <div
                  key={shared.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{shared.playbook?.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={shared.shared_with === 'all_students' ? 'default' : 'secondary'}>
                        {shared.shared_with === 'all_students'
                          ? `All Students (${students.length})`
                          : `${shared.student_ids.length} Selected Students`}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Shared {new Date(shared.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {shared.shared_note && (
                      <p className="text-sm text-muted-foreground mt-2">{shared.shared_note}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnsharePlaybook(shared.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Playbooks */}
      <Card>
        <CardHeader>
          <CardTitle>Your Playbooks</CardTitle>
          <CardDescription>Select a playbook to share with your students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search playbooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredPlaybooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No playbooks found' : 'No playbooks yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'Create playbooks in your journal to share with students'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/playbook')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Playbook
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPlaybooks.map((playbook) => {
                const shareStatus = getShareStatus(playbook)
                return (
                  <Card key={playbook.id} className="hover:border-primary transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{playbook.name}</CardTitle>
                            {!playbook.active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {playbook.description || 'No description'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{playbook.rule_count} Rules</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{playbook.confluence_count} Confluences</span>
                        </div>
                      </div>

                      <Badge variant="outline">{playbook.category}</Badge>

                      {shareStatus && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 dark:text-green-400">
                            Shared with {shareStatus.shared_with === 'all_students'
                              ? 'all students'
                              : `${shareStatus.student_ids.length} students`}
                          </span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewPlaybook(playbook)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant={shareStatus ? 'secondary' : 'default'}
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedPlaybook(playbook)
                            if (shareStatus) {
                              setShareWith(shareStatus.shared_with)
                              setSelectedStudents(shareStatus.student_ids)
                              setShareNote(shareStatus.shared_note || '')
                            }
                            setShowShareDialog(true)
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          {shareStatus ? 'Update' : 'Share'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Playbook</DialogTitle>
            <DialogDescription>
              Share "{selectedPlaybook?.name}" with your students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Share With</label>
              <Select value={shareWith} onValueChange={(val: any) => setShareWith(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_students">
                    All Students ({students.length})
                  </SelectItem>
                  <SelectItem value="specific_students">
                    Specific Students
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareWith === 'specific_students' && (
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

            <div>
              <label className="text-sm font-medium mb-2 block">Note (Optional)</label>
              <Textarea
                placeholder="Add a note about this playbook for your students..."
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSharePlaybook} disabled={submitting}>
              {submitting ? 'Sharing...' : 'Share Playbook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Playbook Details Dialog */}
      <Dialog open={showPlaybookDetails} onOpenChange={setShowPlaybookDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingPlaybook?.name}</DialogTitle>
            <DialogDescription>
              {viewingPlaybook?.description || 'No description'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">{viewingPlaybook?.category}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={viewingPlaybook?.active ? 'default' : 'secondary'} className="mt-1">
                  {viewingPlaybook?.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {playbookRules.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Rules</h3>
                <div className="space-y-2">
                  {playbookRules.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-3 p-3 border rounded">
                      <Badge
                        variant={
                          rule.type === 'must' ? 'destructive' :
                          rule.type === 'should' ? 'default' : 'secondary'
                        }
                      >
                        {rule.type}
                      </Badge>
                      <span className="flex-1">{rule.label}</span>
                      <span className="text-sm text-muted-foreground">Weight: {rule.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playbookConfluences.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Confluences</h3>
                <div className="space-y-2">
                  {playbookConfluences.map((conf) => (
                    <div key={conf.id} className="flex items-center gap-3 p-3 border rounded">
                      {conf.primary_confluence && (
                        <Badge variant="default">Primary</Badge>
                      )}
                      <span className="flex-1">{conf.label}</span>
                      <span className="text-sm text-muted-foreground">Weight: {conf.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
