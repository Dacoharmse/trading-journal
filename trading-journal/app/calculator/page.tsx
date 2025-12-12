'use client'

import * as React from 'react'
import Script from 'next/script'
import { Calculator, Target, Shield, TrendingUp, Percent } from 'lucide-react'

export default function PositionSizeCalculatorPage() {
  const [scriptLoaded, setScriptLoaded] = React.useState(false)

  React.useEffect(() => {
    // Initialize the calculator after script loads
    if (scriptLoaded && typeof window !== 'undefined' && (window as any).RemoteCalc) {
      (window as any).RemoteCalc({
        Url: "https://fxverify.com",
        TopPaneStyle: "YmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KCMwQTBBMEEgMCUsICMyNDI4MzEgMTAwJSk7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyLWJvdHRvbTogbm9uZTs=",
        BottomPaneStyle: "YmFja2dyb3VuZDogIzE1MTgxZDsgYm9yZGVyOiBzb2xpZCAwcHggIzJhMmUzOTsgY29sb3I6ICM5MTk0YTE7",
        ButtonStyle: "YmFja2dyb3VuZDogIzM0MzU0MDsgY29sb3I6IHdoaXRlOyBib3JkZXItcmFkaXVzOiAyMHB4Ow==",
        TitleStyle: "dGV4dC1hbGlnbjogbGVmdDsgZm9udC1zaXplOiA0MHB4OyBmb250LXdlaWdodDogNTAwOw==",
        TextboxStyle: "YmFja2dyb3VuZDogIzE1MTgxZDsgY29sb3I6ICM5MTk0YTE7IGJvcmRlcjogc29saWQgMHB4ICM5MTk0YTE7",
        ContainerWidth: "100%",
        DefaultInstrument: "XAU.USD",
        HighlightColor: "rgba(0,0,0,1.0)",
        IsDisplayTitle: false,
        IsShowChartLinks: false,
        IsShowEmbedButton: false,
        CompactType: "large",
        Calculator: "position-size-calculator",
        ContainerId: "position-size-calculator-706474"
      })
    }
  }, [scriptLoaded])

  return (
    <div className="flex-1 bg-neutral-950 p-6 min-h-screen">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-50">
              Position Size Calculator
            </h1>
            <p className="text-sm text-neutral-400">
              Calculate your optimal position size based on risk management
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calculator Container - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div id="position-size-calculator-706474" className="min-h-[500px]">
              {!scriptLoaded && (
                <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                  <div className="text-neutral-400 text-sm">
                    Loading calculator...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tips Sidebar */}
          <div className="space-y-4">
            {/* Risk Card */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-950/50">
                  <Shield className="h-4 w-4 text-red-400" />
                </div>
                <h3 className="font-semibold text-neutral-100">1-2% Rule</h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Never risk more than 1-2% of your account on a single trade. This protects your capital during losing streaks.
              </p>
            </div>

            {/* Stop Loss Card */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/50">
                  <Target className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-semibold text-neutral-100">Stop Loss First</h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Always determine your stop loss before calculating position size. Your stop loss defines your risk.
              </p>
            </div>

            {/* Consistency Card */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950/50">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-neutral-100">Be Consistent</h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Use the same risk percentage for every trade. Consistency prevents emotional decisions.
              </p>
            </div>

            {/* Formula Card */}
            <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-900/50">
                  <Percent className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="font-semibold text-blue-100">Formula</h3>
              </div>
              <div className="text-sm text-blue-200 font-mono bg-blue-900/30 rounded-lg p-3">
                Position Size = (Account × Risk%) ÷ (Entry - Stop Loss)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load the external script */}
      <Script
        src="https://fxverify.com/Content/remote/remote-widgets.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
    </div>
  )
}
