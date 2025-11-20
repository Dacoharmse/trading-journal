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

export interface Playbook {
  id: string
  user_id: string
  name: string
  description?: string | null
  category: string
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
  mistakes?: string | null

  // Attachments
  attachments?: string | null  // JSON array of screenshot URLs (legacy)
  image_url?: string | null    // Legacy single image
  media_urls?: string[]        // NEW: array of uploaded/pasted chart URLs

  // Legs (for partial entries/exits)
  legs?: unknown | null  // JSON array of leg data

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

// Re-export Account type with fields
export type { Account as SupabaseAccount }
export type { Trade as SupabaseTrade }
