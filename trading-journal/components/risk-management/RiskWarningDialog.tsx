"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"

export interface RiskViolationDetails {
  accountName: string
  accountCurrency: string
  riskLimit: number
  actualRisk: number
  limitType: 'percentage' | 'monetary'
  violationType: 'session_limit' | 'daily_limit' | 'position_size'
}

interface RiskWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  violation: RiskViolationDetails | null
  onProceed: (reason: string) => void
  onCancel: () => void
}

export function RiskWarningDialog({
  open,
  onOpenChange,
  violation,
  onProceed,
  onCancel,
}: RiskWarningDialogProps) {
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setReason("")
      setError("")
    }
  }, [open])

  const handleProceed = () => {
    if (!reason.trim()) {
      setError("You must provide a reason for exceeding the risk limit")
      return
    }

    if (reason.trim().length < 10) {
      setError("Please provide a more detailed reason (at least 10 characters)")
      return
    }

    onProceed(reason.trim())
    setReason("")
    setError("")
  }

  const handleCancel = () => {
    setReason("")
    setError("")
    onCancel()
  }

  if (!violation) return null

  const formatValue = (value: number, type: 'percentage' | 'monetary', currency: string) => {
    if (type === 'percentage') {
      return `${value.toFixed(2)}%`
    }
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(value)
    } catch {
      return `${value.toFixed(2)}`
    }
  }

  const getViolationTypeLabel = (type: string) => {
    switch (type) {
      case 'session_limit':
        return 'Session Risk Limit'
      case 'daily_limit':
        return 'Daily Risk Limit'
      case 'position_size':
        return 'Position Size Limit'
      default:
        return 'Risk Limit'
    }
  }

  const exceededBy = violation.actualRisk - violation.riskLimit
  const exceededPercentage = ((exceededBy / violation.riskLimit) * 100).toFixed(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-red-600">Risk Limit Exceeded</DialogTitle>
              <DialogDescription>
                {getViolationTypeLabel(violation.violationType)} for {violation.accountName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Violation Details */}
          <div className="rounded-lg border-2 border-red-600 bg-red-50 dark:bg-red-950/20 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Your Risk Limit:</span>
                <span className="text-lg font-bold">
                  {formatValue(violation.riskLimit, violation.limitType, violation.accountCurrency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Attempting to Risk:</span>
                <span className="text-lg font-bold text-red-600">
                  {formatValue(violation.actualRisk, violation.limitType, violation.accountCurrency)}
                </span>
              </div>

              <div className="border-t border-red-600/30 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Exceeded By:</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatValue(exceededBy, violation.limitType, violation.accountCurrency)}
                    <span className="text-sm ml-2">({exceededPercentage}% over limit)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-600 p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> Exceeding your risk limits can lead to significant losses.
              Please ensure you have a valid reason for overriding this safety measure.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base font-semibold">
              Reason for Exceeding Risk Limit *
            </Label>
            <Textarea
              id="reason"
              placeholder="Provide a detailed explanation for why you need to exceed your risk limit for this trade. Example: High-probability setup with exceptional risk/reward ratio confirmed on multiple timeframes..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError("")
              }}
              className="min-h-[120px] resize-none"
            />
            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This reason will be logged with your trade for future review.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel Trade
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleProceed}
            className="flex-1"
          >
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
