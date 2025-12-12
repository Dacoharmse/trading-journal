import { createClient } from '@/lib/supabase/client'

export type NotificationType =
  | 'trade_published'
  | 'playbook_shared'
  | 'mentor_request'
  | 'trade_review'
  | 'system'
  | 'mentor_accepted'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: any
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  const supabase = createClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    is_read: false,
    metadata: params.metadata,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

/**
 * Notify students when a mentor publishes a new trade
 */
export async function notifyStudentsOfPublishedTrade(
  mentorId: string,
  mentorName: string,
  tradeTitle: string,
  tradeId: string
) {
  const supabase = createClient()

  // Get all students connected to this mentor
  const { data: relationships } = await supabase
    .from('mentor_relationships')
    .select('student_id')
    .eq('mentor_id', mentorId)
    .eq('status', 'accepted')

  if (!relationships || relationships.length === 0) return

  // Create notifications for all students
  const notifications = relationships.map((rel) => ({
    user_id: rel.student_id,
    type: 'trade_published' as NotificationType,
    title: 'New Trade Published',
    message: `${mentorName} has published a new trade: "${tradeTitle}"`,
    link: `/student/published-trades`,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Failed to notify students:', error)
  }
}

/**
 * Notify students when a mentor shares a playbook
 */
export async function notifyStudentsOfSharedPlaybook(
  studentIds: string[],
  mentorName: string,
  playbookTitle: string
) {
  const supabase = createClient()

  const notifications = studentIds.map((studentId) => ({
    user_id: studentId,
    type: 'playbook_shared' as NotificationType,
    title: 'Playbook Shared With You',
    message: `${mentorName} has shared a playbook with you: "${playbookTitle}"`,
    link: `/student/playbooks`,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Failed to notify students:', error)
  }
}

/**
 * Notify mentor when a student requests mentorship
 */
export async function notifyMentorOfRequest(
  mentorId: string,
  studentName: string,
  studentId: string
) {
  await createNotification({
    userId: mentorId,
    type: 'mentor_request',
    title: 'New Mentorship Request',
    message: `${studentName} has requested you as a mentor`,
    link: `/mentor/students`,
  })
}

/**
 * Notify student when mentor accepts their request
 */
export async function notifyStudentOfMentorAcceptance(
  studentId: string,
  mentorName: string
) {
  await createNotification({
    userId: studentId,
    type: 'mentor_accepted',
    title: 'Mentor Request Accepted',
    message: `${mentorName} has accepted your mentorship request!`,
    link: `/student/mentors`,
  })
}

/**
 * Notify student when their trade is reviewed
 */
export async function notifyStudentOfTradeReview(
  studentId: string,
  mentorName: string,
  tradeTitle: string,
  reviewId: string
) {
  await createNotification({
    userId: studentId,
    type: 'trade_review',
    title: 'Trade Review Received',
    message: `${mentorName} has reviewed your trade: "${tradeTitle}"`,
    link: `/mentor/reviews`,
  })
}

/**
 * Notify mentor when a student submits a trade for review
 */
export async function notifyMentorOfTradeSubmission(
  mentorId: string,
  studentName: string,
  tradeTitle: string
) {
  await createNotification({
    userId: mentorId,
    type: 'trade_review',
    title: 'New Trade for Review',
    message: `${studentName} has submitted a trade for review: "${tradeTitle}"`,
    link: `/mentor/reviews`,
  })
}

/**
 * Send a system notification to a user
 */
export async function sendSystemNotification(
  userId: string,
  title: string,
  message: string,
  link?: string
) {
  await createNotification({
    userId,
    type: 'system',
    title,
    message,
    link,
  })
}

/**
 * Send a system notification to all users
 */
export async function broadcastSystemNotification(
  title: string,
  message: string,
  link?: string
) {
  const supabase = createClient()

  // Get all active users
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('is_active', true)

  if (!users || users.length === 0) return

  const notifications = users.map((user) => ({
    user_id: user.id,
    type: 'system' as NotificationType,
    title,
    message,
    link,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Failed to broadcast notification:', error)
  }
}
