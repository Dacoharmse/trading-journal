# Playbook Extensions - Integration Guide

This guide provides step-by-step instructions to integrate the trade details, checklist, and examples features into your existing components.

## 1. Update PlaybookEditor.tsx

### Step 1.1: Add imports
```typescript
import { TradeDetailsEditor, type TradeDetailDraft } from './TradeDetailsEditor'
import { ExamplesEditor, type ExampleDraft } from './ExamplesEditor'
import type { PlaybookTradeDetail, PlaybookExample } from '@/types/supabase'
```

### Step 1.2: Extend BasicsState interface
```typescript
interface BasicsState {
  name: string
  category: (typeof categoryOptions)[number]
  description: string
  sessions: string[]
  symbols: string[]
  rr_min: string
  active: boolean
  // NEW FIELDS
  analyst_tf: string
  exec_tf: string
  best_sessions: string[]
  trading_hours: { tz: string; windows: string[][] } | null
  notes_md: string
}
```

### Step 1.3: Add state for trade details and examples
```typescript
const [tradeDetails, setTradeDetails] = React.useState<TradeDetailDraft[]>([])
const [examples, setExamples] = React.useState<ExampleDraft[]>([])
const [deletedDetailIds, setDeletedDetailIds] = React.useState<string[]>([])
const [deletedExampleIds, setDeletedExampleIds] = React.useState<string[]>([])
```

### Step 1.4: Initialize state from props
```typescript
// In the existing basics useState initialization, add:
analyst_tf: initialPlaybook?.analyst_tf ?? '',
exec_tf: initialPlaybook?.exec_tf ?? '',
best_sessions: initialPlaybook?.best_sessions ?? [],
trading_hours: initialPlaybook?.trading_hours ?? null,
notes_md: initialPlaybook?.notes_md ?? '',
```

### Step 1.5: Add trade details handlers
```typescript
const handleAddDetail = () => {
  const newDetail: TradeDetailDraft = {
    id: crypto.randomUUID(),
    playbook_id: playbookId ?? undefined,
    label: '',
    type: 'detail',
    weight: 1,
    primary_item: false,
    sort: tradeDetails.length,
  }
  setTradeDetails((prev) => [...prev, newDetail])
  markDirty()
}

const handleUpdateDetail = (id: string, updates: Partial<TradeDetailDraft>) => {
  setTradeDetails((prev) =>
    prev.map((detail) => (detail.id === id ? { ...detail, ...updates } : detail))
  )
  markDirty()
}

const handleRemoveDetail = (id: string) => {
  setTradeDetails((prev) => {
    const next = prev.filter((d) => d.id !== id)
    return next.map((d, index) => ({ ...d, sort: index }))
  })
  if (persistedDetailIds.current.has(id)) {
    setDeletedDetailIds((prev) => [...prev, id])
  }
  markDirty()
}

const handleReorderDetails = (fromIndex: number, toIndex: number) => {
  setTradeDetails((prev) => {
    const ordered = [...prev].sort((a, b) => a.sort - b.sort)
    const [moved] = ordered.splice(fromIndex, 1)
    ordered.splice(toIndex, 0, moved)
    return ordered.map((detail, index) => ({ ...detail, sort: index }))
  })
  markDirty()
}
```

### Step 1.6: Add examples handlers
```typescript
const handleAddExample = () => {
  const newExample: ExampleDraft = {
    id: crypto.randomUUID(),
    playbook_id: playbookId ?? undefined,
    media_urls: [],
    caption: null,
    sort: examples.length,
  }
  setExamples((prev) => [...prev, newExample])
  markDirty()
}

const handleUpdateExample = (id: string, updates: Partial<ExampleDraft>) => {
  setExamples((prev) =>
    prev.map((example) => (example.id === id ? { ...example, ...updates } : example))
  )
  markDirty()
}

const handleRemoveExample = (id: string) => {
  setExamples((prev) => prev.filter((e) => e.id !== id))
  if (persistedExampleIds.current.has(id)) {
    setDeletedExampleIds((prev) => [...prev, id])
  }
  markDirty()
}
```

### Step 1.7: Update handleSave to save trade details and examples
```typescript
// In handleSave(), after saving playbook, rules, and confluences, add:

// Save trade details
if (tradeDetails.length > 0) {
  const detailPayload = tradeDetails.map((detail, index) => ({
    id: detail.id,
    playbook_id: currentId,
    label: detail.label.trim(),
    type: detail.type,
    weight: Number(detail.weight) || 0,
    primary_item: detail.primary_item,
    sort: index,
  }))

  const { error: detailError } = await supabase
    .from('playbook_trade_details')
    .upsert(detailPayload)
  if (detailError) throw detailError
}

if (deletedDetailIds.length > 0) {
  const { error: deleteDetailError } = await supabase
    .from('playbook_trade_details')
    .delete()
    .in('id', deletedDetailIds)
  if (deleteDetailError) throw deleteDetailError
  setDeletedDetailIds([])
}

// Save examples
if (examples.length > 0) {
  const examplePayload = examples.map((example, index) => ({
    id: example.id,
    playbook_id: currentId,
    media_urls: example.media_urls,
    caption: example.caption,
    sort: index,
  }))

  const { error: exampleError } = await supabase
    .from('playbook_examples')
    .upsert(examplePayload)
  if (exampleError) throw exampleError
}

if (deletedExampleIds.length > 0) {
  const { error: deleteExampleError } = await supabase
    .from('playbook_examples')
    .delete()
    .in('id', deletedExampleIds)
  if (deleteExampleError) throw deleteExampleError
  setDeletedExampleIds([])
}
```

### Step 1.8: Update Basics tab with new fields
```typescript
// In the Basics tab, after the description field, add:

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
      Analyst Timeframe
    </label>
    <Input
      value={basics.analyst_tf}
      onChange={(e) => {
        setBasics((prev) => ({ ...prev, analyst_tf: e.target.value }))
        markDirty()
      }}
      placeholder="e.g. 15m, 1H, 4H"
    />
  </div>
  <div className="space-y-2">
    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
      Execution Timeframe
    </label>
    <Input
      value={basics.exec_tf}
      onChange={(e) => {
        setBasics((prev) => ({ ...prev, exec_tf: e.target.value }))
        markDirty()
      }}
      placeholder="e.g. 5m, 15m"
    />
  </div>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
    Notes & Guide (Markdown)
  </label>
  <Textarea
    rows={8}
    value={basics.notes_md}
    onChange={(e) => {
      setBasics((prev) => ({ ...prev, notes_md: e.target.value }))
      markDirty()
    }}
    placeholder="# Setup Guide\n\nDetailed narrative of this playbook..."
  />
</div>
```

### Step 1.9: Add new tabs
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="basics">Basics</TabsTrigger>
    <TabsTrigger value="rules">Rules</TabsTrigger>
    <TabsTrigger value="confluences">Confluences</TabsTrigger>
    <TabsTrigger value="details">Trade Details</TabsTrigger>
    <TabsTrigger value="scoring">Scoring</TabsTrigger>
    <TabsTrigger value="examples">Examples</TabsTrigger>
    <TabsTrigger value="preview">Preview</TabsTrigger>
  </TabsList>

  {/* Existing tabs... */}

  <TabsContent value="details" className="mt-4">
    <TradeDetailsEditor
      details={tradeDetails}
      onAddDetail={handleAddDetail}
      onUpdateDetail={handleUpdateDetail}
      onRemoveDetail={handleRemoveDetail}
      onReorderDetails={handleReorderDetails}
    />
  </TabsContent>

  <TabsContent value="examples" className="mt-4">
    <ExamplesEditor
      examples={examples}
      onAddExample={handleAddExample}
      onUpdateExample={handleUpdateExample}
      onRemoveExample={handleRemoveExample}
      userId={userId}
      playbookId={playbookId}
    />
  </TabsContent>
</Tabs>
```

---

## 2. Update NewTradeSheet.tsx

### Step 2.1: Add state for checklist and invalidations
```typescript
const [checklistItems, setChecklistItems] = React.useState<PlaybookTradeDetail[]>([])
const [invalidationItems, setInvalidationItems] = React.useState<PlaybookTradeDetail[]>([])
const [checklistChecked, setChecklistChecked] = React.useState<Record<string, boolean>>({})
const [invalidationsPresent, setInvalidationsPresent] = React.useState<string[]>([])
```

### Step 2.2: Load checklist and invalidations when playbook changes
```typescript
React.useEffect(() => {
  if (!playbookId) {
    setChecklistItems([])
    setInvalidationItems([])
    setChecklistChecked({})
    setInvalidationsPresent([])
    return
  }

  const loadPlaybookDetails = async () => {
    const { data: details } = await supabase
      .from('playbook_trade_details')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('sort')

    if (details) {
      setChecklistItems(
        details.filter((d) => d.type === 'checklist') as PlaybookTradeDetail[]
      )
      setInvalidationItems(
        details.filter((d) => d.type === 'invalidation') as PlaybookTradeDetail[]
      )
    }
  }

  void loadPlaybookDetails()
}, [playbookId, supabase])
```

### Step 2.3: Add UI for invalidations (before checklist section)
```typescript
{invalidationItems.length > 0 && (
  <section className="space-y-4">
    <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-950/20">
      <h3 className="text-lg font-medium text-red-900 dark:text-red-100">
        ⚠️ Invalidation Check
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
        Check any conditions that are present. If any are checked, setup will auto-grade F.
      </p>
      <div className="space-y-2">
        {invalidationItems.map((inv) => (
          <label
            key={inv.id}
            className="flex items-center gap-3 rounded p-2 hover:bg-red-100 dark:hover:bg-red-950/40"
          >
            <input
              type="checkbox"
              checked={invalidationsPresent.includes(inv.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setInvalidationsPresent((prev) => [...prev, inv.id])
                } else {
                  setInvalidationsPresent((prev) => prev.filter((id) => id !== inv.id))
                }
              }}
              className="h-4 w-4"
            />
            <span className="text-sm">{inv.label}</span>
            {inv.primary_item && (
              <Badge className="ml-auto bg-red-600">Hard Stop</Badge>
            )}
          </label>
        ))}
      </div>
      {invalidationsPresent.length > 0 && (
        <div className="mt-3 rounded bg-red-100 p-3 text-center font-bold text-red-900 dark:bg-red-900 dark:text-red-100">
          INVALIDATED SETUP → Auto Grade F
        </div>
      )}
    </div>
  </section>
)}
```

### Step 2.4: Update checklist section
```typescript
{checklistItems.length > 0 && (
  <section className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
      Pre-Trade Checklist
    </h3>
    <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
      {checklistItems.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-3 rounded p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
        >
          <Switch
            checked={checklistChecked[item.id] || false}
            onCheckedChange={(checked) => {
              setChecklistChecked((prev) => ({ ...prev, [item.id]: checked }))
            }}
          />
          <span className="flex-1 text-sm">{item.label}</span>
          {item.primary_item && (
            <Badge className="bg-emerald-600">Primary</Badge>
          )}
        </label>
      ))}
    </div>
  </section>
)}
```

### Step 2.5: Update scoring call in handleSubmit
```typescript
// Replace the existing scoreSetup call with:
const result = scoreSetup({
  rules: playbookRules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    weight: rule.weight,
  })),
  rulesChecked,
  confluences: playbookConfluences.map((conf) => ({
    id: conf.id,
    weight: conf.weight,
    primary: conf.primary_confluence,
  })),
  confChecked: confluencesChecked,
  checklist: checklistItems.map((item) => ({
    id: item.id,
    weight: item.weight,
    primary: item.primary_item,
  })),
  checklistChecked,
  invalidations: invalidationsPresent,
  rubric,
})

setupScore = result.score
setupGrade = result.grade
```

### Step 2.6: Save checklist and invalidations
```typescript
// In the tradeData object:
checklist_checked: playbookId ? checklistChecked : null,
invalidations: playbookId ? invalidationsPresent : null,
```

---

## 3. Update BacktestEntryModal.tsx

Apply the same changes as NewTradeSheet.tsx:
- Add state for checklist and invalidations
- Load details when playbook changes
- Add UI sections
- Update scoring call
- Save to backtest trade

---

## 4. Add Analytics Helper (lib/playbook-analytics.ts)

```typescript
import type { Trade } from '@/types/supabase'

export interface ChecklistComplianceBucket {
  threshold: number
  label: string
  trades: Trade[]
  expectancy: number
  avgR: number
  winRate: number
}

export function getChecklistComplianceCurve(trades: Trade[]): ChecklistComplianceBucket[] {
  const tradesWithChecklist = trades.filter(
    (t) => t.playbook_id && t.checklist_checked && Object.keys(t.checklist_checked).length > 0
  )

  const buckets = [
    { threshold: 0, label: '0-25%' },
    { threshold: 0.25, label: '25-50%' },
    { threshold: 0.5, label: '50-75%' },
    { threshold: 0.75, label: '75-100%' },
    { threshold: 1.0, label: '100%' },
  ]

  return buckets.map(({ threshold, label }) => {
    const bucketTrades = tradesWithChecklist.filter((t) => {
      const checklistChecked = t.checklist_checked as Record<string, boolean>
      const total = Object.keys(checklistChecked).length
      const checked = Object.values(checklistChecked).filter(Boolean).length
      const pct = total > 0 ? checked / total : 0
      return pct >= threshold
    })

    const expectancy = calculateExpectancy(bucketTrades)
    const avgR = calculateAvgR(bucketTrades)
    const winRate = calculateWinRate(bucketTrades)

    return {
      threshold,
      label,
      trades: bucketTrades,
      expectancy,
      avgR,
      winRate,
    }
  })
}

export function getInvalidationRate(trades: Trade[]): number {
  const tradesWithPlaybook = trades.filter((t) => t.playbook_id)
  if (tradesWithPlaybook.length === 0) return 0

  const invalidatedTrades = tradesWithPlaybook.filter(
    (t) => t.invalidations && (t.invalidations as string[]).length > 0
  )

  return invalidatedTrades.length / tradesWithPlaybook.length
}

export function getInvalidationBreakdown(trades: Trade[]): {
  invalidationId: string
  count: number
  avgR: number
}[] {
  const invalidationCounts = new Map<string, { count: number; trades: Trade[] }>()

  trades.forEach((trade) => {
    if (trade.invalidations) {
      const invs = trade.invalidations as string[]
      invs.forEach((invId) => {
        const existing = invalidationCounts.get(invId) || { count: 0, trades: [] }
        invalidationCounts.set(invId, {
          count: existing.count + 1,
          trades: [...existing.trades, trade],
        })
      })
    }
  })

  return Array.from(invalidationCounts.entries()).map(([invId, { count, trades }]) => ({
    invalidationId: invId,
    count,
    avgR: calculateAvgR(trades),
  }))
}

function calculateExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0
  const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0)
  return totalR / trades.length
}

function calculateAvgR(trades: Trade[]): number {
  return calculateExpectancy(trades)
}

function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0
  const wins = trades.filter((t) => (t.r_multiple || 0) > 0).length
  return wins / trades.length
}
```

---

## Testing Checklist

1. ✅ Create new playbook with trade details
2. ✅ Add checklist items and invalidations
3. ✅ Upload example images
4. ✅ Create trade with checklist → verify grade
5. ✅ Create trade with invalidations → verify auto F
6. ✅ Verify scoring includes checklist weight
7. ✅ Test analytics curves

## Key Points

- **Invalidations**: Hard fail (auto F) when any present
- **Checklist**: Scored as 30% of total grade by default
- **Primary items**: 1.2x multiplier
- **Backwards compatible**: Existing playbooks work without changes
