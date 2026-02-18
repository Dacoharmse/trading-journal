/**
 * Supabase Database Types
 * Extended types matching database schema for trading journal
 */

export interface Account {
  id: string
  user_id: string
  name: string
  currency: 'USD' | 'ZAR' | 'EUR' | 'GBP'
  initial_balance: number
  risk_limit_type?: 'percentage' | 'monetary'
  risk_limit_value?: number
  session_risk_enabled?: boolean
  created_at?: string
  updated_at?: string
}

export interface RiskViolation {
  id: string
  user_id: string
  account_id?: string | null
  trade_id?: string | null
  violation_type: 'session_limit' | 'daily_limit' | 'position_size'
  risk_limit: number
  actual_risk: number
  limit_type: 'percentage' | 'monetary'
  reason: string
  override_approved: boolean
  created_at: string
}

export interface Strategy {
  id: string
  user_id: string
  name: string
  type: 'Breakout' | 'Reversion' | 'Trend' | 'News' | 'ICT' | 'Other'
  rules?: string | null
  sessions?: string[] | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface Confluence {
  id: string
  user_id: string
  label: string
  description?: string | null
  active: boolean
  created_at?: string
}

export interface Symbol {
  id: string
  code: string
  asset_class: 'FX' | 'Index' | 'Metal' | 'Crypto'
  pip_size: number
  point_value: number
  display_name: string
  created_at?: string
}

export interface AccountSymbol {
  account_id: string
  symbol_id: string
  created_at?: string
}

export interface TradeConfluence {
  trade_id: string
  confluence_id: string
}

export type PlaybookTradeType = 'continuation' | 'reversal'

export interface Playbook {
  id: string
  user_id: string
  name: string
  description?: string | null
  category?: string | null
  trade_type?: PlaybookTradeType | null
  sessions: string[]
  symbols: string[]
  rr_min?: number | null
  active: boolean
  analyst_tf?: string | null
  exec_tf?: string | null
  best_sessions?: string[]
  trading_hours?: { tz: string; windows: string[][] } | null
  notes_md?: string | null
  created_at?: string
  updated_at?: string
}

export interface PlaybookRule {
  id: string
  playbook_id: string
  label: string
  type: 'must' | 'should' | 'optional'
  weight: number
  sort: number
  created_at?: string
}

export interface PlaybookConfluence {
  id: string
  playbook_id: string
  label: string
  weight: number
  primary_confluence: boolean
  sort: number
  created_at?: string
}

export interface PlaybookRubric {
  playbook_id: string
  weight_rules: number
  weight_confluences: number
  weight_checklist: number
  must_rule_penalty: number
  min_checks: number
  grade_cutoffs: Record<string, number>
}

export interface PlaybookTradeDetail {
  id: string
  playbook_id: string
  label: string
  type: 'detail' | 'invalidation' | 'consideration' | 'checklist'
  weight: number
  primary_item: boolean
  sort: number
  created_at?: string
}

export interface PlaybookExample {
  id: string
  playbook_id: string
  media_urls: string[]
  caption?: string | null
  sort: number
  created_at?: string
}

export interface PlaybookIndicator {
  id: string
  playbook_id: string
  name: string
  url: string
  description?: string | null
  sort: number
  created_at?: string
  updated_at?: string
}

// Emotional state options for trades
export type EmotionalState =
  | 'confident'
  | 'calm'
  | 'neutral'
  | 'anxious'
  | 'fearful'
  | 'greedy'
  | 'frustrated'
  | 'revenge'
  | 'fomo'
  | 'euphoric'

export const EMOTIONAL_STATES: { value: EmotionalState; label: string; color: string }[] = [
  { value: 'confident', label: 'Confident', color: 'text-green-600' },
  { value: 'calm', label: 'Calm', color: 'text-blue-500' },
  { value: 'neutral', label: 'Neutral', color: 'text-gray-500' },
  { value: 'anxious', label: 'Anxious', color: 'text-yellow-500' },
  { value: 'fearful', label: 'Fearful', color: 'text-orange-500' },
  { value: 'greedy', label: 'Greedy', color: 'text-yellow-600' },
  { value: 'frustrated', label: 'Frustrated', color: 'text-red-400' },
  { value: 'revenge', label: 'Revenge Trading', color: 'text-red-600' },
  { value: 'fomo', label: 'FOMO', color: 'text-purple-500' },
  { value: 'euphoric', label: 'Euphoric', color: 'text-pink-500' },
]

export interface Trade {
  // Core fields
  id: string
  user_id: string
  account_id: string
  symbol: string
  symbol_id?: string | null
  direction: 'long' | 'short'

  // Prices (legacy/optional)
  entry_price: number | null
  stop_price: number | null
  exit_price: number | null
  size: number | null

  // Pips/R-first workflow (NEW)
  pips?: number | null                 // Realized pips/points (+/-)
  stop_pips?: number | null            // Planned stop distance in pips
  target_pips?: number | null          // Planned target distance in pips
  rr_planned?: number | null           // Planned R:R (e.g., 1:2 → 2)
  risk_r?: number | null               // Risk per trade in R (usually 1.0)
  r_multiple?: number | null           // Realized R (+/-)

  // Dates/Times
  entry_date: string
  entry_time?: string | null
  open_time?: string | null
  exit_date: string | null
  exit_time?: string | null
  close_time?: string | null
  opened_at?: string | null
  closed_at?: string | null

  // P&L
  pnl: number
  currency: string

  // Metrics
  mae_r?: number | null  // Maximum Adverse Excursion in R
  mfe_r?: number | null  // Maximum Favorable Excursion in R

  // Categorization
  strategy?: string | null           // Legacy: string name
  strategy_id?: string | null        // NEW: FK to strategies table
  playbook_id?: string | null        // PLAYBOOK: FK to playbooks table
  session?: 'Asia' | 'London' | 'NY' | null
  session_hour?: 'A1' | 'A2' | 'A3' | 'A4' | 'L1' | 'L2' | 'L3' | 'NY1' | 'NY2' | 'NY3' | 'Out of Session' | null  // Specific hour within session
  confluences?: string | null        // Legacy: comma-separated
  tags?: string | null               // Comma-separated

  // Playbook compliance (NEW)
  rules_checked?: Record<string, boolean> | null     // { "<rule_id>": true/false }
  confluences_checked?: Record<string, boolean> | null  // { "<conf_id>": true/false }
  checklist_checked?: Record<string, boolean> | null    // { "<detail_id>": true/false }
  invalidations?: string[] | null                       // List of invalidation IDs present
  setup_score?: number | null        // 0..1 compliance score
  setup_grade?: string | null        // "A+", "A", "B", "C", "D", "F"

  // Costs
  commission?: number | null
  swap?: number | null
  slippage?: number | null
  fees?: number | null

  // Journaling
  notes?: string | null
  rule_breaks?: string | null  // Comma-separated list of rules broken
  pre_trade_checklist?: string | null
  post_trade_review?: string | null
  emotions?: string | null
  emotional_state?: EmotionalState | null  // Structured emotional state
  mistakes?: string | null

  // Attachments
  attachments?: string | null  // JSON array of screenshot URLs (legacy)
  image_url?: string | null    // Legacy single image
  media_urls?: string[]        // NEW: array of uploaded/pasted chart URLs
  htf_media_urls?: string[]    // Higher timeframe chart screenshots

  // Legs (for partial entries/exits)
  legs?: unknown | null  // JSON array of leg data

  // Legacy fields (kept for backward compat with old schema)
  trade_type?: 'long' | 'short' | null
  pnl_amount?: number | null
  pnl_currency?: string | null
  actual_rr?: number | null
  outcome?: 'win' | 'loss' | 'breakeven' | null
  entry_timeframe?: string | null
  analysis_timeframe?: string | null

  // Metadata
  broker?: string | null
  order_type?: string | null
  asset_class?: string | null
  status?: 'open' | 'closed' | null

  // Exit summary
  close_reason?: string | null

  created_at?: string
  updated_at?: string
}

// Weekly Review Types
export type WeeklyReviewStatus = 'pending' | 'in_progress' | 'completed'

export interface WinningTradeAnalysis {
  trade_id: string
  symbol: string
  pnl: number
  would_take_again: boolean
  // If Yes
  execution_improvement?: string
  profit_management?: string
  repeat_strategy?: string
  // If No
  plan_deviation?: string
  flawed_win_prevention?: string
  incorrect_execution?: string
}

export interface LosingTradeAnalysis {
  trade_id: string
  symbol: string
  pnl: number
  would_take_again: boolean
  // If Yes
  loss_avoidance?: string
  done_well?: string
  emotions_controlled?: string
  // If No
  plan_deviation?: string
  warning_signs?: string
  outcome_response?: string
}

export interface WeeklyReview {
  id: string
  user_id: string
  week_start: string
  week_end: string
  status: WeeklyReviewStatus

  // Week statistics
  total_trades: number
  winning_trades: number
  losing_trades: number
  total_pnl: number
  win_rate: number
  best_trade_id?: string | null
  worst_trade_id?: string | null

  // Trade analysis
  winning_trades_analysis: WinningTradeAnalysis[]
  losing_trades_analysis: LosingTradeAnalysis[]

  // Missed opportunities
  missed_trade_description?: string | null
  missed_trade_reason?: string | null
  missed_trade_prevention?: string | null

  // Overall performance
  week_vs_last_week?: string | null
  process_execution_rating?: number | null
  process_execution_notes?: string | null
  previous_week_mindset_impact?: string | null
  improvement_actions?: string | null

  // Repeating strengths
  strength_identified?: string | null
  strength_cause?: string | null
  strength_importance?: string | null
  strength_action_steps?: string | null

  // Repeating mistakes
  mistake_identified?: string | null
  mistake_cause?: string | null
  mistake_importance?: string | null
  mistake_action_steps?: string | null

  // Goals and insights
  goals_for_next_week?: string | null
  key_takeaways?: string | null

  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

// Re-export Account type with fields
export type { Account as SupabaseAccount }
export type { Trade as SupabaseTrade }
export type { WeeklyReview as SupabaseWeeklyReview }
