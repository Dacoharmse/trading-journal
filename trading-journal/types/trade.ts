/**
 * Trading Journal Type Definitions
 * Comprehensive types for managing trades, analytics, and filtering
 */

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
 */
export type TradeType = 'long' | 'short';

/**
 * Trade status
 */
export type TradeStatus = 'open' | 'closed';

/**
 * Main Trade interface
 * Represents a single trade with all relevant data
 */
export interface Trade {
  /** Unique identifier for the trade */
  id: string;

  /** Trading symbol/ticker (e.g., AAPL, TSLA) */
  symbol: string;

  /** Account ID the trade is associated with */
  account_id?: string;

  /** Account display name */
  account_name?: string;

  /** Entry price per share/unit */
  entry_price: number;

  /** Exit price per share/unit (null if trade is still open) */
  exit_price: number | null;

  /** Number of shares/contracts traded */
  quantity: number;

  /** Type of trade - long or short */
  trade_type: TradeType;

  /** Date and time when the trade was entered */
  entry_date: Date | string;

  /** Date and time when the trade was exited (null if still open) */
  exit_date: Date | string | null;

  /** Profit and loss for the trade */
  pnl: number;

  /** Trading fees and commissions */
  fees: number;

  /** Additional notes about the trade */
  notes?: string;

  /** Tags for categorizing trades (e.g., 'breakout', 'earnings', 'momentum') */
  tags?: string[];

  /** Trading strategy used (e.g., 'scalping', 'swing trade', 'day trade') */
  strategy?: string;

  /** URL to screenshot or chart image */
  image_url?: string;

  /** ID of the user who created this trade */
  user_id: string;

  /** Broker used for this trade */
  broker?: Broker;

  /** Trade status */
  status?: TradeStatus;

  /** Reason the trade was closed */
  close_reason?: string | null;

  /** Risk/reward ratio */
  risk_reward_ratio?: number;

  /** Stop loss price */
  stop_loss?: number;

  /** Take profit price */
  take_profit?: number;

  /** Asset class (stocks, options, futures, crypto, forex) */
  asset_class?: 'stocks' | 'options' | 'futures' | 'crypto' | 'forex';

  /** Timestamp when record was created */
  created_at?: Date | string;

  /** Timestamp when record was last updated */
  updated_at?: Date | string;
}

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
