import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/accounts/symbols?accountId=<id>
// Returns symbols for a given account (bypasses RLS). Also auto-creates missing symbols.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = request.nextUrl.searchParams.get('accountId')
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify account belongs to this user
    const { data: accountData } = await admin
      .from('accounts')
      .select('trading_pairs')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (!accountData) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const allSymbolsMap = new Map<string, any>()
    const pairs: string[] = accountData.trading_pairs || []

    // Fetch symbols from trading_pairs + account_symbols in parallel
    const [pairsSymbolsResult, linkedSymbolsResult] = await Promise.all([
      pairs.length > 0
        ? admin.from('symbols').select('*').in('code', pairs).order('code')
        : Promise.resolve({ data: [] as any[], error: null }),
      admin
        .from('account_symbols')
        .select('symbol_id, symbols(*)')
        .eq('account_id', accountId),
    ])

    // Add matched symbols from trading_pairs
    if (pairsSymbolsResult.data) {
      for (const s of pairsSymbolsResult.data) {
        allSymbolsMap.set(s.id, s)
      }

      // Auto-create missing symbols from trading_pairs
      const existingCodes = new Set(pairsSymbolsResult.data.map((s: any) => s.code))
      const missingCodes = pairs.filter((code) => !existingCodes.has(code))

      if (missingCodes.length > 0) {
        const newSymbols = missingCodes.map((code) => {
          const upper = code.toUpperCase()
          let asset_class = 'FX'
          let pip_size = 0.0001
          const point_value = 1.0

          if (upper.includes('XAU') || upper.includes('GOLD')) {
            asset_class = 'Metal'; Object.assign({ pip_size: 0.01 }, { pip_size })
            pip_size = 0.01
          } else if (upper.includes('NAS') || upper.includes('SPX') || upper.includes('US30') || upper.includes('US500')) {
            asset_class = 'Index'
            pip_size = 0.1
          } else if (upper.includes('BTC') || upper.includes('ETH')) {
            asset_class = 'Crypto'
            pip_size = 0.01
          } else if (upper.includes('XAG') || upper.includes('SILVER')) {
            asset_class = 'Metal'
            pip_size = 0.001
          } else if (upper.includes('OIL') || upper.includes('WTI') || upper.includes('BRENT')) {
            asset_class = 'Commodity'
            pip_size = 0.01
          } else if (upper.includes('JPY')) {
            pip_size = 0.01
          }

          return { code, display_name: code, asset_class, pip_size, point_value }
        })

        const { data: inserted } = await admin.from('symbols').insert(newSymbols).select()
        if (inserted) {
          for (const s of inserted) allSymbolsMap.set(s.id, s)
        }
      }
    }

    // Add linked account_symbols
    if (linkedSymbolsResult.data) {
      for (const row of linkedSymbolsResult.data) {
        const s = row.symbols as any
        if (s && !allSymbolsMap.has(s.id)) {
          allSymbolsMap.set(s.id, s)
        }
      }
    }

    // Fallback: load all symbols if nothing found
    if (allSymbolsMap.size === 0) {
      const { data: allSymbols } = await admin.from('symbols').select('*').order('code')
      return NextResponse.json({ symbols: allSymbols || [] })
    }

    const symbols = Array.from(allSymbolsMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    )

    return NextResponse.json({ symbols })
  } catch (err) {
    console.error('GET /api/accounts/symbols error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch symbols' },
      { status: 500 }
    )
  }
}
