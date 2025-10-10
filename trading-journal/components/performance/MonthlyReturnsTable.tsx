'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { MonthlyPerformance } from '@/lib/performance-calculator'
import { format } from 'date-fns'

interface MonthlyReturnsTableProps {
  data: MonthlyPerformance[]
}

export function MonthlyReturnsTable({ data }: MonthlyReturnsTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Returns</CardTitle>
          <CardDescription>Performance breakdown by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return format(date, 'MMM yyyy')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Returns</CardTitle>
        <CardDescription>Performance breakdown by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 pr-4 text-left font-medium">Month</th>
                <th className="pb-2 pr-4 text-right font-medium">Trades</th>
                <th className="pb-2 pr-4 text-right font-medium">P&L (R)</th>
                <th className="pb-2 pr-4 text-right font-medium">Win Rate</th>
                <th className="pb-2 pr-4 text-right font-medium">PF</th>
                <th className="pb-2 text-right font-medium">Avg R</th>
              </tr>
            </thead>
            <tbody>
              {data.map((month) => (
                <tr key={month.month} className="border-b border-border/50">
                  <td className="py-2 pr-4">{formatMonth(month.month)}</td>
                  <td className="py-2 pr-4 text-right">{month.trades}</td>
                  <td
                    className={`py-2 pr-4 text-right font-medium ${
                      month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {month.profit >= 0 ? '+' : ''}
                    {month.profit.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 text-right">{month.winRate.toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-right">{month.profitFactor.toFixed(2)}</td>
                  <td
                    className={`py-2 text-right font-medium ${
                      month.avgR >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {month.avgR >= 0 ? '+' : ''}
                    {month.avgR.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
