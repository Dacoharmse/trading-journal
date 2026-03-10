'use client'

import { useEffect, useState } from 'react'

export default function DebugTradesPage() {
  const [apiResult, setApiResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/trades?limit=100&offset=0')
      .then(r => r.json())
      .then(data => setApiResult(data))
      .catch(err => setApiResult({ error: String(err) }))
  }, [])

  const trades: any[] = apiResult?.trades || []

  // Simulate my filter
  const openTrades = trades.filter((t: any) => !t.exit_date)
  const closedTrades = trades.filter((t: any) => !!t.exit_date)

  return (
    <div className="p-8 space-y-6 font-mono text-sm">
      <h1 className="text-xl font-bold">Trade Debug</h1>

      <div>
        <h2 className="font-semibold mb-2">Summary: {trades.length} total | {openTrades.length} open | {closedTrades.length} closed</h2>
      </div>

      <div>
        <h2 className="font-semibold mb-2">All trades (exit_date / status / outcome):</h2>
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="bg-neutral-800 text-white">
              <th className="px-2 py-1 text-left">entry_date</th>
              <th className="px-2 py-1 text-left">exit_date</th>
              <th className="px-2 py-1 text-left">status</th>
              <th className="px-2 py-1 text-left">outcome</th>
              <th className="px-2 py-1 text-left">symbol</th>
              <th className="px-2 py-1 text-left">pnl</th>
              <th className="px-2 py-1 text-left">open?</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t: any, i: number) => (
              <tr key={i} className={!t.exit_date ? 'bg-blue-950' : ''}>
                <td className="px-2 py-1">{t.entry_date || 'NULL'}</td>
                <td className="px-2 py-1">{t.exit_date ?? 'NULL'}</td>
                <td className="px-2 py-1">{t.status ?? 'NULL'}</td>
                <td className="px-2 py-1">{t.outcome ?? 'NULL'}</td>
                <td className="px-2 py-1">{t.symbol}</td>
                <td className="px-2 py-1">{t.pnl}</td>
                <td className="px-2 py-1">{!t.exit_date ? '✅ YES' : '❌ no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Raw API response:</h2>
        <pre className="bg-neutral-900 text-white p-4 rounded text-xs overflow-auto max-h-64">
          {JSON.stringify(apiResult, null, 2)}
        </pre>
      </div>
    </div>
  )
}
