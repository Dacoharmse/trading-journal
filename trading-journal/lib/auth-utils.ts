/**
 * Authentication and Authorization Utilities
 * Role-based access control helpers
 */

import { createClient } from '@/lib/supabase/client'
import type { UserRole, UserProfile } from '@/types/mentorship'

/**
 * Get current user's profile with role information
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * Check if current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === role
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin')
}

/**
 * Check if current user is a mentor
 */
export async function isMentor(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.is_mentor === true && profile?.mentor_approved === true
}

/**
 * Check if current user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile ? roles.includes(profile.role) : false
}

/**
 * Require admin role or throw error
 */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error('Admin access required')
  }
}

/**
 * Require mentor role or throw error
 */
export async function requireMentor() {
  if (!(await isMentor())) {
    throw new Error('Mentor access required')
  }
}

/**
 * Check if user can access another user's data
 * Admins can access all, mentors can access their students, users can access own
 */
export async function canAccessUserData(targetUserId: string): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  if (!profile) return false

  // Admins can access everything
  if (profile.role === 'admin') return true

  // Users can access own data
  if (profile.id === targetUserId) return true

  // Mentors can access their students' data
  if (profile.is_mentor && profile.mentor_approved) {
    const supabase = createClient()
    const { data } = await supabase
      .from('mentor_students')
      .select('id')
      .eq('mentor_id', profile.id)
      .eq('student_id', targetUserId)
      .eq('status', 'active')
      .single()

    return !!data
  }

  return false
}

/**
 * Get user's role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'mentor':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'premium':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'trader':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

/**
 * Get user's role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'mentor':
      return 'Mentor'
    case 'premium':
      return 'Premium Trader'
    case 'trader':
      return 'Trader'
    default:
      return 'User'
  }
}

/**
 * Format mentor specialties for display
 */
export function formatSpecialties(specialties: string[] | undefined): string {
  if (!specialties || specialties.length === 0) return 'Not specified'
  if (specialties.length === 1) return specialties[0]
  if (specialties.length === 2) return specialties.join(' & ')
  return `${specialties.slice(0, 2).join(', ')} +${specialties.length - 2} more`
}

/**
 * Calculate mentor rating stars
 */
export function getMentorRatingStars(rating: number): {
  fullStars: number
  halfStar: boolean
  emptyStars: number
} {
  const fullStars = Math.floor(rating)
  const halfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

  return { fullStars, halfStar, emptyStars }
}

/**
 * Check if user can review trades
 */
export async function canReviewTrades(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  if (!profile) return false

  return (
    profile.role === 'admin' ||
    (profile.is_mentor && profile.mentor_approved)
  )
}

/**
 * Check if user can publish public trades
 */
export async function canPublishTrades(): Promise<boolean> {
  return canReviewTrades()
}

/**
 * Check if user can share playbooks
 */
export async function canSharePlaybooks(): Promise<boolean> {
  return canReviewTrades()
}

/**
 * Log admin action
 */
export async function logAdminAction(
  action: string,
  targetUserId?: string,
  details?: Record<string, any>
) {
  const supabase = createClient()
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Only admins can log actions')
  }

  await supabase.from('admin_audit_log').insert({
    admin_id: profile.id,
    action,
    target_user_id: targetUserId,
    details,
  })
}
