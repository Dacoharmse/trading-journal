"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trade } from "@/types/trade"

interface RecentTradesTableProps {
  trades: Trade[]
}

export function RecentTradesTable({ trades }: RecentTradesTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  }

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No trades found. Start by adding your first trade.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Entry Date</TableHead>
          <TableHead>Entry Price</TableHead>
          <TableHead>Exit Price</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>P&L</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell className="font-medium">{trade.symbol}</TableCell>
            <TableCell className="text-muted-foreground">
              {trade.account_name || '—'}
            </TableCell>
            <TableCell>
              <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                {trade.trade_type.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(trade.entry_date)}
            </TableCell>
            <TableCell>{formatCurrency(trade.entry_price)}</TableCell>
            <TableCell>
              {trade.exit_price ? formatCurrency(trade.exit_price) : '-'}
            </TableCell>
            <TableCell>{trade.quantity}</TableCell>
            <TableCell>
              <span className={trade.pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {formatCurrency(trade.pnl)}
              </span>
            </TableCell>
            <TableCell>
              <Badge
                variant={trade.status === 'closed' ? 'outline' : 'default'}
              >
                {trade.status || 'closed'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
