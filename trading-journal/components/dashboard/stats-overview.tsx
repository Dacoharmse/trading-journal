import { StatsCard } from "./stats-card";
import { TradeStats } from "@/types";
import { DollarSign, TrendingUp, BarChart3, Target } from "lucide-react";

interface StatsOverviewProps {
  stats: TradeStats;
  className?: string;
}

export function StatsOverview({ stats, className }: StatsOverviewProps) {
  // Format currency values
  const formatCurrency = (value: number): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format percentage values
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Format profit factor
  const formatProfitFactor = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Trades"
          value={stats.total_trades}
          description={`${stats.winning_trades || 0} wins, ${stats.losing_trades || 0} losses`}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatsCard
          title="Win Rate"
          value={formatPercentage(stats.win_rate)}
          description="Percentage of winning trades"
          icon={<Target className="h-4 w-4" />}
          trend={
            stats.win_rate >= 50
              ? { value: stats.win_rate - 50, isPositive: true }
              : undefined
          }
        />
        <StatsCard
          title="Total P&L"
          value={formatCurrency(stats.total_pnl)}
          description={`Best: ${formatCurrency(stats.best_day)} | Worst: ${formatCurrency(stats.worst_day)}`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={
            stats.total_pnl !== 0
              ? {
                  value: Math.abs(
                    (stats.total_pnl / (stats.total_trades || 1)) * 100
                  ),
                  isPositive: stats.total_pnl > 0,
                }
              : undefined
          }
        />
        <StatsCard
          title="Profit Factor"
          value={formatProfitFactor(stats.profit_factor)}
          description={`Avg Win: ${formatCurrency(stats.avg_win)} | Avg Loss: ${formatCurrency(stats.avg_loss)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={
            stats.profit_factor > 1
              ? {
                  value: (stats.profit_factor - 1) * 100,
                  isPositive: true,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
