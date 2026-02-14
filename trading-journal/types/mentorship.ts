/**
 * Mentorship Platform Types
 * Types for users, mentors, reviews, and social features
 */

// =====================================================
// USER ROLES & PROFILES
// =====================================================

export type UserRole = 'admin' | 'mentor' | 'trader' | 'premium'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string

  // Role system
  role: UserRole

  // Account status (WHOP verification)
  is_active: boolean
  whop_username?: string
  whop_user_id?: string
  activated_at?: string
  deactivated_at?: string

  // Mentor-specific
  is_mentor: boolean
  mentor_bio?: string
  mentor_specialties?: string[]
  mentor_experience_years?: number
  mentor_approved: boolean
  mentor_rating: number
  mentor_total_reviews: number
  mentor_available: boolean
  instagram_url?: string

  // Settings
  timezone: string
  language: string
  notification_email: boolean
  notification_push: boolean

  // Timestamps
  created_at: string
  updated_at: string
  last_login?: string
}

export type UserProfileInput = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
export type UserProfileUpdate = Partial<UserProfileInput>

// =====================================================
// MENTORSHIP CONNECTIONS
// =====================================================

export type MentorStudentStatus = 'active' | 'paused' | 'ended'

export interface MentorStudent {
  id: string
  mentor_id: string
  student_id: string

  status: MentorStudentStatus
  assigned_at: string
  ended_at?: string

  allow_full_journal_access: boolean
  notification_enabled: boolean

  mentor_notes?: string
}

export interface MentorStudentWithProfiles extends MentorStudent {
  mentor: UserProfile
  student: UserProfile
}

// =====================================================
// TRADE REVIEWS
// =====================================================

export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type ReviewPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface TradeReview {
  id: string
  trade_id: string
  trader_id: string
  mentor_id?: string

  // Request
  status: ReviewStatus
  priority: ReviewPriority
  request_message?: string
  specific_questions?: string[]
  requested_at: string

  // Response
  review_text?: string
  review_rating?: number // 1-5
  mistakes_identified?: string[]
  improvements_suggested?: string[]
  positive_aspects?: string[]
  reviewed_at?: string

  // Meta
  is_read: boolean
  trader_helpful_rating?: number // 1-5
}

export interface TradeReviewWithDetails extends TradeReview {
  trade: any // Trade type from main types
  trader: UserProfile
  mentor?: UserProfile
  comment_count: number
}

export interface ReviewComment {
  id: string
  review_id: string
  user_id: string
  comment_text: string
  parent_comment_id?: string

  created_at: string
  updated_at: string
  is_edited: boolean
}

export interface ReviewCommentWithUser extends ReviewComment {
  user: UserProfile
  replies?: ReviewCommentWithUser[]
}

// =====================================================
// SHARED CONTENT
// =====================================================

export interface SharedPlaybook {
  id: string
  playbook_id: string
  mentor_id: string

  // Sharing
  is_public: boolean
  shared_with_students_only: boolean

  // Content
  sharing_message?: string
  key_insights?: string[]

  // Analytics
  view_count: number
  copy_count: number
  like_count: number

  shared_at: string
  updated_at: string
}

export interface SharedPlaybookWithDetails extends SharedPlaybook {
  playbook: any // Playbook type
  mentor: UserProfile
  has_user_copied: boolean
}

export interface PublicTrade {
  id: string
  trade_id: string
  mentor_id: string

  // Content
  title: string
  description: string
  key_lessons: string[]
  tags?: string[]

  // Visibility
  is_published: boolean
  featured: boolean

  // Analytics
  view_count: number
  like_count: number
  bookmark_count: number

  published_at: string
  updated_at: string
}

export interface PublicTradeWithDetails extends PublicTrade {
  trade: any // Trade type
  mentor: UserProfile
  has_user_liked: boolean
  has_user_bookmarked: boolean
}

export interface TradeLike {
  id: string
  public_trade_id: string
  user_id: string
  created_at: string
}

export interface TradeBookmark {
  id: string
  public_trade_id: string
  user_id: string
  notes?: string
  created_at: string
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export type NotificationType =
  | 'trade_review_request'
  | 'trade_review_completed'
  | 'review_comment'
  | 'playbook_shared'
  | 'new_public_trade'
  | 'mentor_assigned'
  | 'student_assigned'
  | 'system_message'
  | 'mentor_approved'
  | 'mentor_rejected'

export interface Notification {
  id: string
  user_id: string

  // Content
  type: NotificationType
  title: string
  message: string

  // Reference
  reference_id?: string
  reference_type?: string
  action_url?: string

  // Status
  is_read: boolean
  is_archived: boolean

  created_at: string
}

export interface NotificationWithDetails extends Notification {
  // Could include related entity data
  related_user?: UserProfile
}

// =====================================================
// ADMIN
// =====================================================

export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  target_user_id?: string
  details?: Record<string, any>

  ip_address?: string
  user_agent?: string

  created_at: string
}

export interface AdminAuditLogWithDetails extends AdminAuditLog {
  admin: UserProfile
  target_user?: UserProfile
}

export type MentorApplicationStatus = 'pending' | 'approved' | 'rejected' | 'under_review'

export interface MentorApplication {
  id: string
  user_id: string

  // Application
  bio: string
  specialties: string[]
  experience_years: number
  trading_style: string
  reason_for_mentoring: string

  // Verification
  verified_trading_account?: string
  proof_of_experience_urls?: string[]

  // Status
  status: MentorApplicationStatus
  reviewed_by?: string
  review_notes?: string
  reviewed_at?: string

  created_at: string
  updated_at: string
}

export interface MentorApplicationWithDetails extends MentorApplication {
  user: UserProfile
  reviewer?: UserProfile
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export interface AdminDashboardStats {
  total_users: number
  total_mentors: number
  total_active_mentors: number
  total_reviews_pending: number
  total_reviews_completed: number
  new_users_this_week: number
  new_users_this_month: number
  pending_applications: number
}

export interface MentorDashboardStats {
  pending_reviews: number
  total_students: number
  average_rating: number
  response_rate: number
  total_reviews_completed: number
  reviews_this_week: number
  reviews_this_month: number
  active_discussions: number
}

export interface TraderDashboardStats {
  total_reviews_requested: number
  reviews_pending: number
  reviews_completed: number
  mentor_assigned: boolean
  mentor_info?: UserProfile
  playbooks_accessed: number
  community_engagement_score: number
}

// =====================================================
// FILTERS & SEARCH
// =====================================================

export interface ReviewFilters {
  status?: ReviewStatus[]
  priority?: ReviewPriority[]
  mentor_id?: string
  trader_id?: string
  date_from?: string
  date_to?: string
}

export interface PublicTradeFilters {
  mentor_id?: string
  tags?: string[]
  symbols?: string[]
  outcome?: string[]
  date_from?: string
  date_to?: string
  sort_by?: 'recent' | 'popular' | 'liked'
}

export interface MentorSearchFilters {
  specialties?: string[]
  min_rating?: number
  min_experience?: number
  available_only?: boolean
}

// =====================================================
// FORMS & INPUTS
// =====================================================

export interface ReviewRequestInput {
  trade_id: string
  mentor_id?: string
  priority: ReviewPriority
  request_message: string
  specific_questions?: string[]
}

export interface ReviewResponseInput {
  review_text: string
  review_rating: number
  mistakes_identified?: string[]
  improvements_suggested?: string[]
  positive_aspects?: string[]
}

export interface PublicTradeInput {
  trade_id: string
  title: string
  description: string
  key_lessons: string[]
  tags?: string[]
}

export interface MentorApplicationInput {
  bio: string
  specialties: string[]
  experience_years: number
  trading_style: string
  reason_for_mentoring: string
  verified_trading_account?: string
  proof_of_experience_urls?: string[]
}

// =====================================================
// API RESPONSES
// =====================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface MentorPerformance {
  mentor_id: string
  total_reviews: number
  average_rating: number
  average_response_time_hours: number
  student_success_rate: number
  active_students: number
}

export interface StudentProgress {
  student_id: string
  mentor_id: string
  total_trades: number
  reviews_received: number
  win_rate_before: number
  win_rate_after: number
  improvement_percentage: number
  last_review_date: string
}
