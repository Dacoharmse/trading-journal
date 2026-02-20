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
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type PlaybookSummary = Pick<Playbook, 'id' | 'name' | 'category' | 'active'>

// Pagination constants
const TRADES_PER_PAGE = 100
const INITIAL_LOAD = 50

function TradesPageContent() {
  const supabase = React.useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()

  // State
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [playbooks, setPlaybooks] = React.useState<PlaybookSummary[]>([])
  const [userId, setUserId] = React.useState('')
  const [isMentor, setIsMentor] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hasMore, setHasMore] = React.useState(true)
  const [page, setPage] = React.useState(0)
  const [authStatus, setAuthStatus] = React.useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

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

  // Fetch data with pagination
  // silent=true skips the full-page loading spinner (used for background refreshes after save)
  const fetchData = async (loadMore: boolean = false, silent: boolean = false) => {
    if (loadMore) {
      setLoadingMore(true)
    } else if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setAuthStatus('unauthenticated')
        throw new Error('You must be logged in to view trades. Please sign in to continue.')
      }

      setAuthStatus('authenticated')
      setUserId(session.user.id)
      const userData = { user: session.user }

      // Check mentor status on initial load (don't block on it)
      if (!loadMore) {
        fetch('/api/user/profile')
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.profile?.is_mentor && data?.profile?.mentor_approved) {
              setIsMentor(true)
            }
          })
          .catch(() => {})
      }

      // Only fetch accounts and playbooks on initial load
      if (!loadMore) {
        // Fetch accounts + playbooks via server API (bypasses RLS which hangs on browser client)
        const accountsRes = await fetch('/api/accounts')
        if (!accountsRes.ok) {
          const body = await accountsRes.json().catch(() => ({}))
          throw new Error(body.error || `Failed to load accounts (${accountsRes.status})`)
        }
        const { accounts: accountsData, playbooks: playbooksData } = await accountsRes.json()
        setAccounts(accountsData || [])
        setPlaybooks((playbooksData as PlaybookSummary[] | null) ?? [])
      }

      // Fetch trades via server API (bypasses RLS which hangs on browser client)
      const currentPage = loadMore ? page + 1 : 0
      const limit = loadMore ? TRADES_PER_PAGE : INITIAL_LOAD
      const offset = loadMore ? (page + 1) * TRADES_PER_PAGE : 0

      const tradesRes = await fetch(`/api/trades?limit=${limit}&offset=${offset}`)
      if (!tradesRes.ok) {
        const body = await tradesRes.json().catch(() => ({}))
        throw new Error(body.error || `Failed to load trades (${tradesRes.status})`)
      }
      const { trades: tradesData, count } = await tradesRes.json()

      if (loadMore) {
        setTrades((prev) => [...prev, ...(tradesData || [])])
        setPage(currentPage)
      } else {
        setTrades(tradesData || [])
        setPage(0)
      }

      // Check if there are more trades to load
      const totalLoaded = loadMore ? trades.length + (tradesData?.length || 0) : (tradesData?.length || 0)
      setHasMore(totalLoaded < (count || 0))

    } catch (err) {
      // Enhanced error logging for debugging
      console.error('=== ERROR FETCHING DATA ===')

      // Log the error message first
      if (err instanceof Error) {
        console.error('ERROR MESSAGE:', err.message)
      } else if (err && typeof err === 'object' && (err as any).message) {
        console.error('ERROR MESSAGE:', (err as any).message)
      }

      console.error('Raw error:', err)
      console.error('Error type:', typeof err)
      console.error('Error constructor:', err?.constructor?.name)

      // Log all properties (even non-enumerable ones)
      if (err && typeof err === 'object') {
        console.error('Error properties:')
        console.error('- message:', (err as any).message)
        console.error('- code:', (err as any).code)
        console.error('- details:', (err as any).details)
        console.error('- hint:', (err as any).hint)
        console.error('- stack:', (err as any).stack)

        // Try to serialize with all properties
        try {
          console.error('JSON.stringify attempt:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
        } catch (e) {
          console.error('Failed to stringify error:', e)
        }

        // Log all own properties
        const allProps = Object.getOwnPropertyNames(err)
        console.error('All property names:', allProps)
        allProps.forEach(prop => {
          console.error(`  ${prop}:`, (err as any)[prop])
        })
      }

      console.error('=== END ERROR LOG ===')

      // Extract meaningful error message
      let errorMessage = 'Failed to load trades. Please try again.'

      if (err instanceof Error) {
        errorMessage = err.message || 'An error occurred while loading trades'
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase PostgrestError
        const postgrestError = err as any
        if (postgrestError.message) {
          errorMessage = postgrestError.message
        } else if (postgrestError.details) {
          errorMessage = postgrestError.details
        } else if (postgrestError.error_description) {
          errorMessage = postgrestError.error_description
        }
      }

      setError(errorMessage)
    } finally {
      if (!silent) setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    fetchData(true)
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
    const method = tradeData.id ? 'PATCH' : 'POST'
    const res = await fetch('/api/trades', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || body.details || `Save failed (${res.status})`)
    }

    const { trade: savedTrade } = await res.json()

    // Update local state immediately with the returned trade (no refetch needed)
    if (tradeData.id) {
      setTrades((prev) => prev.map((t) => t.id === savedTrade.id ? savedTrade : t))
    } else {
      setTrades((prev) => [savedTrade, ...prev])
    }

    setTradeSheetOpen(false)
    setEditingTrade(null)
  }

  const handleDeleteTrade = async (trade: Trade) => {
    try {
      const res = await fetch('/api/trades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trade.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Delete failed (${res.status})`)
      }

      // Remove from local state immediately
      setTrades((prev) => prev.filter((t) => t.id !== trade.id))
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

        const res = await fetch('/api/trades', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTrade),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Update failed (${res.status})`)
        }
        const { trade: saved } = await res.json()
        // Update local state immediately
        setTrades((prev) => prev.map((t) => t.id === saved.id ? saved : t))
      }

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
          <div className="w-16 h-16 border-4 border-neutral-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading trades...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Unable to Load Trades
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Auth Status: <span className="font-mono">{authStatus}</span>
            </p>
            {authStatus === 'unauthenticated' && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                Please sign in to view your trades. Click the button below to go to the login page.
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            {authStatus === 'unauthenticated' ? (
              <a
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Sign In
              </a>
            ) : (
              <button
                onClick={() => fetchData()}
                className="px-4 py-2 text-sm font-medium text-white bg-neutral-600 hover:bg-neutral-700 rounded-lg"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
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
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <TradesTable
            trades={normalizedTrades}
            accounts={accounts}
            playbooks={playbooks}
            visibleColumns={visibleColumnsSet}
            units={units}
            displayCurrency={displayCurrency}
            onTradeClick={handleTradeClick}
            onEdit={handleEditTrade}
            onDelete={handleDeleteTrade}
          />
        </div>

        {/* Load More Button */}
        {hasMore && normalizedTrades.length > 0 && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex justify-center">
            <Button
              onClick={handleLoadMore}
              disabled={loadingMore}
              variant="outline"
              className="min-w-[200px]"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more trades...
                </>
              ) : (
                <>Load More ({trades.length} loaded)</>
              )}
            </Button>
          </div>
        )}
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
        isMentor={isMentor}
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
