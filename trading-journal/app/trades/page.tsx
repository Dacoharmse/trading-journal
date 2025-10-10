'use client'

import React, { Suspense } from 'react'
import { useShallow } from 'zustand/shallow'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDashboardFilters, computeDateRange } from '@/stores/dashboard-filters'
import { useTradesFilters } from '@/stores/trades-filters'
import type { Trade, Account, Playbook } from '@/types/supabase'
import { TradesToolbar } from '@/components/trades/TradesToolbar'
import { TradesTable } from '@/components/trades/TradesTable'
import { TradeDrawer } from '@/components/trades/TradeDrawer'
import { NewTradeSheet } from '@/components/trades/NewTradeSheet'
import { BulkEditModal, type BulkEditUpdates } from '@/components/trades/BulkEditModal'
import { ColumnPicker } from '@/components/trades/ColumnPicker'
import { ExportMenu } from '@/components/trades/ExportMenu'
import { removeOutliers, getTradeResult } from '@/lib/trades-selectors'
import { convertPnL } from '@/lib/fx-converter'

type PlaybookSummary = Pick<Playbook, 'id' | 'name' | 'category' | 'active'>

function TradesPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  // State
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [playbooks, setPlaybooks] = React.useState<PlaybookSummary[]>([])
  const [userId, setUserId] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Modal states
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const [editingTrade, setEditingTrade] = React.useState<Trade | null>(null)
  const [tradeSheetOpen, setTradeSheetOpen] = React.useState(false)
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false)
  const [columnPickerOpen, setColumnPickerOpen] = React.useState(false)
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false)

  // Check for ?new=true query parameter
  React.useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setTradeSheetOpen(true)
      // Remove the query parameter from URL
      router.replace('/trades', { scroll: false })
    }
  }, [searchParams, router])

  // Dashboard Filters - use shallow equality for primitive values
  const {
    accountId,
    session,
    excludeOutliers,
    units,
    baseCurrency,
    symbols,
    strategies,
  } = useDashboardFilters(
    useShallow((state) => ({
      accountId: state.filters.accountId,
      session: state.filters.session,
      excludeOutliers: state.filters.excludeOutliers,
      units: state.filters.units,
      baseCurrency: state.filters.baseCurrency,
      symbols: state.filters.symbols,
      strategies: state.filters.strategies,
    }))
  )

  // Trades Filters - use shallow equality
  const {
    direction,
    result,
    searchQuery,
    sortColumn,
    sortDirection,
    visibleColumns,
    selectedTradeIds,
  } = useTradesFilters(
    useShallow((state) => ({
      direction: state.filters.direction,
      result: state.filters.result,
      searchQuery: state.filters.searchQuery,
      sortColumn: state.filters.sortColumn,
      sortDirection: state.filters.sortDirection,
      visibleColumns: state.filters.visibleColumns,
      selectedTradeIds: state.filters.selectedTradeIds,
    }))
  )

  const { clearSelection } = useTradesFilters()

  // Convert arrays to Sets for component usage
  const visibleColumnsSet = React.useMemo(
    () => new Set(visibleColumns),
    [visibleColumns]
  )

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      setUserId(userData.user?.id ?? '')

      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('name')

      if (accountsError) throw accountsError
      setAccounts(accountsData || [])

      // Fetch playbooks (for lookup)
      const { data: playbooksData, error: playbooksError } = await supabase
        .from('playbooks')
        .select('id, name, category, active')
        .order('name')

      if (playbooksError) throw playbooksError
      setPlaybooks((playbooksData as PlaybookSummary[] | null) ?? [])

      // Fetch trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .order('exit_date', { ascending: false })

      if (tradesError) throw tradesError
      setTrades(tradesData || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute date range
  const { dateRange: dateRangePreset, customStartDate, customEndDate } = useDashboardFilters(
    useShallow((state) => ({
      dateRange: state.filters.dateRange,
      customStartDate: state.filters.customStartDate,
      customEndDate: state.filters.customEndDate,
    }))
  )

  const dateRange = React.useMemo(
    () => computeDateRange(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate]
  )

  const playbookMap = React.useMemo(() => {
    const map = new Map<string, PlaybookSummary>()
    playbooks.forEach((pb) => {
      map.set(pb.id, pb)
    })
    return map
  }, [playbooks])

  // Filter trades
  const filteredTrades = React.useMemo(() => {
    let filtered = trades

    // Date range
    filtered = filtered.filter((trade) => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date || '')
      return tradeDate >= dateRange.start && tradeDate <= dateRange.end
    })

    // Account
    if (accountId !== 'all') {
      filtered = filtered.filter((trade) => trade.account_id === accountId)
    }

    // Symbols
    if (symbols.length > 0) {
      filtered = filtered.filter((trade) => symbols.includes(trade.symbol))
    }

    // Strategies
    if (strategies.length > 0) {
      filtered = filtered.filter((trade) =>
        trade.strategy ? strategies.includes(trade.strategy) : false
      )
    }

    // Session
    if (session !== 'all') {
      filtered = filtered.filter((trade) => trade.session === session)
    }

    // Direction
    if (direction !== 'all') {
      filtered = filtered.filter((trade) => trade.direction === direction)
    }

    // Result
    if (result !== 'all') {
      filtered = filtered.filter((trade) => getTradeResult(trade) === result)
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((trade) =>
        trade.symbol?.toLowerCase().includes(query) ||
        trade.notes?.toLowerCase().includes(query) ||
        trade.strategy?.toLowerCase().includes(query) ||
        trade.tags?.toLowerCase().includes(query)
      )
    }

    // Exclude outliers
    if (excludeOutliers) {
      filtered = removeOutliers(filtered)
    }

    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        if (sortColumn === 'playbook') {
          const aName = a.playbook_id ? playbookMap.get(a.playbook_id)?.name ?? '' : ''
          const bName = b.playbook_id ? playbookMap.get(b.playbook_id)?.name ?? '' : ''
          const comparison = aName.localeCompare(bName)
          return sortDirection === 'asc' ? comparison : -comparison
        }

        const aValue = a[sortColumn as keyof Trade]
        const bValue = b[sortColumn as keyof Trade]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [
    trades,
    dateRange,
    accountId,
    symbols,
    strategies,
    session,
    excludeOutliers,
    direction,
    result,
    searchQuery,
    playbookMap,
    sortColumn,
    sortDirection,
  ])

  // Normalize trades for display (convert to common currency or R)
  const normalizedTrades = React.useMemo(() => {
    return filteredTrades.map((trade) => {
      const tradeAccount = accounts.find((a) => a.id === trade.account_id)
      const tradeCurrency = tradeAccount?.currency || trade.currency || 'USD'

      let pnlDisplay: number = trade.pnl
      let displayCurrency: string = tradeCurrency

      if (units === 'currency' && accountId === 'all') {
        // Convert to base currency
        pnlDisplay = convertPnL(
          trade.pnl,
          tradeCurrency,
          baseCurrency,
          trade.exit_date || trade.entry_date
        )
        displayCurrency = baseCurrency
      }

      return {
        ...trade,
        pnlDisplay,
        displayCurrency,
        originalCurrency: tradeCurrency,
      } as Trade
    })
  }, [filteredTrades, units, accountId, baseCurrency, accounts])

  // Get unique values for filters
  const availableSymbols = React.useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.symbol).filter((s): s is string => Boolean(s)))).sort()
  }, [trades])

  const availableStrategies = React.useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.strategy).filter((s): s is string => Boolean(s)))).sort()
  }, [trades])

  // Handlers
  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade)
    setDrawerOpen(true)
  }

  const handleNewTrade = () => {
    setEditingTrade(null)
    setTradeSheetOpen(true)
  }

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade)
    setTradeSheetOpen(true)
    setDrawerOpen(false)
  }

  const handleDuplicateTrade = (trade: Trade) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...tradeData } = trade
    const duplicated: Partial<Trade> = {
      ...tradeData,
      entry_date: new Date().toISOString().split('T')[0],
      exit_date: null,
    }
    setEditingTrade(duplicated as Trade)
    setTradeSheetOpen(true)
    setDrawerOpen(false)
  }

  const handleSaveTrade = async (tradeData: Partial<Trade>) => {
    try {
      if (tradeData.id) {
        // Update existing trade
        const { error } = await supabase
          .from('trades')
          .update(tradeData)
          .eq('id', tradeData.id)

        if (error) throw error
      } else {
        // Insert new trade
        const { error } = await supabase
          .from('trades')
          .insert([tradeData])

        if (error) throw error
      }

      await fetchData()
      setTradeSheetOpen(false)
      setEditingTrade(null)
    } catch (err) {
      console.error('Error saving trade:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      alert(`Error saving trade: ${errorMessage}`)
    }
  }

  const handleDeleteTrade = async (trade: Trade) => {
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', trade.id)

      if (error) throw error

      await fetchData()
      setDrawerOpen(false)
      setSelectedTrade(null)
    } catch (err) {
      console.error('Error deleting trade:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      alert(`Error deleting trade: ${errorMessage}`)
    }
  }

  const handleBulkEdit = async (updates: BulkEditUpdates) => {
    try {
      const selectedIds = selectedTradeIds

      for (const tradeId of selectedIds) {
        const trade = trades.find((t) => t.id === tradeId)
        if (!trade) continue

        const updatedTrade: Partial<Trade> = { id: tradeId }

        // Handle tags
        if (updates.addTags || updates.removeTags) {
          const currentTags = trade.tags ? trade.tags.split(',').map(t => t.trim()) : []
          let newTags = [...currentTags]

          if (updates.addTags) {
            newTags = [...newTags, ...updates.addTags]
          }

          if (updates.removeTags) {
            newTags = newTags.filter(t => !updates.removeTags!.includes(t))
          }

          updatedTrade.tags = Array.from(new Set(newTags)).join(', ')
        }

        // Handle confluences
        if (updates.addConfluences || updates.removeConfluences) {
          const currentConfluences = trade.confluences ? trade.confluences.split(',').map(c => c.trim()) : []
          let newConfluences = [...currentConfluences]

          if (updates.addConfluences) {
            newConfluences = [...newConfluences, ...updates.addConfluences]
          }

          if (updates.removeConfluences) {
            newConfluences = newConfluences.filter(c => !updates.removeConfluences!.includes(c))
          }

          updatedTrade.confluences = Array.from(new Set(newConfluences)).join(', ')
        }

        // Handle strategy
        if (updates.setStrategy) {
          updatedTrade.strategy = updates.setStrategy
        }

        // Handle session
        if (updates.setSession !== undefined) {
          updatedTrade.session = updates.setSession
        }

        // Handle rule breaks
        if (updates.setRuleBreaks) {
          const currentRuleBreaks = trade.rule_breaks ? trade.rule_breaks.split(',').map(r => r.trim()) : []
          const newRuleBreaks = Array.from(new Set([...currentRuleBreaks, ...updates.setRuleBreaks]))
          updatedTrade.rule_breaks = newRuleBreaks.join(', ')
        }

        const { error } = await supabase
          .from('trades')
          .update(updatedTrade)
          .eq('id', tradeId)

        if (error) throw error
      }

      await fetchData()
      setBulkEditOpen(false)
      clearSelection()
    } catch (err) {
      console.error('Error bulk editing trades:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      alert(`Error bulk editing trades: ${errorMessage}`)
    }
  }

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const displayCurrency =
    accountId === 'all' ? baseCurrency : selectedAccount?.currency

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading trades...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Toolbar */}
      <TradesToolbar
        accounts={accounts}
        availableSymbols={availableSymbols}
        availableStrategies={availableStrategies}
        selectedCount={selectedTradeIds.length}
        onOpenTradeForm={handleNewTrade}
        onBulkEdit={() => setBulkEditOpen(true)}
        onExport={() => setExportMenuOpen(true)}
        onColumnPicker={() => setColumnPickerOpen(true)}
      />

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <TradesTable
          trades={normalizedTrades}
          accounts={accounts}
          playbooks={playbooks}
          visibleColumns={visibleColumnsSet}
          units={units}
          displayCurrency={displayCurrency}
          onTradeClick={handleTradeClick}
        />
      </div>

      {/* Modals & Drawers */}
      <TradeDrawer
        open={drawerOpen}
        trade={selectedTrade}
        account={accounts.find((a) => a.id === selectedTrade?.account_id)}
        playbookName={
          selectedTrade?.playbook_id
            ? playbookMap.get(selectedTrade.playbook_id)?.name ?? null
            : null
        }
        playbookCategory={
          selectedTrade?.playbook_id
            ? playbookMap.get(selectedTrade.playbook_id)?.category ?? null
            : null
        }
        onClose={() => {
          setDrawerOpen(false)
          setSelectedTrade(null)
        }}
        onEdit={handleEditTrade}
        onDuplicate={handleDuplicateTrade}
        onDelete={handleDeleteTrade}
      />

      <NewTradeSheet
        open={tradeSheetOpen}
        onClose={() => {
          setTradeSheetOpen(false)
          setEditingTrade(null)
        }}
        onSave={handleSaveTrade}
        editingTrade={editingTrade ?? undefined}
        accounts={accounts}
        userId={userId}
      />

      <BulkEditModal
        open={bulkEditOpen}
        selectedCount={selectedTradeIds.length}
        onClose={() => setBulkEditOpen(false)}
        onSave={handleBulkEdit}
      />

      <ColumnPicker
        open={columnPickerOpen}
        onClose={() => setColumnPickerOpen(false)}
      />

      <ExportMenu
        open={exportMenuOpen}
        onClose={() => setExportMenuOpen(false)}
        trades={normalizedTrades}
        visibleColumns={visibleColumnsSet}
        units={units}
        displayCurrency={displayCurrency}
      />
    </div>
  )
}

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <TradesPageContent />
    </Suspense>
  )
}
