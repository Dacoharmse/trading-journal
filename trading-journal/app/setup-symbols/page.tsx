'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface SymbolSetupResult {
  symbol: string
  status: 'success' | 'error' | 'exists'
  message: string
}

export default function SetupSymbolsPage() {
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SymbolSetupResult[]>([])
  const [accountId, setAccountId] = React.useState<string>('')
  const [accounts, setAccounts] = React.useState<Array<{ id: string; name: string }>>([])

  React.useEffect(() => {
    const loadAccounts = async () => {
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()

      if (userData.user) {
        const { data } = await supabase
          .from('accounts')
          .select('id, name')
          .eq('user_id', userData.user.id)

        if (data) {
          setAccounts(data)
          if (data.length === 1) {
            setAccountId(data[0].id)
          }
        }
      }
    }

    loadAccounts()
  }, [])

  const setupSymbols = async () => {
    setLoading(true)
    setResults([])
    const supabase = createClient()
    const newResults: SymbolSetupResult[] = []

    // Define the futures symbols to add
    const futuresSymbols = [
      // Micro contracts
      { code: 'MNQ', asset_class: 'Index', pip_size: 0.25, point_value: 0.50, display_name: 'Micro E-mini Nasdaq-100' },
      { code: 'MES', asset_class: 'Index', pip_size: 0.25, point_value: 1.25, display_name: 'Micro E-mini S&P 500' },
      { code: 'MGC', asset_class: 'Metal', pip_size: 0.10, point_value: 1.00, display_name: 'Micro Gold' },
      // Full-size contracts
      { code: 'NQ', asset_class: 'Index', pip_size: 0.25, point_value: 5.00, display_name: 'E-mini Nasdaq-100' },
      { code: 'ES', asset_class: 'Index', pip_size: 0.25, point_value: 12.50, display_name: 'E-mini S&P 500' },
      { code: 'GC', asset_class: 'Metal', pip_size: 0.10, point_value: 10.00, display_name: 'Gold Futures' },
    ]

    try {
      // Step 1: Add symbols to symbols table
      for (const symbol of futuresSymbols) {
        // Check if symbol already exists
        const { data: existing } = await supabase
          .from('symbols')
          .select('id, code')
          .eq('code', symbol.code)
          .maybeSingle()

        if (existing) {
          newResults.push({
            symbol: symbol.code,
            status: 'exists',
            message: `Symbol ${symbol.code} already exists in database`
          })
        } else {
          // Insert new symbol
          const { data, error } = await supabase
            .from('symbols')
            .insert([symbol])
            .select()
            .single()

          if (error) {
            newResults.push({
              symbol: symbol.code,
              status: 'error',
              message: `Failed to add ${symbol.code}: ${error.message}`
            })
          } else {
            newResults.push({
              symbol: symbol.code,
              status: 'success',
              message: `Successfully added ${symbol.code} to symbols table`
            })
          }
        }
      }

      // Step 2: Link symbols to account if account is selected
      if (accountId) {
        for (const symbol of futuresSymbols) {
          // Get the symbol ID
          const { data: symbolData } = await supabase
            .from('symbols')
            .select('id')
            .eq('code', symbol.code)
            .single()

          if (symbolData) {
            // Check if link already exists
            const { data: existingLink } = await supabase
              .from('account_symbols')
              .select('*')
              .eq('account_id', accountId)
              .eq('symbol_id', symbolData.id)
              .maybeSingle()

            if (existingLink) {
              newResults.push({
                symbol: `${symbol.code} (Link)`,
                status: 'exists',
                message: `${symbol.code} already linked to account`
              })
            } else {
              // Create the link
              const { error: linkError } = await supabase
                .from('account_symbols')
                .insert([{
                  account_id: accountId,
                  symbol_id: symbolData.id
                }])

              if (linkError) {
                newResults.push({
                  symbol: `${symbol.code} (Link)`,
                  status: 'error',
                  message: `Failed to link ${symbol.code}: ${linkError.message}`
                })
              } else {
                newResults.push({
                  symbol: `${symbol.code} (Link)`,
                  status: 'success',
                  message: `Successfully linked ${symbol.code} to account`
                })
              }
            }
          }
        }
      }

      setResults(newResults)
    } catch (error: any) {
      console.error('Setup error:', error)
      newResults.push({
        symbol: 'General',
        status: 'error',
        message: `Unexpected error: ${error.message}`
      })
      setResults(newResults)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Setup Futures Symbols
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Add common futures symbols (MNQ, MES, MGC, NQ, ES, GC) to your database and link them to your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Symbol Setup</CardTitle>
            <CardDescription>
              This will add common E-mini and Micro E-mini futures symbols to your database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Select Account to Link Symbols
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                disabled={loading}
              >
                <option value="">-- Select Account (Optional) --</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                If you select an account, the symbols will be linked to it. You can link them to other accounts later.
              </p>
            </div>

            <Button
              onClick={setupSymbols}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up symbols...
                </>
              ) : (
                'Setup Futures Symbols'
              )}
            </Button>

            {results.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Results:</h3>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-3 rounded-lg ${
                      result.status === 'success'
                        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                        : result.status === 'exists'
                        ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                        : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {result.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : result.status === 'exists' ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {result.symbol}
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What This Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <p>This setup process will:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Add MNQ (Micro E-mini Nasdaq-100) to the symbols table</li>
              <li>Add MES (Micro E-mini S&P 500) to the symbols table</li>
              <li>Add MGC (Micro Gold) to the symbols table</li>
              <li>Add NQ (E-mini Nasdaq-100) to the symbols table</li>
              <li>Add ES (E-mini S&P 500) to the symbols table</li>
              <li>Add GC (Gold Futures) to the symbols table</li>
              <li>If you selected an account, link these symbols to that account so they appear in the trade form</li>
            </ol>
            <p className="mt-4">
              After running this setup, you should be able to select these symbols when creating trades on your selected account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
