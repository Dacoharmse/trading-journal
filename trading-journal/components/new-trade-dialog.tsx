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
import { Plus, Upload, X } from "lucide-react"
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
    const pnlAmount = parseNumber(formData.get("pnl_amount"))
    const actualRr = parseNumber(formData.get("actual_rr"))
    const outcome = (formData.get("outcome") as "win" | "loss" | "breakeven") || undefined

    const symbolValue = symbol || ((formData.get("symbol") as string) ?? "").toUpperCase()

    const pnl = calculatePnl(entryPrice, exitPrice, quantity, fees, tradeType)

    // Use account currency for pnl_currency
    const pnlCurrency = selectedAccount?.currency || "USD"

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
      pnl_amount: pnlAmount,
      pnl_currency: pnlCurrency,
      actual_rr: actualRr,
      outcome,
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="account_id">Account</Label>
              <Select
                value={selectedAccountId ?? "no-account"}
                onValueChange={(value) => {
                  const nextId = value === "no-account" ? undefined : value
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
                  <SelectItem value="no-account">No account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tradingPairs.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pair">Trading Pair *</Label>
                <Select
                  value={symbol}
                  onValueChange={(value) => {
                    setSymbol(value)
                  }}
                  required
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

            <div className="space-y-2">
              <Label htmlFor="lot_size">Lot Size *</Label>
              <Input
                id="lot_size"
                name="lot_size"
                type="number"
                step="0.01"
                placeholder="0.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date *</Label>
              <Input id="entry_date" name="entry_date" type="datetime-local" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_date">Exit Date</Label>
              <Input id="exit_date" name="exit_date" type="datetime-local" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select name="status" defaultValue="open" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_type">Exit Type</Label>
              <Select name="exit_type" defaultValue="none">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="stop_loss">Stop Loss</SelectItem>
                  <SelectItem value="take_profit">Take Profit</SelectItem>
                  <SelectItem value="closed_trade">Closed Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Input id="strategy" name="strategy" placeholder="Momentum, Breakout, etc." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confluences">Confluences</Label>
              <Select name="confluences">
                <SelectTrigger>
                  <SelectValue placeholder="Select confluences..." />
                </SelectTrigger>
                <SelectContent>
                  {useUserStore.getState().user?.preferences?.confluences &&
                   useUserStore.getState().user?.preferences?.confluences.length > 0 ? (
                    useUserStore.getState().user?.preferences?.confluences.map((confluence) => (
                      <SelectItem key={confluence} value={confluence}>
                        {confluence}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No confluences configured
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Configure confluences in Settings → Preferences
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="break_even"
                name="break_even"
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="break_even" className="cursor-pointer">
                Break-even
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_details">Entry Details</Label>
            <Textarea id="entry_details" name="entry_details" placeholder="Entry reasoning, setup, conditions..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit_details">Exit Details</Label>
            <Textarea id="exit_details" name="exit_details" placeholder="Exit reasoning, outcome analysis..." rows={3} />
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Trade Outcome</Label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pnl_amount">
                  P/L Amount ({selectedAccount?.currency || "USD"})
                </Label>
                <Input
                  id="pnl_amount"
                  name="pnl_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Actual profit/loss
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual_rr">Actual R:R</Label>
                <Input
                  id="actual_rr"
                  name="actual_rr"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2.5"
                />
                <p className="text-xs text-muted-foreground">
                  Realized risk/reward
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <Select name="outcome">
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="breakeven">Break-even</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Win/Loss/BE
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Chart Image</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="chart_image_url"
                    name="chart_image_url"
                    type="text"
                    placeholder="Paste image URL or Ctrl+V to paste from clipboard..."
                    className="flex-1"
                    onPaste={(e) => {
                      const items = e.clipboardData?.items
                      if (!items) return

                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                          e.preventDefault()
                          const blob = items[i].getAsFile()
                          if (blob) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              const input = e.target as HTMLInputElement
                              input.value = reader.result as string
                            }
                            reader.readAsDataURL(blob)
                          }
                          break
                        }
                      }
                    }}
                  />
                </div>
                <Label
                  htmlFor="chart_image_file"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                  <input
                    id="chart_image_file"
                    name="chart_image_file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          const input = document.getElementById("chart_image_url") as HTMLInputElement
                          if (input) {
                            input.value = reader.result as string
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste image URL, use Ctrl+V to paste screenshot, or upload from device
              </p>
            </div>
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
