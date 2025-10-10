import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trade } from "@/types";
import { cn } from "@/lib/utils";

interface RecentTradesTableProps {
  trades: Trade[];
  className?: string;
}

export function RecentTradesTable({
  trades,
  className,
}: RecentTradesTableProps) {
  // Format date to readable string
  const formatDate = (date: Date | string | null): string => {
    if (!date) return "-";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Entry Date</TableHead>
            <TableHead>Exit Date</TableHead>
            <TableHead className="text-right">P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No trades found.
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge
                    variant={trade.trade_type === "long" ? "default" : "outline"}
                  >
                    {trade.trade_type}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(trade.entry_date)}</TableCell>
                <TableCell>
                  {trade.exit_date ? (
                    formatDate(trade.exit_date)
                  ) : (
                    <Badge variant="secondary">Open</Badge>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(trade.pnl)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
