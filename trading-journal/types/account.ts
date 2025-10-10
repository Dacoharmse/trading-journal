import { Trade } from './trade';

export type AccountType = 'live' | 'demo' | 'prop-firm';

export type PropFirmPhase = 'phase-1' | 'phase-2' | 'funded';

export interface PropFirmSettings {
  phase?: PropFirmPhase;
  profitTarget?: number;
  maxDrawdown?: number;
  dailyDrawdown?: number;
  status?: 'new' | 'profits' | 'drawdown';
  currentProfits?: number;
  currentDrawdown?: number;
}

export interface AccountMetrics {
  netProfit: number;
  totalFees: number;
  currentBalance: number;
  bestDay: number;
  worstDay: number;
  maxDrawdown: number;
  dailyDrawdown: number;
  profitTargetProgress?: number;
  profitTargetReached?: boolean;
  maxDrawdownBreached?: boolean;
  dailyDrawdownBreached?: boolean;
}

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  accountType: AccountType;
  currency: string;
  startingBalance: number;
  tradingPairs: string[];
  isActive: boolean;
  notes?: string;
  propFirmSettings?: PropFirmSettings;
  metrics: AccountMetrics;
}

export type AccountInput = Omit<TradingAccount, 'id' | 'metrics'>;

export type AccountUpdate = Partial<AccountInput>;

export function calculateAccountMetrics(
  account: TradingAccount | AccountInput,
  trades: Trade[],
): AccountMetrics {
  // Filter trades that belong to this account
  const accountId = 'id' in account ? account.id : undefined;
  const accountTrades = accountId
    ? trades.filter(trade => trade.account_id === accountId)
    : trades;

  const sortedTrades = [...accountTrades].sort((a, b) => {
    const aDate = new Date(a.entry_date).getTime();
    const bDate = new Date(b.entry_date).getTime();
    return aDate - bDate;
  });

  let equity = account.startingBalance;
  let peakEquity = account.startingBalance;
  let maxDrawdown = 0;

  const dailyPnL = new Map<string, number>();

  let netProfit = 0;
  let totalFees = 0;

  sortedTrades.forEach((trade) => {
    const entry = new Date(trade.entry_date);
    const dayKey = Number.isNaN(entry.getTime())
      ? 'unknown'
      : entry.toISOString().slice(0, 10);

    const tradeNet = (trade.pnl ?? 0) - (trade.fees ?? 0);
    netProfit += tradeNet;
    totalFees += trade.fees ?? 0;
    equity += tradeNet;

    if (equity > peakEquity) {
      peakEquity = equity;
    }

    const drawdown = peakEquity - equity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    const currentDaily = dailyPnL.get(dayKey) ?? 0;
    dailyPnL.set(dayKey, currentDaily + tradeNet);
  });

  const bestDay = dailyPnL.size
    ? Math.max(...dailyPnL.values())
    : 0;
  const worstDay = dailyPnL.size
    ? Math.min(...dailyPnL.values())
    : 0;

  const dailyDrawdown = Math.abs(Math.min(0, worstDay));

  const metrics: AccountMetrics = {
    netProfit: Number(netProfit.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    currentBalance: Number((account.startingBalance + netProfit).toFixed(2)),
    bestDay: Number(bestDay.toFixed(2)),
    worstDay: Number(worstDay.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    dailyDrawdown: Number(dailyDrawdown.toFixed(2)),
  };

  if (account.accountType === 'prop-firm' && account.propFirmSettings) {
    const { profitTarget, maxDrawdown: maxDdLimit, dailyDrawdown: dailyDdLimit } =
      account.propFirmSettings;

    if (profitTarget && profitTarget > 0) {
      const progress = netProfit / profitTarget;
      metrics.profitTargetProgress = Number(progress.toFixed(4));
      metrics.profitTargetReached = progress >= 1;
    }

    if (maxDdLimit && maxDdLimit > 0) {
      metrics.maxDrawdownBreached = maxDrawdown > maxDdLimit;
    }

    if (dailyDdLimit && dailyDdLimit > 0) {
      metrics.dailyDrawdownBreached = dailyDrawdown > dailyDdLimit;
    }
  }

  return metrics;
}
