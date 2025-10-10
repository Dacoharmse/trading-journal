'use client'

import * as React from 'react'
import type { HourMetrics } from '@/lib/analytics-selectors'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface HourSessionHeatmapProps {
  data: Record<string, HourMetrics[]>
}

type Metric = 'winRate' | 'expectancyR' | 'netR'

export function HourSessionHeatmap({ data }: HourSessionHeatmapProps) {
  const [metric, setMetric] = React.useState<Metric>('expectancyR')

  const sessions = Object.keys(data)

  const getColorForCell = (value: number, metric: Metric) => {
    if (metric === 'winRate') {
      if (value >= 0.7) return 'bg-emerald-600 dark:bg-emerald-500'
      if (value >= 0.6) return 'bg-emerald-500 dark:bg-emerald-400'
      if (value >= 0.5) return 'bg-emerald-400 dark:bg-emerald-300'
      if (value >= 0.4) return 'bg-slate-300 dark:bg-slate-600'
      return 'bg-red-400 dark:bg-red-500'
    }

    if (metric === 'expectancyR' || metric === 'netR') {
      if (value > 0.5) return 'bg-emerald-600 dark:bg-emerald-500'
      if (value > 0.2) return 'bg-emerald-500 dark:bg-emerald-400'
      if (value > 0) return 'bg-emerald-400 dark:bg-emerald-300'
      if (value > -0.2) return 'bg-red-400 dark:bg-red-500'
      return 'bg-red-600 dark:bg-red-600'
    }

    return 'bg-slate-300 dark:bg-slate-600'
  }

  const formatValue = (value: number, metric: Metric) => {
    if (metric === 'winRate') return `${(value * 100).toFixed(0)}%`
    return value.toFixed(2)
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/60 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Hour × Session Performance
        </h2>
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="winRate">Win Rate</SelectItem>
            <SelectItem value="expectancyR">Expectancy (R)</SelectItem>
            <SelectItem value="netR">Net R</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-slate-300 p-2 text-left dark:border-slate-700">
                Session
              </th>
              {Array.from({ length: 24 }, (_, i) => (
                <th
                  key={i}
                  className="border border-slate-300 p-1 text-center dark:border-slate-700"
                >
                  {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session}>
                <td className="border border-slate-300 p-2 font-medium dark:border-slate-700">
                  {session}
                </td>
                {data[session].map((hourData) => {
                  const value = hourData[metric]
                  const hasData = hourData.n > 0

                  return (
                    <td
                      key={hourData.hour}
                      className="border border-slate-300 p-0 dark:border-slate-700"
                      title={
                        hasData
                          ? `${session} ${hourData.hour}:00 - ${formatValue(value, metric)} (n=${hourData.n})`
                          : 'No data'
                      }
                    >
                      <div
                        className={cn(
                          'flex h-8 items-center justify-center text-[10px] font-medium',
                          hasData
                            ? getColorForCell(value, metric) + ' text-white'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        )}
                      >
                        {hasData ? formatValue(value, metric) : '–'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
        Heatmap shows {metric === 'winRate' ? 'Win Rate' : metric === 'expectancyR' ? 'Expectancy (R)' : 'Net R'} by
        hour (UTC) and session. Hover for details.
      </p>
    </div>
  )
}
