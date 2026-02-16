'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Beaker,
  Calendar,
  Users,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface GuideStep {
  icon: React.ElementType
  title: string
  description: string
  features: string[]
}

const guideSteps: GuideStep[] = [
  {
    icon: Rocket,
    title: 'Welcome to Your Trading Journal',
    description:
      'Your all-in-one platform for logging trades, tracking performance, and becoming a better trader. Let us show you around.',
    features: [
      'Log and analyze every trade you take',
      'Track your P&L, win rate, and key metrics',
      'Build and refine your trading playbook',
      'Connect with mentors and the trading community',
    ],
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard & Analytics',
    description:
      'Your home base. Get a complete overview of your trading performance at a glance.',
    features: [
      'Key metrics: Net P&L, Win Rate, Profit Factor, Avg Win/Loss',
      'Equity curve and calendar heatmap',
      'Breakdown charts by day, symbol, and playbook',
      'Filter by date range, account, symbol, or strategy',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Trades',
    description:
      'Log and manage all your trades in one place. Every detail matters for your growth.',
    features: [
      'Record entries, exits, quantity, and P&L',
      'Tag trades with setups, strategies, and notes',
      'Track emotions and screenshots for review',
      'Click "+ New Trade" in the sidebar to get started',
    ],
  },
  {
    icon: BookOpen,
    title: 'Playbook & Strategies',
    description:
      'Build a structured playbook of your trading setups and review your performance weekly.',
    features: [
      'Define your trading rules and setups',
      'Link playbook entries to actual trades',
      'Weekly Reviews to reflect on what worked',
      'Track which setups are most profitable',
    ],
  },
  {
    icon: Beaker,
    title: 'Tools',
    description:
      'Powerful tools to sharpen your edge and manage risk effectively.',
    features: [
      'Backtesting Lab: validate strategies on historical data',
      'Performance: track progress over time with detailed stats',
      'Position Calculator: size your trades based on risk rules',
      'Trade Analysis: deep dive into your trading patterns',
    ],
  },
  {
    icon: Calendar,
    title: 'Calendar & Reports',
    description:
      'Visualize your trading activity and generate reports for any time period.',
    features: [
      'Calendar view with daily P&L color-coded',
      'Generate detailed reports by date range',
      'Export and review your trading history',
      'Spot patterns in your best and worst days',
    ],
  },
  {
    icon: Users,
    title: 'Community & Support',
    description:
      'You are not trading alone. Connect with mentors and fellow traders.',
    features: [
      'Browse and connect with approved mentors',
      'Access shared playbooks and published trades',
      'Join the community chat on WHOP',
      'Reach out via Support if you need help',
    ],
  },
]

interface UserGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
  const [step, setStep] = React.useState(0)
  const currentStep = guideSteps[step]
  const Icon = currentStep.icon
  const isLastStep = step === guideSteps.length - 1

  const handleClose = () => {
    try {
      localStorage.setItem('trading_journal_guide_seen', 'true')
    } catch {
      // localStorage may not be available
    }
    setStep(0)
    onOpenChange(false)
  }

  const handleNext = () => {
    if (isLastStep) {
      handleClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1))
  }

  // Reset step when dialog opens
  React.useEffect(() => {
    if (open) setStep(0)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) handleClose()
      else onOpenChange(value)
    }}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">{currentStep.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {currentStep.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 mt-6">
          {guideSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="mt-4 sm:justify-between">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!isLastStep && (
              <Button variant="ghost" onClick={handleClose}>
                Skip
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
