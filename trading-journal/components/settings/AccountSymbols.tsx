'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Account, Symbol, AccountSymbol } from '@/types/supabase'

interface AccountSymbolsProps {
  account: Account
  onUpdate: () => void
}

export function AccountSymbols({ account, onUpdate }: AccountSymbolsProps) {
  const supabase = createClient()

  const [allSymbols, setAllSymbols] = React.useState<Symbol[]>([])
  const [accountSymbols, setAccountSymbols] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addingSymbol, setAddingSymbol] = React.useState(false)

  React.useEffect(() => {
    loadData()
  }, [account.id])

  const loadData = async () => {
    setLoading(true)

    // Load all symbols
    const { data: symbols } = await supabase
      .from('symbols')
      .select('*')
      .order('display_name')

    if (symbols) setAllSymbols(symbols)

    // Load account's symbols
    const { data: accSymbols } = await supabase
      .from('account_symbols')
      .select('symbol_id')
      .eq('account_id', account.id)

    if (accSymbols) {
      setAccountSymbols(accSymbols.map((as) => as.symbol_id))
    }

    setLoading(false)
  }

  const handleAddSymbol = async (symbolId: string) => {
    const { error } = await supabase
      .from('account_symbols')
      .insert({ account_id: account.id, symbol_id: symbolId })

    if (error) {
      console.error('Error adding symbol:', error)
      alert('Failed to add symbol')
      return
    }

    setAccountSymbols([...accountSymbols, symbolId])
    setAddingSymbol(false)
    onUpdate()
  }

  const handleRemoveSymbol = async (symbolId: string) => {
    const { error } = await supabase
      .from('account_symbols')
      .delete()
      .eq('account_id', account.id)
      .eq('symbol_id', symbolId)

    if (error) {
      console.error('Error removing symbol:', error)
      alert('Failed to remove symbol')
      return
    }

    setAccountSymbols(accountSymbols.filter((id) => id !== symbolId))
    onUpdate()
  }

  const availableSymbols = allSymbols.filter(
    (sym) => !accountSymbols.includes(sym.id)
  )

  const selectedSymbols = allSymbols.filter((sym) =>
    accountSymbols.includes(sym.id)
  )

  if (loading) {
    return <div className="text-sm text-gray-500">Loading symbols...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Trading Symbols for {account.name}
        </h4>
        <button
          onClick={() => setAddingSymbol(!addingSymbol)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Symbol
        </button>
      </div>

      {/* Add Symbol Dropdown */}
      {addingSymbol && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Symbol
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddSymbol(e.target.value)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            defaultValue=""
          >
            <option value="">Choose a symbol...</option>
            {availableSymbols.map((sym) => (
              <option key={sym.id} value={sym.id}>
                {sym.display_name} ({sym.code}) - {sym.asset_class}
              </option>
            ))}
          </select>
          {availableSymbols.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              All symbols have been added to this account.
            </p>
          )}
        </div>
      )}

      {/* Selected Symbols */}
      {selectedSymbols.length === 0 ? (
        <p className="text-sm text-gray-500">
          No symbols configured. Add symbols this account can trade.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedSymbols.map((sym) => (
            <div
              key={sym.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {sym.display_name}
              </span>
              <span className="text-xs text-gray-500">({sym.asset_class})</span>
              <button
                onClick={() => handleRemoveSymbol(sym.id)}
                className="ml-1 p-0.5 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
