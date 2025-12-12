'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ArrowLeft,
  Search,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  Users,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
}

interface SharedPlaybook {
  id: string
  playbook_id: string
  mentor_id: string
  shared_with: 'all_students' | 'specific_students'
  student_ids: string[]
  shared_note: string | null
  created_at: string
  playbook: Playbook
  mentor: {
    id: string
    full_name: string | null
    email: string
  }
}

interface PlaybookRule {
  id: string
  title: string
  description: string | null
  rule_type: string
  is_required: boolean
}

interface PlaybookConfluence {
  id: string
  name: string
  description: string | null
}

export default function StudentPlaybooksPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [sharedPlaybooks, setSharedPlaybooks] = React.useState<SharedPlaybook[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [mentorFilter, setMentorFilter] = React.useState<string>('all')

  const [showPlaybookDetails, setShowPlaybookDetails] = React.useState(false)
  const [selectedPlaybook, setSelectedPlaybook] = React.useState<SharedPlaybook | null>(null)
  const [playbookRules, setPlaybookRules] = React.useState<PlaybookRule[]>([])
  const [playbookConfluences, setPlaybookConfluences] = React.useState<PlaybookConfluence[]>([])
  const [loadingDetails, setLoadingDetails] = React.useState(false)

  React.useEffect(() => {
    loadSharedPlaybooks()
  }, [])

  const loadSharedPlaybooks = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get connected mentor IDs
      const { data: connections, error: connectionsError } = await supabase
        .from('mentorship_connections')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (connectionsError) throw connectionsError

      const mentorIds = connections?.map((c: any) => c.mentor_id) || []

      if (mentorIds.length === 0) {
        setSharedPlaybooks([])
        setLoading(false)
        return
      }

      // Load shared playbooks
      const { data: playbooksData, error: playbooksError } = await supabase
        .from('shared_playbooks')
        .select(`
          id,
          playbook_id,
          mentor_id,
          shared_with,
          student_ids,
          shared_note,
          created_at,
          playbook:playbook_id (
            id,
            name,
            description,
            category,
            sessions,
            symbols,
            rr_min,
            active,
            created_at
          ),
          mentor:mentor_id (
            id,
            full_name,
            email
          )
        `)
        .in('mentor_id', mentorIds)
        .order('created_at', { ascending: false })

      if (playbooksError) throw playbooksError

      // Filter playbooks based on sharing rules
      const accessiblePlaybooks = playbooksData?.filter((pb: any) => {
        if (pb.shared_with === 'all_students') return true
        if (pb.shared_with === 'specific_students' && pb.student_ids?.includes(user.id)) return true
        return false
      }) || []

      setSharedPlaybooks(accessiblePlaybooks)
    } catch (error) {
      console.error('Error loading shared playbooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPlaybookDetails = async (playbookId: string) => {
    try {
      setLoadingDetails(true)

      // Load rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('playbook_rules')
        .select('id, title, description, rule_type, is_required')
        .eq('playbook_id', playbookId)
        .order('is_required', { ascending: false })

      if (rulesError) throw rulesError
      setPlaybookRules(rulesData || [])

      // Load confluences
      const { data: confluencesData, error: confluencesError } = await supabase
        .from('playbook_confluences')
        .select('id, name, description')
        .eq('playbook_id', playbookId)

      if (confluencesError) throw confluencesError
      setPlaybookConfluences(confluencesData || [])
    } catch (error) {
      console.error('Error loading playbook details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleViewPlaybook = async (playbook: SharedPlaybook) => {
    setSelectedPlaybook(playbook)
    setShowPlaybookDetails(true)
    await loadPlaybookDetails(playbook.playbook_id)
  }

  const filteredPlaybooks = React.useMemo(() => {
    return sharedPlaybooks.filter((shared) => {
      const matchesSearch =
        shared.playbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shared.playbook.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shared.mentor.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || shared.playbook.category === categoryFilter
      const matchesMentor = mentorFilter === 'all' || shared.mentor_id === mentorFilter

      return matchesSearch && matchesCategory && matchesMentor
    })
  }, [sharedPlaybooks, searchTerm, categoryFilter, mentorFilter])

  const categories = React.useMemo(() => {
    const cats = new Set(sharedPlaybooks.map((pb) => pb.playbook.category))
    return Array.from(cats)
  }, [sharedPlaybooks])

  const mentors = React.useMemo(() => {
    const mentorMap = new Map()
    sharedPlaybooks.forEach((pb) => {
      if (!mentorMap.has(pb.mentor_id)) {
        mentorMap.set(pb.mentor_id, pb.mentor)
      }
    })
    return Array.from(mentorMap.values())
  }, [sharedPlaybooks])

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading playbooks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/student/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">Shared Playbooks</h1>
          <p className="text-muted-foreground">Trading strategies and playbooks shared by your mentors</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Playbooks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedPlaybooks.length}</div>
            <p className="text-xs text-muted-foreground">Available to study</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentors Sharing</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentors.length}</div>
            <p className="text-xs text-muted-foreground">Active mentors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Different strategies</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playbooks or mentors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mentorFilter} onValueChange={setMentorFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All mentors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Mentors</SelectItem>
            {mentors.map((mentor) => (
              <SelectItem key={mentor.id} value={mentor.id}>
                {mentor.full_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Playbooks Grid */}
      {filteredPlaybooks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {sharedPlaybooks.length === 0 ? 'No playbooks shared yet' : 'No playbooks match your filters'}
            </h3>
            <p className="text-muted-foreground">
              {sharedPlaybooks.length === 0
                ? 'Your mentors can share their trading playbooks with you'
                : 'Try adjusting your search or filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlaybooks.map((shared) => (
            <Card key={shared.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <Badge variant="outline">{shared.playbook.category}</Badge>
                </div>
                <CardTitle className="line-clamp-1">{shared.playbook.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {shared.playbook.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mentor Info */}
                <div className="flex items-center gap-2 mb-4">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(shared.mentor.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {shared.mentor.full_name || 'Unknown'}
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="text-sm font-medium">
                      {shared.playbook.sessions?.length || 0} types
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Symbols</p>
                    <p className="text-sm font-medium">
                      {shared.playbook.symbols?.length || 0} tracked
                    </p>
                  </div>
                </div>

                {/* Shared Note */}
                {shared.shared_note && (
                  <div className="p-3 bg-muted rounded mb-4">
                    <p className="text-xs font-medium mb-1">Mentor's Note:</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {shared.shared_note}
                    </p>
                  </div>
                )}

                {/* Symbols Preview */}
                {shared.playbook.symbols && shared.playbook.symbols.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Symbols:</p>
                    <div className="flex flex-wrap gap-1">
                      {shared.playbook.symbols.slice(0, 5).map((symbol) => (
                        <Badge key={symbol} variant="secondary" className="text-xs">
                          {symbol}
                        </Badge>
                      ))}
                      {shared.playbook.symbols.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{shared.playbook.symbols.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Shared {formatDate(shared.created_at)}</span>
                  </div>
                  {shared.playbook.rr_min && (
                    <span>Min R:R {shared.playbook.rr_min}:1</span>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleViewPlaybook(shared)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Playbook Details Dialog */}
      <Dialog open={showPlaybookDetails} onOpenChange={setShowPlaybookDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {selectedPlaybook?.playbook.name}
            </DialogTitle>
            <DialogDescription>
              Shared by {selectedPlaybook?.mentor.full_name || 'Unknown'}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading details...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Description */}
              {selectedPlaybook?.playbook.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedPlaybook.playbook.description}</p>
                </div>
              )}

              {/* Mentor's Note */}
              {selectedPlaybook?.shared_note && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Mentor's Note
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedPlaybook.shared_note}</p>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
                  <Badge variant="outline">{selectedPlaybook?.playbook.category}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Sessions</p>
                  <p className="text-sm">{selectedPlaybook?.playbook.sessions?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Symbols</p>
                  <p className="text-sm">{selectedPlaybook?.playbook.symbols?.length || 0}</p>
                </div>
                {selectedPlaybook?.playbook.rr_min && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Min R:R</p>
                    <p className="text-sm">{selectedPlaybook.playbook.rr_min}:1</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Symbols */}
              {selectedPlaybook?.playbook.symbols && selectedPlaybook.playbook.symbols.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Tracked Symbols
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlaybook.playbook.symbols.map((symbol) => (
                      <Badge key={symbol} variant="secondary">
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions */}
              {selectedPlaybook?.playbook.sessions && selectedPlaybook.playbook.sessions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Trading Sessions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlaybook.playbook.sessions.map((session) => (
                      <Badge key={session} variant="outline">
                        {session}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Rules */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Playbook Rules ({playbookRules.length})
                </h3>
                {playbookRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rules defined</p>
                ) : (
                  <div className="space-y-3">
                    {playbookRules.map((rule) => (
                      <div key={rule.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          {rule.is_required ? (
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{rule.title}</h4>
                              {rule.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {rule.rule_type}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confluences */}
              {playbookConfluences.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Confluences ({playbookConfluences.length})
                  </h3>
                  <div className="space-y-3">
                    {playbookConfluences.map((confluence) => (
                      <div key={confluence.id} className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium mb-1">{confluence.name}</h4>
                        {confluence.description && (
                          <p className="text-sm text-muted-foreground">{confluence.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
