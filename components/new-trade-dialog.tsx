"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { useAccountStore, useTradeStore, useUserStore } from "@/stores"
import { Broker, Trade } from "@/types"

interface NewTradeDialogProps {
  trigger?: React.ReactNode
}

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const parseNumber = (value: FormDataEntryValue | null | undefined) => {
  if (typeof value !== "string" || value.trim() === "") return undefined
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const calculatePnl = (
  entryPrice: number,
  exitPrice: number | undefined,
  quantity: number,
  fees: number,
  tradeType: "long" | "short",
) => {
  if (!exitPrice) return 0
  const gross =
    tradeType === "long"
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity
  return Number((gross - fees).toFixed(2))
}

export function NewTradeDialog({ trigger }: NewTradeDialogProps) {
  const accounts = useAccountStore((state) => state.accounts)
  const selectAccount = useAccountStore((state) => state.selectAccount)
  const selectedStoreAccount = useAccountStore((state) => state.selectedAccountId)
  const addTrade = useTradeStore((state) => state.addTrade)
  const userId = useUserStore((state) => state.user?.id ?? "local-user")

  const [open, setOpen] = React.useState(false)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(
    () => selectedStoreAccount ?? accounts[0]?.id,
  )
  const [symbol, setSymbol] = React.useState("")

  const selectedAccount = React.useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  )

  const tradingPairs = selectedAccount?.tradingPairs ?? []

  React.useEffect(() => {
    if (!open) {
      setSymbol("")
      return
    }

    const defaultAccountId = selectedStoreAccount ?? accounts[0]?.id
    setSelectedAccountId(defaultAccountId)
    if (defaultAccountId) {
      selectAccount(defaultAccountId)
    }

    if (defaultAccountId) {
      const defaultAccount = accounts.find((account) => account.id === defaultAccountId)
      if (defaultAccount && defaultAccount.tradingPairs?.length) {
        setSymbol(defaultAccount.tradingPairs[0])
      }
    }
  }, [open, accounts, selectAccount, selectedStoreAccount])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const entryPrice = parseNumber(formData.get("entry_price")) ?? 0
    const exitPrice = parseNumber(formData.get("exit_price"))
    const quantity = parseNumber(formData.get("quantity")) ?? 0
    const fees = parseNumber(formData.get("fees")) ?? 0
    const tradeType = (formData.get("trade_type") as "long" | "short") ?? "long"
    const entryDate = formData.get("entry_date") as string
    const exitDate = (formData.get("exit_date") as string) || ""
    const status = (formData.get("status") as "open" | "closed") ?? "open"
    const broker = (formData.get("broker") as string) || selectedAccount?.broker || Broker.OTHER
    const strategy = (formData.get("strategy") as string) || undefined
    const assetClass = (formData.get("asset_class") as string) || undefined
    const stopLoss = parseNumber(formData.get("stop_loss"))
    const takeProfit = parseNumber(formData.get("take_profit"))
    const notes = (formData.get("notes") as string) || undefined

    const symbolValue = symbol || ((formData.get("symbol") as string) ?? "").toUpperCase()

    const pnl = calculatePnl(entryPrice, exitPrice, quantity, fees, tradeType)

    const trade: Trade = {
      id: generateId(),
      user_id: userId,
      symbol: symbolValue,
      account_id: selectedAccountId,
      account_name: selectedAccount?.name,
      broker,
      trade_type: tradeType,
      entry_price: entryPrice,
      exit_price: exitPrice ?? null,
      quantity,
      entry_date: new Date(entryDate).toISOString(),
      exit_date: exitDate ? new Date(exitDate).toISOString() : null,
      pnl,
      fees,
      notes,
      strategy,
      tags: undefined,
      image_url: undefined,
      status,
      risk_reward_ratio: undefined,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      asset_class: assetClass as Trade["asset_class"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    addTrade(trade)
    event.currentTarget.reset()
    setSymbol("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full justify-start gap-2">
            <Plus className="size-4" />
            <span>New Trade</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record New Trade</DialogTitle>
          <DialogDescription>
            Select an account, choose the instrument, and capture your trade details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Account */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="account_id">Account</Label>
              <Select
                value={selectedAccountId ?? ""}
                onValueChange={(value) => {
                  const nextId = value || undefined
                  setSelectedAccountId(nextId)
                  if (nextId) {
                    selectAccount(nextId)
                    const account = accounts.find((item) => item.id === nextId)
                    if (account?.tradingPairs?.length) {
                      setSymbol(account.tradingPairs[0])
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="">No account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trading Pair */}
            {tradingPairs.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pair">Trading Pair</Label>
                <Select
                  value={symbol}
                  onValueChange={(value) => {
                    setSymbol(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradingPairs.map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Symbol */}
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="AAPL"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                required
              />
            </div>

            {/* Trade Type */}
            <div className="space-y-2">
              <Label htmlFor="trade_type">Type *</Label>
              <Select name="trade_type" defaultValue="long" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entry Price */}
            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry Price *</Label>
              <Input
                id="entry_price"
                name="entry_price"
                type="number"
                step="0.01"
                placeholder="150.00"
                required
              />
            </div>

            {/* Exit Price */}
            <div className="space-y-2">
              <Label htmlFor="exit_price">Exit Price</Label>
              <Input
                id="exit_price"
                name="exit_price"
                type="number"
                step="0.01"
                placeholder="155.00"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="100"
                required
              />
            </div>

            {/* Fees */}
            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                name="fees"
                type="number"
                step="0.01"
                placeholder="5.00"
                defaultValue="0"
              />
            </div>

            {/* Entry Date */}
            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date *</Label>
              <Input
                id="entry_date"
                name="entry_date"
                type="datetime-local"
                required
              />
            </div>

            {/* Exit Date */}
            <div className="space-y-2">
              <Label htmlFor="exit_date">Exit Date</Label>
              <Input id="exit_date" name="exit_date" type="datetime-local" />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select name="status" defaultValue="open">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Broker fallback */}
            <div className="space-y-2">
              <Label htmlFor="broker">Broker</Label>
              <Input
                id="broker"
                name="broker"
                placeholder="Defaults to account broker"
                defaultValue={selectedAccount?.broker ?? ""}
              />
            </div>

            {/* Asset Class */}
            <div className="space-y-2">
              <Label htmlFor="asset_class">Asset Class</Label>
              <Select name="asset_class">
                <SelectTrigger>
                  <SelectValue placeholder="Select asset class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Input
                id="strategy"
                name="strategy"
                placeholder="Momentum, Breakout, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss</Label>
              <Input
                id="stop_loss"
                name="stop_loss"
                type="number"
                step="0.01"
                placeholder="145.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit</Label>
              <Input
                id="take_profit"
                name="take_profit"
                type="number"
                step="0.01"
                placeholder="160.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Trade notes, setup, reasoning..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Trade</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
