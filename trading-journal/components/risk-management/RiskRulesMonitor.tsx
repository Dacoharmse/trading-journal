'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, AlertCircle, Shield } from 'lucide-react'
import type { RiskRule } from '@/lib/risk-calculator'

interface RiskRulesMonitorProps {
  rules: RiskRule[]
}

export function RiskRulesMonitor({ rules }: RiskRulesMonitorProps) {
  const violatedRules = rules.filter((r) => r.status === 'violated')
  const warningRules = rules.filter((r) => r.status === 'warning')
  const okRules = rules.filter((r) => r.status === 'ok')

  const getStatusIcon = (status: RiskRule['status']) => {
    switch (status) {
      case 'violated':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
    }
  }

  const getStatusColor = (status: RiskRule['status']) => {
    switch (status) {
      case 'violated':
        return 'border-red-600 bg-red-50 dark:bg-red-950/20'
      case 'warning':
        return 'border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
      case 'ok':
        return 'border-green-600 bg-green-50 dark:bg-green-950/20'
    }
  }

  const getProgressColor = (current: number, limit: number, status: RiskRule['status']) => {
    const percent = (current / limit) * 100
    if (status === 'violated') return 'bg-red-600'
    if (status === 'warning') return 'bg-yellow-600'
    return 'bg-green-600'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Risk Rules Monitor</CardTitle>
        </div>
        <CardDescription>
          Real-time monitoring of your risk management rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-green-600 bg-green-50 p-3 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{okRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Compliant</p>
          </div>

          <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-3 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{warningRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>

          <div className="rounded-lg border border-red-600 bg-red-50 p-3 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{violatedRules.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Violated</p>
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule) => {
            const percent = Math.min(100, (rule.current / rule.limit) * 100)

            return (
              <div
                key={rule.id}
                className={`rounded-lg border-2 p-4 transition-colors ${getStatusColor(rule.status)}`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(rule.status)}
                    <div>
                      <h4 className="font-semibold">{rule.name}</h4>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {rule.current.toFixed(2)}
                      {rule.unit}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of {rule.limit}
                      {rule.unit}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full transition-all ${getProgressColor(rule.current, rule.limit, rule.status)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {violatedRules.length > 0 && (
          <div className="rounded-lg border-2 border-red-600 bg-red-50 p-4 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-semibold text-red-600">Trading Restrictions Active</h4>
                <p className="text-sm text-muted-foreground">
                  You have violated {violatedRules.length} risk{' '}
                  {violatedRules.length === 1 ? 'rule' : 'rules'}. Review your positions and
                  consider reducing risk exposure.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
