/**
 * User Type Definitions
 * Types for user authentication, profiles, and settings
 */

import { Broker } from './trade';

/**
 * User subscription tier
 */
export type SubscriptionTier = 'free' | 'premium' | 'professional' | 'enterprise';

/**
 * User account status
 */
export type AccountStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

/**
 * Trading experience level
 */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

/**
 * User preferences for the trading journal
 */
export interface UserPreferences {
  /** Default broker for new trades */
  default_broker?: Broker;

  /** Preferred currency for display */
  currency?: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';

  /** Email notifications enabled */
  email_notifications?: boolean;

  /** Daily performance summary email */
  daily_summary_email?: boolean;

  /** Weekly performance report email */
  weekly_report_email?: boolean;

  /** Timezone for date/time display */
  timezone?: string;

  /** Default chart type for trade analysis */
  default_chart_type?: 'candlestick' | 'line' | 'bar';

  /** Number of items per page in lists */
  items_per_page?: number;

  /** Default date range for analytics */
  default_date_range?: '7d' | '30d' | '90d' | '1y' | 'all';

  /** Show P&L in percentage */
  show_pnl_percentage?: boolean;

  /** Risk management settings */
  max_risk_per_trade?: number;
  max_daily_loss?: number;
  max_position_size?: number;

  /** Trading confluences */
  confluences?: string[];

  /** Alert notifications */
  profit_target_alerts?: boolean;
  drawdown_warnings?: boolean;
  daily_loss_alerts?: boolean;
  trade_reminders?: boolean;

  /** Achievement notifications */
  winning_streak_notifications?: boolean;
  personal_best_notifications?: boolean;
  milestone_notifications?: boolean;
}

/**
 * User profile information
 */
export interface UserProfile {
  /** Full name */
  full_name?: string;

  /** Avatar image URL */
  avatar_url?: string;

  /** Bio or description */
  bio?: string;

  /** Trading experience level */
  experience_level?: ExperienceLevel;

  /** Years of trading experience */
  years_of_experience?: number;

  /** Primary trading style */
  trading_style?: 'day_trading' | 'swing_trading' | 'scalping' | 'position_trading' | 'mixed';

  /** Preferred markets */
  preferred_markets?: Array<'stocks' | 'options' | 'futures' | 'crypto' | 'forex'>;

  /** Country */
  country?: string;

  /** Phone number */
  phone?: string;

  /** LinkedIn profile URL */
  linkedin_url?: string;

  /** Twitter/X handle */
  twitter_handle?: string;
}

/**
 * Main User interface
 * Represents a user account in the trading journal system
 */
export interface User {
  /** Unique identifier for the user */
  id: string;

  /** Email address (unique) */
  email: string;

  /** Hashed password (never exposed to client) */
  password_hash?: string;

  /** User profile information */
  profile?: UserProfile;

  /** User preferences */
  preferences?: UserPreferences;

  /** Subscription tier */
  subscription_tier: SubscriptionTier;

  /** Account status */
  status: AccountStatus;

  /** Email verification status */
  email_verified: boolean;

  /** Account creation timestamp */
  created_at: Date | string;

  /** Last update timestamp */
  updated_at: Date | string;

  /** Last login timestamp */
  last_login_at?: Date | string;

  /** User's default broker(s) */
  brokers?: Broker[];

  /** Total number of trades */
  total_trades?: number;

  /** Account value/balance */
  account_balance?: number;

  /** Starting account balance */
  starting_balance?: number;

  /** Two-factor authentication enabled */
  two_factor_enabled?: boolean;

  /** API access enabled */
  api_access_enabled?: boolean;

  /** Referral code */
  referral_code?: string;

  /** Referred by user ID */
  referred_by?: string;
}

/**
 * User registration input
 */
export interface UserRegistration {
  email: string;
  password: string;
  full_name?: string;
  referral_code?: string;
}

/**
 * User login credentials
 */
export interface UserLogin {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * User update input (excludes sensitive fields)
 */
export type UserUpdate = Partial<
  Omit<User, 'id' | 'password_hash' | 'created_at' | 'updated_at' | 'email'>
>;

/**
 * Public user data (safe to expose)
 */
export type PublicUser = Pick<
  User,
  'id' | 'email' | 'profile' | 'subscription_tier' | 'created_at'
>;

/**
 * Authentication session
 */
export interface AuthSession {
  user_id: string;
  token: string;
  expires_at: Date | string;
  created_at: Date | string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordReset {
  token: string;
  new_password: string;
}

/**
 * Email verification
 */
export interface EmailVerification {
  token: string;
  user_id: string;
}
