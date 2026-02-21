'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types/supabase'
import { TradeAnalysisFilters } from '@/components/trade-analysis/TradeAnalysisFilters'
import { TradeAnalysisChart } from '@/components/trade-analysis/TradeAnalysisChart'
import { TradeAnalysisStats } from '@/components/trade-analysis/TradeAnalysisStats'
import { TradeAnalysisTable } from '@/components/trade-analysis/TradeAnalysisTable'

export interface AnalysisFilters {
  dateFrom: string
  dateTo: string
  symbols: string[]
  direction: 'all' | 'long' | 'short'
  session: string[]
  sessionHour: string[]
  minR: number | null
  maxR: number | null
  minPnl: number | null
  maxPnl: number | null
  outcome: 'all' | 'win' | 'loss'
  strategy: string[]
  playbook: string[]
  emotionalState: string[]
  tags: string[]
  setupGrade: string[]
  confluences: string[]
  rules: string[]
  accounts: string[]
}

export default function TradeAnalysisPage() {
  const [loading, setLoading] = React.useState(true)
  const [allTrades, setAllTrades] = React.useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = React.useState<Trade[]>([])

  const [filters, setFilters] = React.useState<AnalysisFilters>({
    dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    symbols: [],
    direction: 'all',
    session: [],
    sessionHour: [],
    minR: null,
    maxR: null,
    minPnl: null,
    maxPnl: null,
    outcome: 'all',
    strategy: [],
    playbook: [],
    emotionalState: [],
    tags: [],
    setupGrade: [],
    confluences: [],
    rules: [],
    accounts: [],
  })

  // Load all trades
  React.useEffect(() => {
    let cancelled = false

    const loadTrades = async () => {
      console.log('[Trade Analysis] Starting to load trades...')

      try {
        const supabase = createClient()
        console.log('[Trade Analysis] Getting user...')

        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          if (!cancelled) {
            setLoading(false)
            setAllTrades([])
          }
          return
        }

        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', session.user.id)
          .order('exit_date', { ascending: true, nullsFirst: false })

        if (error) {
          console.error('[Trade Analysis] Trades error:', error)
          if (!cancelled) {
            setLoading(false)
            setAllTrades([])
          }
          return
        }

        console.log('[Trade Analysis] Loaded', data?.length || 0, 'trades')

        if (!cancelled) {
          setAllTrades((data as Trade[]) || [])
          setLoading(false)
        }
      } catch (error) {
        console.error('[Trade Analysis] Exception:', error)
        if (!cancelled) {
          setLoading(false)
          setAllTrades([])
        }
      }
    }

    loadTrades()

    return () => {
      cancelled = true
    }
  }, [])

  // Apply filters
  React.useEffect(() => {
    let filtered = allTrades.filter(trade => {
      // Only include closed trades with a date (use closed_at or exit_date)
      const closedDate = trade.closed_at || trade.exit_date
      if (!closedDate) return false

      const tradeDate = new Date(closedDate).toISOString().split('T')[0]

      // Date range
      if (filters.dateFrom && tradeDate < filters.dateFrom) return false
      if (filters.dateTo && tradeDate > filters.dateTo) return false

      // Symbols
      if (filters.symbols.length > 0 && !filters.symbols.includes(trade.symbol)) return false

      // Direction
      if (filters.direction !== 'all' && trade.direction !== filters.direction) return false

      // Session
      if (filters.session.length > 0 && (!trade.session || !filters.session.includes(trade.session))) return false

      // Session Hour
      if (filters.sessionHour.length > 0 && (!trade.session_hour || !filters.sessionHour.includes(trade.session_hour))) return false

      // R range
      if (filters.minR !== null && (trade.r_multiple === null || trade.r_multiple < filters.minR)) return false
      if (filters.maxR !== null && (trade.r_multiple === null || trade.r_multiple > filters.maxR)) return false

      // PnL range
      if (filters.minPnl !== null && trade.pnl < filters.minPnl) return false
      if (filters.maxPnl !== null && trade.pnl > filters.maxPnl) return false

      // Outcome
      if (filters.outcome !== 'all') {
        const isWin = trade.pnl > 0
        if (filters.outcome === 'win' && !isWin) return false
        if (filters.outcome === 'loss' && isWin) return false
      }

      // Strategy
      if (filters.strategy.length > 0 && (!trade.strategy || !filters.strategy.includes(trade.strategy))) return false

      // Playbook
      if (filters.playbook.length > 0 && (!trade.playbook_id || !filters.playbook.includes(trade.playbook_id))) return false

      // Emotional State
      if (filters.emotionalState.length > 0 && (!trade.emotional_state || !filters.emotionalState.includes(trade.emotional_state))) return false

      // Tags
      if (filters.tags.length > 0) {
        const tradeTags = trade.tags
          ? Array.isArray(trade.tags) ? trade.tags : trade.tags.split(',').map((s: string) => s.trim())
          : []
        const hasTag = filters.tags.some(tag => tradeTags.includes(tag))
        if (!hasTag) return false
      }

      // Setup Grade
      if (filters.setupGrade.length > 0 && (!trade.setup_grade || !filters.setupGrade.includes(trade.setup_grade))) return false

      // Confluences
      if (filters.confluences.length > 0) {
        const tradeConfluences = trade.confluences ? trade.confluences.split(',').map(c => c.trim()) : []
        const hasConfluence = filters.confluences.some(conf => tradeConfluences.includes(conf))
        if (!hasConfluence) return false
      }

      // Rules
      if (filters.rules.length > 0) {
        const tradeRules = trade.rules_followed ? trade.rules_followed.split(',').map(r => r.trim()) : []
        const hasRule = filters.rules.some(rule => tradeRules.includes(rule))
        if (!hasRule) return false
      }

      // Accounts
      if (filters.accounts.length > 0 && (!trade.account_id || !filters.accounts.includes(trade.account_id))) return false

      return true
    })

    setFilteredTrades(filtered)
  }, [allTrades, filters])

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Trade Analysis
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Deep dive into your trading edge with advanced filtering and visualization
            </p>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Showing <span className="font-semibold text-neutral-900 dark:text-white">{filteredTrades.length}</span> of{' '}
            <span className="font-semibold">{allTrades.length}</span> trades
          </div>
        </div>

        {/* Filters */}
        <TradeAnalysisFilters
          filters={filters}
          onFiltersChange={setFilters}
          allTrades={allTrades}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 dark:border-white mx-auto mb-4"></div>
              <p className="text-neutral-600 dark:text-neutral-400">Loading trades...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <TradeAnalysisStats trades={filteredTrades} />

            {/* Cumulative P&L Chart */}
            <TradeAnalysisChart trades={filteredTrades} />

            {/* Filtered Trades Table */}
            <TradeAnalysisTable trades={filteredTrades} />
          </>
        )}
      </div>
    </div>
  )
}
