'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserProfile } from '@/types/mentorship'
import {
  Users,
  TrendingUp,
  BookOpen,
  Eye,
  Instagram,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface MentorInfo extends UserProfile {
  publishedTradesCount?: number
  studentsCount?: number
  sharedPlaybooksCount?: number
}

export default function StudentMentorsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [mentors, setMentors] = React.useState<MentorInfo[]>([])

  React.useEffect(() => {
    fetch('/api/student/mentors')
      .then((r) => (r.ok ? r.json() : { mentors: [] }))
      .then((json) => setMentors(json.mentors ?? []))
      .catch(() => toast({ title: 'Error', description: 'Failed to load mentors', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading mentors...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Mentors</h1>
          <p className="text-muted-foreground">Learn from experienced traders</p>
        </div>
        <Users className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Mentors Grid */}
      {mentors.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-semibold">No Mentors Available</p>
              <p className="text-sm mt-2">Mentors will appear here once they are assigned</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-xl">{mentor.full_name || mentor.email}</CardTitle>
                {mentor.instagram_url && (
                  <CardDescription className="text-base">
                    <a
                      href={mentor.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>Instagram</span>
                    </a>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{mentor.publishedTradesCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Published Trades</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <BookOpen className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{mentor.sharedPlaybooksCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Shared Playbooks</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">{mentor.studentsCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-2">
                  <Link href="/student/published-trades" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm font-medium">View Published Trades</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{mentor.publishedTradesCount || 0} trades</span>
                    </div>
                  </Link>
                  <Link href="/student/playbooks" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm font-medium">Access Shared Playbooks</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{mentor.sharedPlaybooksCount || 0} playbooks</span>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
