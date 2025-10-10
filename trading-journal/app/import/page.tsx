"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, XCircle } from "lucide-react"
import { useAccountStore, useTradeStore } from "@/stores"
import Papa from "papaparse"

export default function ImportPage() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [importResult, setImportResult] = React.useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const accounts = useAccountStore((state) => state.accounts)
  const addTrade = useTradeStore((state) => state.addTrade)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find((f) => f.name.endsWith(".csv"))

    if (csvFile) {
      processCSV(csvFile)
    } else {
      alert("Please upload a CSV file")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processCSV(file)
    }
  }

  const processCSV = async (file: File) => {
    if (accounts.length === 0) {
      alert("Please create an account first before importing trades")
      return
    }

    setImporting(true)
    setImportResult(null)

    // Get current user from Supabase
    const { supabase } = await import("@/lib/supabase")
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to import trades")
      setImporting(false)
      return
    }

    const defaultAccount = accounts[0]
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        for (const row of results.data as any[]) {
          try {
            // Skip rows with no symbol
            if (!row.symbol || !row.entry_date) {
              continue
            }

            // Prepare trade object matching database schema
            // Note: account_id is optional in the schema, so we include account_name instead
            const tradeData: any = {
              user_id: user.id,
              symbol: row.symbol.trim(),
              account_name: defaultAccount.name,
              entry_date: new Date(row.entry_date).toISOString(),
              exit_date: row.exit_date ? new Date(row.exit_date).toISOString() : null,
              trade_type: (row.direction || row.trade_type) as "long" | "short",
              entry_price: parseFloat(row.entry_price),
              exit_price: row.exit_price ? parseFloat(row.exit_price) : null,
              quantity: Math.floor(parseFloat(row.quantity)), // Ensure integer
              pnl: parseFloat(row.pnl),
              fees: Math.abs(parseFloat(row.fees) || 0), // Fees must be positive
              status: row.exit_date ? "closed" : "open",
            }

            // Add optional fields only if they exist
            if (row.strategy) tradeData.strategy = row.strategy.trim()
            if (row.notes) tradeData.notes = row.notes.trim()
            if (row.tags) {
              tradeData.tags = row.tags.split(";").map((t: string) => t.trim()).filter(Boolean)
            }

            await addTrade(tradeData)
            successCount++
          } catch (error: any) {
            failedCount++
            const errorMsg = error?.message || JSON.stringify(error) || "Unknown error"
            errors.push(`Row ${successCount + failedCount}: ${errorMsg}`)
            console.error("Import error:", error, "Row data:", row)
          }
        }

        setImportResult({
          success: successCount,
          failed: failedCount,
          errors: errors.slice(0, 10), // Show max 10 errors
        })

        setImporting(false)

        // Refresh trades
        if (successCount > 0) {
          await fetchTrades()
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`)
        setImporting(false)
      },
    })
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <CardTitle>Import Trades</CardTitle>
          </div>
          <CardDescription>Upload CSV files to import your trading history</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
              <XCircle className="h-12 w-12 opacity-50 text-red-500" />
              <div className="text-center">
                <p className="text-lg font-medium">No Account Found</p>
                <p className="text-sm">Please create an account in Settings before importing trades</p>
              </div>
            </div>
          ) : (
            <>
              {/* Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg
                  cursor-pointer transition-colors
                  ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                  ${importing ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {importing ? (
                  <>
                    <Upload className="h-12 w-12 opacity-50 animate-pulse" />
                    <p className="text-lg font-medium mt-4">Importing trades...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium mt-4">
                      {isDragging ? "Drop CSV file here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">CSV files only</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Importing to: <span className="font-semibold">{accounts[0].name}</span>
                    </p>
                  </>
                )}
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">{importResult.success} trades imported</span>
                    </div>
                    {importResult.failed > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-semibold">{importResult.failed} trades failed</span>
                      </div>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="font-semibold text-sm text-red-900 dark:text-red-300 mb-2">Errors:</p>
                      <ul className="text-xs text-red-800 dark:text-red-400 space-y-1">
                        {importResult.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* CSV Format Info */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-sm mb-2">Expected CSV Format:</p>
                    <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                      symbol,entry_date,exit_date,direction,entry_price,exit_price,quantity,pnl,fees,strategy,notes,tags
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      • <strong>Required:</strong> symbol, entry_date, direction, entry_price, quantity, pnl
                      <br />
                      • Dates format: YYYY-MM-DD HH:MM:SS (exit_date optional for open trades)
                      <br />
                      • Direction: long or short
                      <br />
                      • Tags: semicolon separated (e.g., winner;breakout)
                      <br />
                      • Missing fields will use default values (fees=0, notes=null, etc.)
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
