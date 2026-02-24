"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, XCircle, Info, Archive, Loader2 } from "lucide-react"
import { useAccountStore } from "@/stores"
import { useTradeStore } from "@/stores"
import { createClient } from "@/lib/supabase/client"
import Papa from "papaparse"
import JSZip from "jszip"

// Notion 2GS Journal columns we look for
const NOTION_HEADERS = ["Pair", "Date of Trade", "Bias", "pnl"]

function isNotionFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.trim().toLowerCase())
  return NOTION_HEADERS.every((nh) =>
    lower.includes(nh.toLowerCase())
  )
}

function parseNotionDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  const trimmed = raw.trim()

  // Notion exports dates in various formats, try parsing
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString()
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[\/\-]/)
  if (parts.length === 3) {
    const [day, month, year] = parts
    const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return null
}

function mapNotionDirection(bias: string): "long" | "short" {
  const lower = (bias || "").trim().toLowerCase()
  if (lower === "bullish" || lower === "long" || lower === "buy") return "long"
  return "short"
}

function mapNotionSession(session: string): "Asia" | "London" | "NY" | null {
  const lower = (session || "").trim().toLowerCase()
  if (lower.includes("asia") || lower.includes("asian")) return "Asia"
  if (lower.includes("london") || lower.includes("ldn")) return "London"
  if (lower.includes("ny") || lower.includes("new york") || lower.includes("newyork")) return "NY"
  return null
}

interface NotionRow {
  [key: string]: string
}

function mapNotionRow(
  row: NotionRow,
  userId: string,
  accountId: string,
  currency: string
) {
  const symbol = (row["Pair"] || "").trim()
  if (!symbol) return null

  const entryDate = parseNotionDate(row["Date of Trade"] || "")
  if (!entryDate) return null

  const direction = mapNotionDirection(row["Bias"] || "")
  const pnl = parseFloat(row["pnl"] || "0") || 0
  const strategy = (row["POI"] || "").trim() || null
  const session = mapNotionSession(row["Session"] || "")
  const outcome = (row["Outcome"] || "").trim()

  // Build notes from outcome
  let notes: string | null = null
  if (outcome) {
    notes = `Outcome: ${outcome}`
  }

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    account_id: accountId,
    symbol,
    direction,
    entry_date: entryDate,
    exit_date: entryDate, // Same day - trade is closed
    entry_price: null,
    stop_price: null,
    exit_price: null,
    size: null,
    pnl,
    currency,
    strategy,
    session,
    notes,
    status: "closed" as const,
  }
}

function mapGenericRow(
  row: Record<string, string>,
  userId: string,
  accountId: string,
  currency: string
) {
  const symbol = (row.symbol || "").trim()
  if (!symbol) return null

  const entryDate = row.entry_date ? new Date(row.entry_date).toISOString() : null
  if (!entryDate) return null

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    account_id: accountId,
    symbol,
    direction: ((row.direction || row.trade_type || "long").trim().toLowerCase()) as "long" | "short",
    entry_date: entryDate,
    exit_date: row.exit_date ? new Date(row.exit_date).toISOString() : null,
    entry_price: row.entry_price ? parseFloat(row.entry_price) : null,
    stop_price: null,
    exit_price: row.exit_price ? parseFloat(row.exit_price) : null,
    size: row.quantity ? Math.floor(parseFloat(row.quantity)) : null,
    pnl: parseFloat(row.pnl || "0") || 0,
    currency,
    strategy: (row.strategy || "").trim() || null,
    notes: (row.notes || "").trim() || null,
    tags: row.tags ? row.tags.trim() : null,
    fees: row.fees ? Math.abs(parseFloat(row.fees)) : null,
    status: (row.exit_date ? "closed" : "open") as "open" | "closed",
  }
}

async function extractCSVFromZip(file: File): Promise<{ csvText: string; csvName: string } | null> {
  const zip = await JSZip.loadAsync(file)

  // First pass: look for a .csv file at any depth
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && name.toLowerCase().endsWith(".csv")) {
      const text = await entry.async("text")
      return { csvText: text, csvName: name.split("/").pop() || name }
    }
  }

  // Second pass: Notion sometimes wraps everything in a nested ZIP — unpack and retry
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && name.toLowerCase().endsWith(".zip")) {
      try {
        const innerData = await entry.async("arraybuffer")
        const innerZip = await JSZip.loadAsync(innerData)
        for (const [innerName, innerEntry] of Object.entries(innerZip.files)) {
          if (!innerEntry.dir && innerName.toLowerCase().endsWith(".csv")) {
            const text = await innerEntry.async("text")
            return { csvText: text, csvName: innerName.split("/").pop() || innerName }
          }
        }
      } catch {
        // Not a valid zip — skip
      }
    }
  }

  return null
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [extracting, setExtracting] = React.useState(false)
  const [detectedFormat, setDetectedFormat] = React.useState<"notion" | "generic" | null>(null)
  const [previewRows, setPreviewRows] = React.useState<Record<string, string>[]>([])
  const [csvText, setCsvText] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [wasZip, setWasZip] = React.useState(false)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("")
  const [importResult, setImportResult] = React.useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const [parseError, setParseError] = React.useState<string | null>(null)

  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch accounts on mount
  React.useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Auto-select first account
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

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
    const file = files.find((f) => f.name.endsWith(".csv") || f.name.endsWith(".zip"))
    if (file) {
      processFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setImportResult(null)
    setParseError(null)
    setFileName(file.name)

    if (file.name.toLowerCase().endsWith(".zip")) {
      // Extract CSV from ZIP
      setExtracting(true)
      setWasZip(true)
      try {
        const result = await extractCSVFromZip(file)
        if (!result) {
          setParseError("No CSV file found inside the ZIP. Make sure you exported with 'Markdown & CSV' format and that the ZIP contains a .csv file. If Notion exported a nested ZIP, the importer will unpack it automatically — try re-downloading the export from Notion and uploading again.")
          setExtracting(false)
          return
        }
        setCsvText(result.csvText)
        setFileName(result.csvName)
        previewCSVText(result.csvText)
      } catch {
        setParseError("Failed to read ZIP file. The file may be corrupted.")
      }
      setExtracting(false)
    } else {
      // Read CSV directly
      setWasZip(false)
      const text = await file.text()
      setCsvText(text)
      previewCSVText(text)
    }
  }

  const previewCSVText = (text: string) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        const headers = results.meta.fields || []
        const format = isNotionFormat(headers) ? "notion" : "generic"
        setDetectedFormat(format)
        setPreviewRows(results.data as Record<string, string>[])
      },
      error: () => {
        setDetectedFormat(null)
        setPreviewRows([])
        setCsvText(null)
        setParseError("Could not parse the CSV file. Check the file format.")
      },
    })
  }

  const handleImport = async () => {
    if (!csvText || !selectedAccountId) return

    setImporting(true)
    setImportResult(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (!user) {
      setImporting(false)
      return
    }

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
    const currency = selectedAccount?.currency || "USD"

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const tradesToInsert: any[] = []

        for (let i = 0; i < rows.length; i++) {
          try {
            const mapped =
              detectedFormat === "notion"
                ? mapNotionRow(rows[i], user.id, selectedAccountId, currency)
                : mapGenericRow(rows[i], user.id, selectedAccountId, currency)

            if (mapped) {
              tradesToInsert.push(mapped)
            } else {
              failedCount++
              errors.push(`Row ${i + 1}: Missing required fields (symbol or date)`)
            }
          } catch (err: any) {
            failedCount++
            errors.push(`Row ${i + 1}: ${err.message || "Parse error"}`)
          }
        }

        // Batch insert all valid trades via server-side API (bypasses RLS)
        if (tradesToInsert.length > 0) {
          const res = await fetch('/api/trades/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trades: tradesToInsert }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            failedCount += tradesToInsert.length
            errors.push(`Database error: ${body.error || `HTTP ${res.status}`}`)
          } else {
            const body = await res.json()
            successCount = body.inserted ?? 0
            failedCount += body.failed ?? 0
            if (body.errors?.length) {
              errors.push(...body.errors)
            }
          }
        }

        setImportResult({
          success: successCount,
          failed: failedCount,
          errors: errors.slice(0, 10),
        })
        setImporting(false)

        if (successCount > 0) {
          await fetchTrades()
        }
      },
      error: (error) => {
        setImportResult({
          success: 0,
          failed: 1,
          errors: [`CSV parse error: ${error.message}`],
        })
        setImporting(false)
      },
    })
  }

  const resetUpload = () => {
    setCsvText(null)
    setFileName(null)
    setWasZip(false)
    setDetectedFormat(null)
    setPreviewRows([])
    setImportResult(null)
    setParseError(null)
    setExtracting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <CardTitle>Import Trades</CardTitle>
          </div>
          <CardDescription>
            Upload CSV or ZIP files to import your trading history. Supports the 2GS Notion Journal format.
          </CardDescription>
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
              {/* Account Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Import to Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency || "USD"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Area */}
              {!csvText && !extracting && !parseError && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg
                    cursor-pointer transition-colors
                    ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium mt-4">
                    {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">CSV or ZIP files (Notion exports as ZIP)</p>
                </div>
              )}

              {/* Extracting ZIP */}
              {extracting && (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-lg font-medium">Extracting CSV from ZIP...</p>
                    <p className="text-sm text-muted-foreground mt-1">Reading {fileName}</p>
                  </div>
                </div>
              )}

              {/* Parse Error */}
              {parseError && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-red-900 dark:text-red-300">Import Error</p>
                      <p className="text-sm text-red-800 dark:text-red-400 mt-1">{parseError}</p>
                    </div>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Try another file
                  </button>
                </div>
              )}

              {/* Format Detection + Preview */}
              {csvText && !importResult && (
                <div className="space-y-4">
                  {/* Detected format badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {wasZip ? (
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{fileName}</span>
                      {wasZip && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          Extracted from ZIP
                        </span>
                      )}
                      {detectedFormat === "notion" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          2GS Notion format
                        </span>
                      )}
                      {detectedFormat === "generic" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Generic CSV format
                        </span>
                      )}
                    </div>
                    <button
                      onClick={resetUpload}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      Choose different file
                    </button>
                  </div>

                  {/* Preview table */}
                  {previewRows.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              {Object.keys(previewRows[0]).map((header) => (
                                <th key={header} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, i) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-2 max-w-[200px] truncate whitespace-nowrap">
                                    {val || <span className="text-muted-foreground">-</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                        Showing first {previewRows.length} rows
                      </div>
                    </div>
                  )}

                  {/* Import button */}
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import Trades
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div className="space-y-4">
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
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={resetUpload}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Import another file
                  </button>
                </div>
              )}

              {/* Notion Export Instructions */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">How to export from the 2GS Notion Journal:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Open your 2GS Trading Journal in Notion</li>
                      <li>Click the <strong>...</strong> (three dots) menu in the top right corner</li>
                      <li>Select <strong>Export</strong></li>
                      <li>Set Export format to <strong>Markdown & CSV</strong></li>
                      <li>Set Include databases to <strong>Current view</strong></li>
                      <li>Set Include content to <strong>Everything</strong></li>
                      <li>Leave subpages toggles <strong>off</strong></li>
                      <li>Click <strong>Export</strong> and save the file</li>
                      <li>Upload the <strong>ZIP file directly</strong> here - we'll extract the CSV automatically</li>
                    </ol>

                    <div className="pt-2 border-t border-border">
                      <p className="font-semibold text-sm mb-1">Column Mapping (2GS Notion):</p>
                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <span>Pair &rarr; Symbol</span>
                        <span>Date of Trade &rarr; Trade Date</span>
                        <span>Bias &rarr; Direction (Bullish=Long)</span>
                        <span>POI &rarr; Strategy</span>
                        <span>pnl &rarr; P&L</span>
                        <span>Session &rarr; Session</span>
                        <span>Outcome &rarr; Notes</span>
                        <span>Chart &rarr; Skipped</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <p className="font-semibold text-sm mb-1">Generic CSV Format:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                        symbol,entry_date,exit_date,direction,entry_price,exit_price,quantity,pnl,fees,strategy,notes,tags
                      </code>
                    </div>
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
