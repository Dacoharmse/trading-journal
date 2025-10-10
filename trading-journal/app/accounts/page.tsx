"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  Edit,
} from "lucide-react"
import {
  AccountType,
  PropFirmPhase,
  TradingAccount,
  AccountInput,
} from "@/types"
import { Broker } from "@/types"
import { useAccountStore, useTradeStore } from "@/stores"

type AccountFormState = {
  name: string
  selectedBroker: string
  customBrokerName: string
  accountType: AccountType
  phase: PropFirmPhase
  currency: string
  startingBalance: string
  tradingPairs: string
  isActive: boolean
  profitTarget: string
  maxDrawdown: string
  dailyDrawdown: string
  accountStatus: "new" | "profits" | "drawdown"
  currentProfits: string
  currentDrawdown: string
}

const brokerOptions = [
  Broker.TD_AMERITRADE,
  Broker.INTERACTIVE_BROKERS,
  Broker.CHARLES_SCHWAB,
  Broker.E_TRADE,
  Broker.FIDELITY,
  Broker.ROBINHOOD,
  Broker.WEBULL,
  Broker.TASTYTRADE,
  Broker.TRADESTATION,
  Broker.THINKORSWIM,
  Broker.XM,
  Broker.EXNESS,
]

const currencyOptions = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "ZAR", label: "ZAR - South African Rand" },
]

const propFirmPhases: { value: PropFirmPhase; label: string }[] = [
  { value: "phase-1", label: "Phase 1" },
  { value: "phase-2", label: "Phase 2" },
  { value: "funded", label: "Funded" },
]

const initialFormState: AccountFormState = {
  name: "",
  selectedBroker: "",
  customBrokerName: "",
  accountType: "live",
  phase: "phase-1",
  currency: "USD",
  startingBalance: "",
  tradingPairs: "",
  isActive: true,
  profitTarget: "",
  maxDrawdown: "",
  dailyDrawdown: "",
  accountStatus: "new",
  currentProfits: "",
  currentDrawdown: "",
}

const formatCurrency = (value: number, currency: string) => {
  if (!Number.isFinite(value)) return "-"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const addAccount = useAccountStore((state) => state.addAccount)
  const updateAccount = useAccountStore((state) => state.updateAccount)
  const deleteAccount = useAccountStore((state) => state.deleteAccount)
  const selectAccount = useAccountStore((state) => state.selectAccount)
  const recalculateMetrics = useAccountStore((state) => state.recalculateMetrics)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  const trades = useTradeStore((state) => state.trades)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)

  // Fetch data from Supabase on mount
  React.useEffect(() => {
    fetchAccounts()
    fetchTrades()
  }, [fetchAccounts, fetchTrades])

  const [formState, setFormState] = React.useState<AccountFormState>(initialFormState)
  const [editingAccountId, setEditingAccountId] = React.useState<string | null>(null)

  React.useEffect(() => {
    recalculateMetrics(trades)
  }, [trades, recalculateMetrics])

  const resetForm = React.useCallback(() => {
    setFormState(initialFormState)
    setEditingAccountId(null)
  }, [])

  const startEditAccount = (account: TradingAccount) => {
    const isKnownBroker = brokerOptions.includes(account.broker as Broker)

    setFormState({
      name: account.name,
      selectedBroker: isKnownBroker ? account.broker : Broker.OTHER,
      customBrokerName: isKnownBroker ? "" : account.broker,
      accountType: account.accountType,
      phase: account.propFirmSettings?.phase ?? "phase-1",
      currency: account.currency,
      startingBalance: account.startingBalance.toString(),
      tradingPairs: (account.tradingPairs ?? []).join(", "),
      isActive: account.isActive,
      profitTarget: account.propFirmSettings?.profitTarget?.toString() ?? "",
      maxDrawdown: account.propFirmSettings?.maxDrawdown?.toString() ?? "",
      dailyDrawdown: account.propFirmSettings?.dailyDrawdown?.toString() ?? "",
      accountStatus: account.propFirmSettings?.status ?? "new",
      currentProfits: account.propFirmSettings?.currentProfits?.toString() ?? "",
      currentDrawdown: account.propFirmSettings?.currentDrawdown?.toString() ?? "",
    })
    setEditingAccountId(account.id)
    selectAccount(account.id)
  }

  const handleAccountSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.name || !formState.currency || !formState.startingBalance) {
      alert("Please fill in all required fields: Account Name, Currency, and Starting Balance")
      return
    }

    if (!formState.selectedBroker) {
      alert("Please select a broker")
      return
    }

    if (formState.selectedBroker === Broker.OTHER && !formState.customBrokerName.trim()) {
      alert("Please enter a custom broker/prop firm name")
      return
    }

    const brokerName =
      formState.selectedBroker === Broker.OTHER || !formState.selectedBroker
        ? formState.customBrokerName.trim() || "Prop Firm"
        : formState.selectedBroker

    const tradingPairs = formState.tradingPairs
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)

    const input: AccountInput = {
      name: formState.name,
      broker: brokerName,
      accountType: formState.accountType,
      currency: formState.currency,
      startingBalance: parseFloat(formState.startingBalance) || 0,
      tradingPairs,
      isActive: formState.isActive,
      propFirmSettings:
        formState.accountType === "prop-firm"
          ? {
              phase: formState.phase,
              profitTarget: formState.profitTarget
                ? parseFloat(formState.profitTarget)
                : undefined,
              maxDrawdown: formState.maxDrawdown
                ? parseFloat(formState.maxDrawdown)
                : undefined,
              dailyDrawdown: formState.dailyDrawdown
                ? parseFloat(formState.dailyDrawdown)
                : undefined,
              status: formState.accountStatus,
              currentProfits: formState.currentProfits
                ? parseFloat(formState.currentProfits)
                : undefined,
              currentDrawdown: formState.currentDrawdown
                ? parseFloat(formState.currentDrawdown)
                : undefined,
            }
          : undefined,
    }

    try {
      if (editingAccountId) {
        await updateAccount(editingAccountId, input)
        await fetchAccounts()
        alert("Account updated successfully!")
      } else {
        const created = await addAccount(input)
        if (created) {
          selectAccount(created.id)
          await fetchAccounts()
          alert("Account added successfully!")
        } else {
          alert("Failed to add account. You may not be authenticated. Check browser console for details.")
          console.error("Account creation failed - likely authentication issue")
          return
        }
      }

      recalculateMetrics(trades)
      resetForm()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
      console.error("Account operation error:", error)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return

    await deleteAccount(id)
    if (editingAccountId === id) {
      resetForm()
    }
    await fetchAccounts()
    recalculateMetrics(trades)
  }

  const handleToggleActive = async (account: TradingAccount) => {
    await updateAccount(account.id, { isActive: !account.isActive })
    await fetchAccounts()
    recalculateMetrics(trades)
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trading Accounts</h1>
        <p className="text-muted-foreground mt-1">
          Manage broker accounts and prop firm progress tracking
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            View and manage all your trading accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No accounts yet. Add your first account below to start tracking performance.
            </div>
          )}

          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{account.name}</h3>
                  <Badge variant="outline">{account.accountType}</Badge>
                  {account.isActive ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {account.broker} • Starting Balance: {formatCurrency(account.startingBalance, account.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Current Balance: {formatCurrency(account.metrics.currentBalance, account.currency)} • Net P&L: {formatCurrency(account.metrics.netProfit, account.currency)}
                </p>
                {account.tradingPairs && account.tradingPairs.length > 0 && (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pairs: {account.tradingPairs.join(", ")}
                  </p>
                )}

                <div className="grid gap-2 text-xs sm:text-sm md:grid-cols-2">
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-muted-foreground">Best Day</p>
                    <p className="font-semibold">
                      {formatCurrency(account.metrics.bestDay, account.currency)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-muted-foreground">Worst Day</p>
                    <p className="font-semibold">
                      {formatCurrency(account.metrics.worstDay, account.currency)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-muted-foreground">Max Drawdown</p>
                    <p className="font-semibold">
                      {formatCurrency(account.metrics.maxDrawdown, account.currency)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-muted-foreground">Daily Drawdown</p>
                    <p className="font-semibold">
                      {formatCurrency(account.metrics.dailyDrawdown, account.currency)}
                    </p>
                  </div>
                </div>

                {account.accountType === "prop-firm" && account.propFirmSettings && (
                  <div className="space-y-2 rounded-lg border border-dashed p-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Profit Target</span>
                      <span>
                        {(() => {
                          const status = account.propFirmSettings?.status;
                          const currentValue = status === 'profits'
                            ? (account.propFirmSettings?.currentProfits ?? account.metrics.netProfit)
                            : status === 'drawdown'
                            ? -(account.propFirmSettings?.currentDrawdown ?? 0)
                            : account.metrics.netProfit;
                          return `${formatCurrency(currentValue, account.currency)} / ${formatCurrency(account.propFirmSettings.profitTarget ?? 0, account.currency)}`;
                        })()}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, (() => {
                              const status = account.propFirmSettings?.status;
                              const profitTarget = account.propFirmSettings?.profitTarget ?? 1;
                              const currentValue = status === 'profits'
                                ? (account.propFirmSettings?.currentProfits ?? account.metrics.netProfit)
                                : status === 'drawdown'
                                ? -(account.propFirmSettings?.currentDrawdown ?? 0)
                                : account.metrics.netProfit;
                              return (currentValue / profitTarget) * 100;
                            })()),
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {account.metrics.profitTargetReached && (
                        <Badge variant="default">Target reached</Badge>
                      )}
                      {account.metrics.maxDrawdownBreached && (
                        <Badge variant="destructive">Max drawdown breached</Badge>
                      )}
                      {account.metrics.dailyDrawdownBreached && (
                        <Badge variant="destructive">Daily drawdown breached</Badge>
                      )}
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>
                        Max Drawdown Limit: {formatCurrency(account.propFirmSettings.maxDrawdown ?? 0, account.currency)}
                      </span>
                      <span>
                        Daily Drawdown Limit: {formatCurrency(account.propFirmSettings.dailyDrawdown ?? 0, account.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <Switch
                  checked={account.isActive}
                  onCheckedChange={() => handleToggleActive(account)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => startEditAccount(account)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingAccountId ? "Edit Account" : "Add New Account"}</CardTitle>
          <CardDescription>
            Connect a new broker account or update a prop firm account to track progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccountSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name *</Label>
                <Input
                  id="account-name"
                  placeholder="e.g., Main Trading Account"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type *</Label>
                <Select
                  value={formState.accountType}
                  onValueChange={(value: AccountType) =>
                    setFormState((prev) => ({ ...prev, accountType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live Account</SelectItem>
                    <SelectItem value="demo">Demo Account</SelectItem>
                    <SelectItem value="prop-firm">Prop Firm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="broker">Broker *</Label>
                <Select
                  value={formState.selectedBroker}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, selectedBroker: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    {brokerOptions.map((broker) => (
                      <SelectItem key={broker} value={broker}>
                        {broker}
                      </SelectItem>
                    ))}
                    <SelectItem value={Broker.OTHER}>Other / Prop Firm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formState.selectedBroker === Broker.OTHER && (
                <div className="space-y-2">
                  <Label htmlFor="custom-broker">Custom Broker Name *</Label>
                  <Input
                    id="custom-broker"
                    placeholder="e.g., FTMO, The5ers"
                    value={formState.customBrokerName}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        customBrokerName: event.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="starting-balance">Starting Balance *</Label>
                <Input
                  id="starting-balance"
                  type="number"
                  placeholder="50000"
                  value={formState.startingBalance}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      startingBalance: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formState.currency}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="trading-pairs">Trading Pairs (comma separated)</Label>
                <Input
                  id="trading-pairs"
                  placeholder="SPY, EURUSD, BTCUSD"
                  value={formState.tradingPairs}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      tradingPairs: event.target.value,
                    }))
                  }
                />
              </div>

              {formState.accountType === "prop-firm" && (
                <React.Fragment>
                  <Separator className="md:col-span-2" />
                  <div className="space-y-2">
                    <Label htmlFor="phase">Prop Firm Phase</Label>
                    <Select
                      value={formState.phase}
                      onValueChange={(value: PropFirmPhase) =>
                        setFormState((prev) => ({ ...prev, phase: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {propFirmPhases.map((phase) => (
                          <SelectItem key={phase.value} value={phase.value}>
                            {phase.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profit-target">Profit Target</Label>
                    <Input
                      id="profit-target"
                      type="number"
                      placeholder="10000"
                      value={formState.profitTarget}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          profitTarget: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-drawdown">Max Drawdown</Label>
                    <Input
                      id="max-drawdown"
                      type="number"
                      placeholder="5000"
                      value={formState.maxDrawdown}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          maxDrawdown: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="daily-drawdown">Daily Drawdown Limit</Label>
                    <Input
                      id="daily-drawdown"
                      type="number"
                      placeholder="2500"
                      value={formState.dailyDrawdown}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          dailyDrawdown: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <Separator className="md:col-span-2" />

                  <div className="space-y-2">
                    <Label htmlFor="account-status">Account Status</Label>
                    <Select
                      value={formState.accountStatus}
                      onValueChange={(value: "new" | "profits" | "drawdown") =>
                        setFormState((prev) => ({ ...prev, accountStatus: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Fresh/New</SelectItem>
                        <SelectItem value="profits">In Profits</SelectItem>
                        <SelectItem value="drawdown">In Drawdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formState.accountStatus === "profits" && (
                    <div className="space-y-2">
                      <Label htmlFor="current-profits">Current Profits</Label>
                      <Input
                        id="current-profits"
                        type="number"
                        step="0.01"
                        placeholder="1500.00"
                        value={formState.currentProfits}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            currentProfits: event.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  {formState.accountStatus === "drawdown" && (
                    <div className="space-y-2">
                      <Label htmlFor="current-drawdown">Current Drawdown</Label>
                      <Input
                        id="current-drawdown"
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        value={formState.currentDrawdown}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            currentDrawdown: event.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </React.Fragment>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <span className="text-sm text-muted-foreground">
                Set as active account
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" className="flex-1">
                {editingAccountId ? "Update Account" : "Add Account"}
              </Button>
              {editingAccountId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
