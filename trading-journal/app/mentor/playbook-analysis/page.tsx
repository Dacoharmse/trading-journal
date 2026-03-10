'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Search,
  Send,
  Trash2,
  User,
  Eye,
  CheckCircle,
} from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface PlaybookSummary {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string | null
  active: boolean
  created_at: string
  updated_at: string
  comment_count: number
}

interface StudentWithPlaybooks {
  id: string
  user_id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  experience_level: string | null
  playbooks: PlaybookSummary[]
}

interface PlaybookComment {
  id: string
  playbook_id: string
  author_id: string
  author_name: string | null
  comment: string
  created_at: string
}

export default function PlaybookAnalysisPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [students, setStudents] = React.useState<StudentWithPlaybooks[]>([])
  const [search, setSearch] = React.useState('')
  const [expandedStudents, setExpandedStudents] = React.useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = React.useState<string>('')

  // Comment dialog
  const [selectedPlaybook, setSelectedPlaybook] = React.useState<PlaybookSummary | null>(null)
  const [selectedStudent, setSelectedStudent] = React.useState<StudentWithPlaybooks | null>(null)
  const [comments, setComments] = React.useState<PlaybookComment[]>([])
  const [commentsLoading, setCommentsLoading] = React.useState(false)
  const [newComment, setNewComment] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Auth check + load data
  React.useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { router.replace('/'); return }
      const isAdmin = profile.role === 'admin'
      const isMentor = profile.is_mentor && profile.mentor_approved
      if (!isAdmin && !isMentor) { router.replace('/'); return }
      setCurrentUserId(profile.user_id || profile.id || '')

      const res = await fetch('/api/mentor/playbook-analysis')
      if (!res.ok) { setLoading(false); return }
      const { students: data } = await res.json()
      setStudents(data ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  const filteredStudents = React.useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.playbooks.some((p) => p.name.toLowerCase().includes(q))
    )
  }, [students, search])

  const toggleStudent = (id: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openComments = async (student: StudentWithPlaybooks, playbook: PlaybookSummary) => {
    setSelectedStudent(student)
    setSelectedPlaybook(playbook)
    setNewComment('')
    setCommentsLoading(true)
    const res = await fetch(`/api/mentor/playbook-comments?playbook_id=${playbook.id}`)
    if (res.ok) {
      const { comments: data } = await res.json()
      setComments(data ?? [])
    }
    setCommentsLoading(false)
  }

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPlaybook) return
    setSubmitting(true)
    const res = await fetch('/api/mentor/playbook-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbook_id: selectedPlaybook.id, comment: newComment }),
    })
    if (res.ok) {
      const { comment } = await res.json()
      setComments((prev) => [...prev, comment])
      setNewComment('')
      // Update comment count in list
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          playbooks: s.playbooks.map((p) =>
            p.id === selectedPlaybook.id ? { ...p, comment_count: p.comment_count + 1 } : p
          ),
        }))
      )
      toast({ title: 'Comment added' })
    } else {
      toast({ title: 'Failed to add comment', variant: 'destructive' })
    }
    setSubmitting(false)
  }

  const deleteComment = async (commentId: string) => {
    const res = await fetch('/api/mentor/playbook-comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId }),
    })
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      if (selectedPlaybook) {
        setStudents((prev) =>
          prev.map((s) => ({
            ...s,
            playbooks: s.playbooks.map((p) =>
              p.id === selectedPlaybook.id ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p
            ),
          }))
        )
      }
    }
  }

  const totalPlaybooks = students.reduce((sum, s) => sum + s.playbooks.length, 0)
  const totalComments = students.reduce(
    (sum, s) => sum + s.playbooks.reduce((ps, p) => ps + p.comment_count, 0),
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-neutral-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Playbook Analysis</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Review student playbooks and leave feedback
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Students with Playbooks', value: students.length },
          { label: 'Total Playbooks', value: totalPlaybooks },
          { label: 'Comments Left', value: totalComments },
        ].map((s) => (
          <Card key={s.label} className="dark:bg-neutral-900 dark:border-neutral-800">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder="Search students or playbooks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 dark:bg-neutral-900 dark:border-neutral-700"
        />
      </div>

      {/* Student list */}
      {filteredStudents.length === 0 ? (
        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="py-12 text-center text-neutral-500 dark:text-neutral-400">
            No students with playbooks found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => {
            const uid = student.user_id || student.id
            const isOpen = expandedStudents.has(uid)
            return (
              <Card key={uid} className="dark:bg-neutral-900 dark:border-neutral-800 overflow-hidden">
                {/* Student header row */}
                <button
                  onClick={() => toggleStudent(uid)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-white text-sm">
                        {student.full_name || student.email}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">{student.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs dark:border-neutral-700">
                      {student.playbooks.length} playbook{student.playbooks.length !== 1 ? 's' : ''}
                    </Badge>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Playbooks list */}
                {isOpen && (
                  <div className="border-t border-neutral-200 dark:border-neutral-800">
                    {student.playbooks.map((playbook) => (
                      <div
                        key={playbook.id}
                        className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800/60 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <BookOpen className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {playbook.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {playbook.category && (
                                <span className="text-xs text-neutral-400">{playbook.category}</span>
                              )}
                              {playbook.active ? (
                                <Badge className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 px-1.5 py-0">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-0 px-1.5 py-0">
                                  Inactive
                                </Badge>
                              )}
                              {playbook.comment_count > 0 && (
                                <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                                  <MessageSquare className="w-3 h-3" />
                                  {playbook.comment_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                            asChild
                          >
                            <Link href={`/playbook/${playbook.id}?view=true`} target="_blank">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                            onClick={() => openComments(student, playbook)}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Comment
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Comment Dialog */}
      <Dialog
        open={!!selectedPlaybook}
        onOpenChange={(open) => { if (!open) { setSelectedPlaybook(null); setSelectedStudent(null) } }}
      >
        <DialogContent className="max-w-lg dark:bg-neutral-900 dark:border-neutral-800 max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base">
              {selectedPlaybook?.name}
              <span className="font-normal text-neutral-500 dark:text-neutral-400 text-sm ml-2">
                — {selectedStudent?.full_name || selectedStudent?.email}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
            {commentsLoading ? (
              <div className="text-center py-6 text-sm text-neutral-400">Loading comments…</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-6 text-sm text-neutral-400">
                No comments yet. Be the first to leave feedback.
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {c.author_name || 'Mentor'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      {c.author_id === currentUserId && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{c.comment}</p>
                </div>
              ))
            )}
          </div>

          <Separator className="dark:bg-neutral-800 flex-shrink-0" />

          {/* Add comment */}
          <div className="flex-shrink-0 space-y-2 pt-2">
            <Textarea
              placeholder="Leave feedback on this playbook…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none text-sm dark:bg-neutral-800 dark:border-neutral-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment()
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Ctrl+Enter to submit</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs dark:border-neutral-700"
                  asChild
                >
                  <Link href={`/playbook/${selectedPlaybook?.id}?view=true`} target="_blank">
                    <Eye className="w-3 h-3 mr-1" />
                    View Full Playbook
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  className="text-xs"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {submitting ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
