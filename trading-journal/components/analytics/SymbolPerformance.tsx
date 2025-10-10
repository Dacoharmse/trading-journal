'use client'

import * as React from 'react'
import type { SymbolMetrics } from '@/lib/analytics-selectors'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowUpDown } from 'lucide-react'

interface SymbolPerformanceProps {
  data: SymbolMetrics[]
  displayCurrency?: string
}

type SortKey = 'symbol' | 'n' | 'winRate' | 'avgR' | 'expectancyR' | 'netR'

export function SymbolPerformance({ data, displayCurrency }: SymbolPerformanceProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('netR')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      const aNum = Number(aVal)
      const bNum = Number(bVal)
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [data, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortButton = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 font-medium hover:text-slate-900 dark:hover:text-slate-50"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <div className="space-y-4 rounded-lg border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/60 dark:bg-slate-900/60">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        Symbol Performance
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="p-2 text-left text-slate-600 dark:text-slate-300">
                <SortButton label="Symbol" sortKey="symbol" />
              </th>
              <th className="p-2 text-right text-slate-600 dark:text-slate-300">
                <SortButton label="Trades" sortKey="n" />
              </th>
              <th className="p-2 text-right text-slate-600 dark:text-slate-300">
                <SortButton label="Win %" sortKey="winRate" />
              </th>
              <th className="p-2 text-right text-slate-600 dark:text-slate-300">
                <SortButton label="Avg R" sortKey="avgR" />
              </th>
              <th className="p-2 text-right text-slate-600 dark:text-slate-300">
                <SortButton label="Expectancy" sortKey="expectancyR" />
              </th>
              <th className="p-2 text-right text-slate-600 dark:text-slate-300">
                <SortButton label="Net R" sortKey="netR" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr
                key={item.symbol}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td className="p-2 font-medium text-slate-900 dark:text-slate-50">
                  {item.symbol}
                </td>
                <td className="p-2 text-right text-slate-700 dark:text-slate-200">
                  <Badge variant="secondary" className="text-xs">
                    {item.n}
                  </Badge>
                </td>
                <td className="p-2 text-right text-slate-700 dark:text-slate-200">
                  {((item.winRate ?? 0) * 100).toFixed(1)}%
                </td>
                <td className="p-2 text-right text-slate-700 dark:text-slate-200">
                  {(item.avgR ?? 0).toFixed(2)}R
                </td>
                <td
                  className={cn(
                    'p-2 text-right font-semibold',
                    (item.expectancyR ?? 0) > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  )}
                >
                  {(item.expectancyR ?? 0) > 0 ? '+' : ''}
                  {(item.expectancyR ?? 0).toFixed(3)}R
                </td>
                <td
                  className={cn(
                    'p-2 text-right font-semibold',
                    (item.netR ?? 0) > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  )}
                >
                  {(item.netR ?? 0) > 0 ? '+' : ''}
                  {(item.netR ?? 0).toFixed(2)}R
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
        Showing {sortedData.length} symbols. Click column headers to sort.
        {displayCurrency && ` Display currency: ${displayCurrency}`}
      </p>
    </div>
  )
}
