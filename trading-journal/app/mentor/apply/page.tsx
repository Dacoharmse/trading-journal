'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, Award, BookOpen, TrendingUp, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import type { UserProfile } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function MentorApplicationPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [existingApplication, setExistingApplication] = React.useState<any>(null)

  // Form state
  const [tradingExperience, setTradingExperience] = React.useState('')
  const [specialties, setSpecialties] = React.useState('')
  const [whyMentor, setWhyMentor] = React.useState('')
  const [teachingExperience, setTeachingExperience] = React.useState('')
  const [availability, setAvailability] = React.useState('')
  const [certifications, setCertifications] = React.useState('')

  // Load profile and check for existing application
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const userProfile = await getCurrentUserProfile()
        if (!userProfile) {
          router.push('/auth/login')
          return
        }
        setProfile(userProfile)

        // Check if user is already a mentor
        if (userProfile.is_mentor && userProfile.mentor_approved) {
          toast({
            title: 'Already a Mentor',
            description: 'You are already an approved mentor',
          })
          router.push('/mentor')
          return
        }

        // Check for existing application
        const { data: application } = await supabase
          .from('mentor_applications')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single()

        if (application) {
          setExistingApplication(application)
          if (application.status === 'pending') {
            // Pre-fill form with existing application
            setTradingExperience(application.trading_experience || '')
            setSpecialties(application.specialties?.join(', ') || '')
            setWhyMentor(application.why_mentor || '')
            setTeachingExperience(application.teaching_experience || '')
            setAvailability(application.availability || '')
            setCertifications(application.certifications || '')
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) return

    // Validate form
    if (!tradingExperience || !specialties || !whyMentor) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Parse specialties
      const specialtiesArray = specialties
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (specialtiesArray.length === 0) {
        throw new Error('Please enter at least one specialty')
      }

      // Check if updating existing application or creating new
      if (existingApplication && existingApplication.status === 'pending') {
        // Update existing application
        const { error } = await supabase
          .from('mentor_applications')
          .update({
            trading_experience: tradingExperience,
            specialties: specialtiesArray,
            why_mentor: whyMentor,
            teaching_experience: teachingExperience || null,
            availability: availability || null,
            certifications: certifications || null,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existingApplication.id)

        if (error) throw error
      } else {
        // Create new application
        const { error } = await supabase.from('mentor_applications').insert({
          user_id: profile.id,
          trading_experience: tradingExperience,
          specialties: specialtiesArray,
          why_mentor: whyMentor,
          teaching_experience: teachingExperience || null,
          availability: availability || null,
          certifications: certifications || null,
          status: 'pending',
        })

        if (error) throw error

        // Update user profile to indicate mentor application
        await supabase
          .from('user_profiles')
          .update({ is_mentor: true, mentor_approved: false })
          .eq('id', profile.id)
      }

      toast({
        title: 'Application Submitted',
        description: 'Your mentor application has been submitted for review',
      })

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Failed to submit application:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Apply to Become a Mentor</h1>
        <p className="text-muted-foreground">
          Share your trading expertise and help others improve their skills
        </p>
      </div>

      {/* Application Status */}
      {existingApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  existingApplication.status === 'approved'
                    ? 'default'
                    : existingApplication.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {existingApplication.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Submitted {new Date(existingApplication.submitted_at).toLocaleDateString()}
              </span>
            </div>
            {existingApplication.status === 'rejected' && existingApplication.admin_notes && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-medium">Feedback from Admin:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {existingApplication.admin_notes}
                </p>
              </div>
            )}
            {existingApplication.status === 'pending' && (
              <p className="text-sm text-muted-foreground mt-2">
                Your application is under review. You can update it below if needed.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <UserCheck className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Help Others</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Guide traders on their journey to profitability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Award className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Build Reputation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gain recognition as a trusted trading mentor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Share Knowledge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create and share playbooks and educational content
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      {existingApplication?.status !== 'approved' && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Application Form</CardTitle>
              <CardDescription>
                Tell us about your trading experience and why you want to mentor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trading Experience */}
              <div className="space-y-2">
                <Label htmlFor="trading-experience">
                  Trading Experience <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="trading-experience"
                  placeholder="Describe your trading experience, including years of trading, markets traded, and key achievements..."
                  value={tradingExperience}
                  onChange={(e) => setTradingExperience(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Specialties */}
              <div className="space-y-2">
                <Label htmlFor="specialties">
                  Specialties <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="specialties"
                  placeholder="E.g., Scalping, Swing Trading, Forex, Risk Management (comma-separated)"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter your trading specialties separated by commas
                </p>
              </div>

              {/* Why Mentor */}
              <div className="space-y-2">
                <Label htmlFor="why-mentor">
                  Why do you want to become a mentor? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="why-mentor"
                  placeholder="Share your motivation for mentoring and what you hope to achieve..."
                  value={whyMentor}
                  onChange={(e) => setWhyMentor(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Teaching Experience */}
              <div className="space-y-2">
                <Label htmlFor="teaching-experience">Teaching/Mentoring Experience</Label>
                <Textarea
                  id="teaching-experience"
                  placeholder="Any previous experience teaching, coaching, or mentoring (optional)..."
                  value={teachingExperience}
                  onChange={(e) => setTeachingExperience(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Textarea
                  id="availability"
                  placeholder="How many hours per week can you dedicate to mentoring? Any specific time preferences?"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Certifications */}
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications & Credentials</Label>
                <Textarea
                  id="certifications"
                  placeholder="Any relevant trading certifications, courses completed, or credentials (optional)..."
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    'Submitting...'
                  ) : existingApplication?.status === 'pending' ? (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Update Application
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
