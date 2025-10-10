'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calculator } from 'lucide-react'
import { calculatePositionSize, calculateRiskReward } from '@/lib/risk-calculator'

export function PositionSizeCalculator() {
  const [accountBalance, setAccountBalance] = React.useState<string>('10000')
  const [riskPercent, setRiskPercent] = React.useState<string>('1')
  const [entryPrice, setEntryPrice] = React.useState<string>('')
  const [stopLoss, setStopLoss] = React.useState<string>('')
  const [takeProfit, setTakeProfit] = React.useState<string>('')
  const [symbol, setSymbol] = React.useState<string>('EURUSD')
  const [pipValue, setPipValue] = React.useState<string>('10')

  const [result, setResult] = React.useState<ReturnType<typeof calculatePositionSize> | null>(null)
  const [riskReward, setRiskReward] = React.useState<number>(0)

  const handleCalculate = () => {
    const balance = parseFloat(accountBalance)
    const risk = parseFloat(riskPercent)
    const entry = parseFloat(entryPrice)
    const sl = parseFloat(stopLoss)
    const tp = parseFloat(takeProfit)
    const pv = parseFloat(pipValue)

    if (!balance || !risk || !entry || !sl) return

    const calculation = calculatePositionSize(balance, risk, entry, sl, pv, symbol)
    setResult(calculation)

    if (tp) {
      const rr = calculateRiskReward(entry, sl, tp)
      setRiskReward(rr)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <CardTitle>Position Size Calculator</CardTitle>
        </div>
        <CardDescription>Calculate optimal position size based on risk parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Account Balance ($)</Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              placeholder="10000"
            />
          </div>

          <div className="space-y-2">
            <Label>Risk Per Trade (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              placeholder="1.0"
            />
          </div>

          <div className="space-y-2">
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EURUSD">EUR/USD</SelectItem>
                <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                <SelectItem value="USDJPY">USD/JPY</SelectItem>
                <SelectItem value="XAUUSD">Gold (XAU/USD)</SelectItem>
                <SelectItem value="BTCUSD">Bitcoin</SelectItem>
                <SelectItem value="NAS100">Nasdaq 100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pip Value ($)</Label>
            <Input
              type="number"
              step="0.1"
              value={pipValue}
              onChange={(e) => setPipValue(e.target.value)}
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label>Entry Price</Label>
            <Input
              type="number"
              step="0.00001"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="1.10000"
            />
          </div>

          <div className="space-y-2">
            <Label>Stop Loss</Label>
            <Input
              type="number"
              step="0.00001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="1.09900"
            />
          </div>

          <div className="space-y-2">
            <Label>Take Profit (Optional)</Label>
            <Input
              type="number"
              step="0.00001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="1.10200"
            />
          </div>
        </div>

        <Button onClick={handleCalculate} className="w-full">
          <Calculator className="mr-2 h-4 w-4" />
          Calculate Position Size
        </Button>

        {result && (
          <div className="mt-6 space-y-4 rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="font-semibold">Calculation Results</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Position Size</p>
                <p className="text-lg font-bold">
                  {result.positionSize.toLocaleString()} units
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lot Size</p>
                <p className="text-lg font-bold">{result.lotSize.toFixed(2)} lots</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Risk Amount</p>
                <p className="text-lg font-bold text-red-600">
                  ${result.riskAmount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stop Distance</p>
                <p className="text-lg font-bold">{result.stopDistance.toFixed(5)}</p>
              </div>

              {riskReward > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Risk:Reward Ratio</p>
                  <p
                    className={`text-lg font-bold ${riskReward >= 2 ? 'text-green-600' : riskReward >= 1.5 ? 'text-yellow-600' : 'text-red-600'}`}
                  >
                    1:{riskReward.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
