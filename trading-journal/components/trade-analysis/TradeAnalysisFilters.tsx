'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react'
import type { Trade } from '@/types/supabase'
import type { AnalysisFilters } from '@/app/trade-analysis/page'
import { createClient } from '@/lib/supabase/client'

interface TradeAnalysisFiltersProps {
  filters: AnalysisFilters
  onFiltersChange: (filters: AnalysisFilters) => void
  allTrades: Trade[]
}

interface PlaybookInfo {
  id: string
  name: string
}

interface AccountInfo {
  id: string
  name: string
}

export function TradeAnalysisFilters({ filters, onFiltersChange, allTrades }: TradeAnalysisFiltersProps) {
  const [expanded, setExpanded] = React.useState(true)
  const [playbooks, setPlaybooks] = React.useState<PlaybookInfo[]>([])
  const [accounts, setAccounts] = React.useState<AccountInfo[]>([])

  // Fetch playbooks and accounts
  React.useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Get unique playbook IDs from trades
      const playbookIds = Array.from(new Set(allTrades.map(t => t.playbook_id).filter(Boolean)))

      if (playbookIds.length > 0) {
        const { data: playbooksData } = await supabase
          .from('playbooks')
          .select('id, name')
          .in('id', playbookIds)

        if (playbooksData) {
          setPlaybooks(playbooksData)
        }
      }

      // Get unique account IDs from trades
      const accountIds = Array.from(new Set(allTrades.map(t => t.account_id).filter(Boolean)))

      if (accountIds.length > 0) {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, name')
          .in('id', accountIds)

        if (accountsData) {
          setAccounts(accountsData)
        }
      }
    }

    fetchData()
  }, [allTrades])

  // Extract unique values from trades
  const uniqueSymbols = React.useMemo(() => {
    return Array.from(new Set(allTrades.map(t => t.symbol))).sort()
  }, [allTrades])

  const uniqueStrategies = React.useMemo(() => {
    return Array.from(new Set(allTrades.map(t => t.strategy).filter(Boolean) as string[])).sort()
  }, [allTrades])

  const uniqueTags = React.useMemo(() => {
    const tags = new Set<string>()
    allTrades.forEach(t => {
      if (t.tags) {
        const tagList = Array.isArray(t.tags) ? t.tags : t.tags.split(',').map((s: string) => s.trim())
        tagList.forEach((tag: string) => tags.add(tag.trim()))
      }
    })
    return Array.from(tags).sort()
  }, [allTrades])

  const uniqueConfluences = React.useMemo(() => {
    const confluences = new Set<string>()
    allTrades.forEach(t => {
      if (t.confluences) {
        t.confluences.split(',').forEach(conf => confluences.add(conf.trim()))
      }
    })
    return Array.from(confluences).sort()
  }, [allTrades])

  const uniqueRules = React.useMemo(() => {
    const rules = new Set<string>()
    allTrades.forEach(t => {
      if (t.rules_followed) {
        t.rules_followed.split(',').forEach(rule => rules.add(rule.trim()))
      }
    })
    return Array.from(rules).sort()
  }, [allTrades])

  const updateFilter = <K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <K extends keyof AnalysisFilters>(key: K, value: string) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value]
    updateFilter(key, newArray as AnalysisFilters[K])
  }

  const resetFilters = () => {
    onFiltersChange({
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
  }

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (filters.symbols.length > 0) count++
    if (filters.direction !== 'all') count++
    if (filters.session.length > 0) count++
    if (filters.sessionHour.length > 0) count++
    if (filters.minR !== null) count++
    if (filters.maxR !== null) count++
    if (filters.minPnl !== null) count++
    if (filters.maxPnl !== null) count++
    if (filters.outcome !== 'all') count++
    if (filters.strategy.length > 0) count++
    if (filters.tags.length > 0) count++
    if (filters.setupGrade.length > 0) count++
    if (filters.confluences.length > 0) count++
    if (filters.rules.length > 0) count++
    if (filters.playbook.length > 0) count++
    if (filters.accounts.length > 0) count++
    return count
  }, [filters])

  return (
    <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                onClick={resetFilters}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="ghost"
              size="sm"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-2 block">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-2 block">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Symbols */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Symbols</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueSymbols.map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => toggleArrayFilter('symbols', symbol)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      filters.symbols.includes(symbol)
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction & Outcome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-2 block">Direction</Label>
                <div className="flex gap-2">
                  {['all', 'long', 'short'].map(dir => (
                    <button
                      key={dir}
                      onClick={() => updateFilter('direction', dir as any)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        filters.direction === dir
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {dir.charAt(0).toUpperCase() + dir.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">Outcome</Label>
                <div className="flex gap-2">
                  {['all', 'win', 'loss'].map(out => (
                    <button
                      key={out}
                      onClick={() => updateFilter('outcome', out as any)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        filters.outcome === out
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {out.charAt(0).toUpperCase() + out.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Session */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Session</Label>
              <div className="flex flex-wrap gap-2">
                {['Asia', 'London', 'NY'].map(sess => (
                  <button
                    key={sess}
                    onClick={() => toggleArrayFilter('session', sess)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                      filters.session.includes(sess)
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {sess}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Hour */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Session Hour</Label>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Asia</div>
                  <div className="flex flex-wrap gap-2">
                    {['A1', 'A2', 'A3', 'A4'].map(hour => (
                      <button
                        key={hour}
                        onClick={() => toggleArrayFilter('sessionHour', hour)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          filters.sessionHour.includes(hour)
                            ? 'bg-purple-600 text-white'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">London</div>
                  <div className="flex flex-wrap gap-2">
                    {['L1', 'L2', 'L3'].map(hour => (
                      <button
                        key={hour}
                        onClick={() => toggleArrayFilter('sessionHour', hour)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          filters.sessionHour.includes(hour)
                            ? 'bg-purple-600 text-white'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">New York</div>
                  <div className="flex flex-wrap gap-2">
                    {['NY1', 'NY2', 'NY3'].map(hour => (
                      <button
                        key={hour}
                        onClick={() => toggleArrayFilter('sessionHour', hour)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          filters.sessionHour.includes(hour)
                            ? 'bg-purple-600 text-white'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* R Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-2 block">Min R</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={filters.minR ?? ''}
                  onChange={(e) => updateFilter('minR', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g., -2"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-2 block">Max R</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={filters.maxR ?? ''}
                  onChange={(e) => updateFilter('maxR', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g., 5"
                  className="text-sm"
                />
              </div>
            </div>

            {/* P&L Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold mb-2 block">Min P&L</Label>
                <Input
                  type="number"
                  value={filters.minPnl ?? ''}
                  onChange={(e) => updateFilter('minPnl', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g., -500"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-2 block">Max P&L</Label>
                <Input
                  type="number"
                  value={filters.maxPnl ?? ''}
                  onChange={(e) => updateFilter('maxPnl', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g., 1000"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Strategy */}
            {uniqueStrategies.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Strategy</Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueStrategies.map(strat => (
                    <button
                      key={strat}
                      onClick={() => toggleArrayFilter('strategy', strat)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filters.strategy.includes(strat)
                          ? 'bg-green-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {strat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {uniqueTags.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleArrayFilter('tags', tag)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filters.tags.includes(tag)
                          ? 'bg-orange-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Grade */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Setup Grade</Label>
              <div className="flex flex-wrap gap-2">
                {['A+', 'A', 'B', 'C', 'D', 'F'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => toggleArrayFilter('setupGrade', grade)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      filters.setupGrade.includes(grade)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Confluences */}
            {uniqueConfluences.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Confluences</Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueConfluences.map(conf => (
                    <button
                      key={conf}
                      onClick={() => toggleArrayFilter('confluences', conf)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filters.confluences.includes(conf)
                          ? 'bg-teal-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {conf}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            {uniqueRules.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Rules Followed</Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueRules.map(rule => (
                    <button
                      key={rule}
                      onClick={() => toggleArrayFilter('rules', rule)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filters.rules.includes(rule)
                          ? 'bg-cyan-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Playbooks */}
            {playbooks.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Playbook</Label>
                <div className="flex flex-wrap gap-2">
                  {playbooks.map(playbook => (
                    <button
                      key={playbook.id}
                      onClick={() => toggleArrayFilter('playbook', playbook.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filters.playbook.includes(playbook.id)
                          ? 'bg-violet-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {playbook.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Accounts */}
            {accounts.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Account</Label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => toggleArrayFilter('accounts', account.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filters.accounts.includes(account.id)
                          ? 'bg-pink-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
