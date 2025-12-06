/**
 * Trading Journal Type Definitions
 *
 * DEPRECATION NOTICE:
 * The Trade interface in this file is deprecated.
 * Please use Trade from '@/types/supabase' instead.
 *
 * This file maintains backward compatibility by re-exporting from supabase.ts
 * and providing additional helper types for trade statistics and filtering.
 */

// Re-export the correct Trade type from supabase
export type { Trade } from './supabase'

/**
 * Enum for common trading brokers
 */
export enum Broker {
  TD_AMERITRADE = 'TD Ameritrade',
  INTERACTIVE_BROKERS = 'Interactive Brokers',
  CHARLES_SCHWAB = 'Charles Schwab',
  E_TRADE = 'E*TRADE',
  FIDELITY = 'Fidelity',
  ROBINHOOD = 'Robinhood',
  WEBULL = 'Webull',
  TASTYTRADE = 'tastytrade',
  TRADESTATION = 'TradeStation',
  THINKORSWIM = 'thinkorswim',
  XM = 'XM',
  EXNESS = 'Exness',
  OTHER = 'Other',
}

/**
 * Trade type - long or short position
 * @deprecated Use 'direction' field from Trade interface instead
 */
export type TradeType = 'long' | 'short';

/**
 * Trade status
 */
export type TradeStatus = 'open' | 'closed';

/**
 * TradeStats interface
 * Aggregated statistics and analytics for trading performance
 */
export interface TradeStats {
  /** Total number of trades */
  total_trades: number;

  /** Win rate as a percentage (0-100) */
  win_rate: number;

  /** Total profit and loss across all trades */
  total_pnl: number;

  /** Average profit from winning trades */
  avg_win: number;

  /** Average loss from losing trades */
  avg_loss: number;

  /** Profit factor (gross profit / gross loss) */
  profit_factor: number;

  /** Best single day profit */
  best_day: number;

  /** Worst single day loss */
  worst_day: number;

  /** Number of winning trades */
  winning_trades?: number;

  /** Number of losing trades */
  losing_trades?: number;

  /** Largest winning trade */
  largest_win?: number;

  /** Largest losing trade */
  largest_loss?: number;

  /** Average trade duration (in hours) */
  avg_trade_duration?: number;

  /** Sharpe ratio */
  sharpe_ratio?: number;

  /** Maximum drawdown */
  max_drawdown?: number;

  /** Average risk/reward ratio */
  avg_risk_reward?: number;

  /** Total fees paid */
  total_fees?: number;

  /** Net profit (total_pnl - total_fees) */
  net_profit?: number;

  /** Return on investment percentage */
  roi_percentage?: number;
}

/**
 * TradeFilter interface
 * Criteria for filtering and searching trades
 */
export interface TradeFilter {
  /** Filter by specific symbol(s) */
  symbol?: string | string[];

  /** Filter by trade type */
  trade_type?: TradeType;

  /** Filter by trade status */
  status?: TradeStatus;

  /** Filter by broker */
  broker?: Broker | Broker[];

  /** Filter by strategy */
  strategy?: string | string[];

  /** Filter by tags */
  tags?: string | string[];

  /** Filter by asset class */
  asset_class?: 'stocks' | 'options' | 'futures' | 'crypto' | 'forex';

  /** Filter trades entered after this date */
  entry_date_from?: Date | string;

  /** Filter trades entered before this date */
  entry_date_to?: Date | string;

  /** Filter trades exited after this date */
  exit_date_from?: Date | string;

  /** Filter trades exited before this date */
  exit_date_to?: Date | string;

  /** Filter by minimum PnL */
  min_pnl?: number;

  /** Filter by maximum PnL */
  max_pnl?: number;

  /** Filter by minimum quantity */
  min_quantity?: number;

  /** Filter by maximum quantity */
  max_quantity?: number;

  /** Filter by user ID */
  user_id?: string;

  /** Text search in notes */
  search_text?: string;

  /** Sort field */
  sort_by?: 'entry_date' | 'exit_date' | 'pnl' | 'symbol' | 'quantity';

  /** Sort order */
  sort_order?: 'asc' | 'desc';

  /** Page number for pagination */
  page?: number;

  /** Number of items per page */
  limit?: number;
}

/**
 * Trade creation input (omits auto-generated fields)
 */
export type TradeInput = Omit<Trade, 'id' | 'created_at' | 'updated_at'>;

/**
 * Trade update input (all fields optional except id)
 */
export type TradeUpdate = Partial<Omit<Trade, 'id' | 'user_id'>> & { id: string };

/**
 * Daily trading performance summary
 */
export interface DailyStats {
  date: Date | string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
  win_rate: number;
}

/**
 * Performance by symbol
 */
export interface SymbolPerformance {
  symbol: string;
  trades: number;
  total_pnl: number;
  win_rate: number;
  avg_pnl: number;
}

/**
 * Performance by strategy
 */
export interface StrategyPerformance {
  strategy: string;
  trades: number;
  total_pnl: number;
  win_rate: number;
  avg_pnl: number;
}
