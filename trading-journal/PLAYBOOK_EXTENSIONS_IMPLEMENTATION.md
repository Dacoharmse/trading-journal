# Playbook Extensions Implementation Guide

## Overview
This document outlines the implementation of extended playbook features including trade details, invalidations, checklist items, and example trades.

## Completed Components

### 1. Database Migration
**File**: `supabase/migrations/20251012_playbook_extensions.sql`

**New Tables**:
- `playbook_trade_details`: Stores details, invalidations, considerations, and checklist items
- `playbook_examples`: Stores example trade images with captions

**New Columns**:
- `playbooks`: `analyst_tf`, `exec_tf`, `best_sessions`, `trading_hours`, `notes_md`
- `trades`: `checklist_checked`, `invalidations`
- `playbook_rubric`: `weight_checklist`

**To Apply**:
```bash
# Run migration against your Supabase instance
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/20251012_playbook_extensions.sql
```

### 2. TypeScript Types
**File**: `types/supabase.ts`

**New Interfaces**:
- `PlaybookTradeDetail`: Trade details with type discriminator
- `PlaybookExample`: Example trades with media URLs
- Extended `Playbook`, `PlaybookRubric`, `Trade` with new fields

### 3. Scoring Logic
**File**: `lib/playbook-scoring.ts`

**Key Features**:
- **Hard invalidations**: Auto-fail (grade F, score 0) if any invalidations present
- **Checklist scoring**: New `weight_checklist` (default 0.3)
- **Rebalanced weights**: rules 0.5, confluences 0.2, checklist 0.3
- **Primary items**: 1.2x multiplier for primary checklist items
- **Enhanced explanations**: Shows invalidation status and checklist compliance

**Usage Example**:
```typescript
const result = scoreSetup({
  rules,
  rulesChecked,
  confluences,
  confChecked,
  checklist,
  checklistChecked,
  invalidations: ['uuid-1', 'uuid-2'], // If present, auto F
  rubric
})
```

### 4. Editor Components

#### TradeDetailsEditor
**File**: `components/playbook/TradeDetailsEditor.tsx`

**Features**:
- Four sections: Trade Details, Invalidations, Considerations, Checklist
- Drag-and-drop reordering within each section
- Primary flag for invalidations (hard stop) and checklist items
- Color-coded sections (red for invalidations, green for checklist)

#### ExamplesEditor
**File**: `components/playbook/ExamplesEditor.tsx`

**Features**:
- Upload/paste example trade screenshots
- Optional captions for each example
- Integrates with existing ChartPaste component
- Gallery view of all examples

## Next Steps (To Complete)

### 5. Update PlaybookEditor
**File**: `components/playbook/PlaybookEditor.tsx`

**Changes Needed**:
1. Add new state for trade details and examples
2. Add new tabs: "Trade Details", "Checklist", "Examples"
3. Update Basics tab with new fields:
   - Analyst timeframe dropdown
   - Execution timeframe dropdown
   - Best sessions (multi-select pills)
   - Trading hours (timezone + time windows)
   - Notes/Guide (markdown textarea)
4. Load/save trade details and examples
5. Update scoring preview to include checklist

**Example Tab Structure**:
```tsx
<Tabs>
  <TabsTrigger value="basics">Basics</TabsTrigger>
  <TabsTrigger value="rules">Rules</TabsTrigger>
  <TabsTrigger value="confluences">Confluences</TabsTrigger>
  <TabsTrigger value="details">Trade Details</TabsTrigger>
  <TabsTrigger value="scoring">Scoring</TabsTrigger>
  <TabsTrigger value="examples">Examples</TabsTrigger>
  <TabsTrigger value="preview">Preview</TabsTrigger>
</Tabs>
```

### 6. Update NewTradeSheet
**File**: `components/trades/NewTradeSheet.tsx`

**Changes Needed**:
1. Load trade details (checklist + invalidations) when playbook selected
2. Render checklist items with Yes/No toggles
3. Render invalidations with checkboxes
4. Show red banner if any invalidations checked
5. Update scoring call to include checklist and invalidations
6. Save `checklist_checked` and `invalidations` fields

**Example UI**:
```tsx
{/* Invalidations Check */}
{invalidations.length > 0 && (
  <div className="border-l-4 border-red-500 bg-red-50 p-4">
    <h4>⚠️ Invalidations</h4>
    {invalidations.map(inv => (
      <label key={inv.id}>
        <input type="checkbox" onChange={...} />
        {inv.label}
      </label>
    ))}
    {hasInvalidations && (
      <div className="text-red-700 font-bold">
        INVALIDATED SETUP → Auto Grade F
      </div>
    )}
  </div>
)}

{/* Checklist */}
{checklist.length > 0 && (
  <div className="space-y-2">
    {checklist.map(item => (
      <label key={item.id}>
        <Switch checked={...} onChange={...} />
        {item.label}
        {item.primary_item && <Badge>Primary</Badge>}
      </label>
    ))}
  </div>
)}
```

### 7. Update BacktestEntryModal
**File**: `components/backtesting/BacktestEntryModal.tsx`

**Changes**: Same as NewTradeSheet - add checklist and invalidations support

### 8. Add Analytics
**New Files Needed**:
- `lib/playbook-analytics.ts`: Helper functions for checklist compliance curves
- Update analytics pages to show:
  - Invalidation rate by playbook
  - Checklist compliance vs expectancy curve
  - Session performance (best_sessions vs off-sessions)

**Example Analytics**:
```typescript
export function getChecklistComplianceCurve(trades: Trade[]) {
  const buckets = [0, 0.25, 0.5, 0.75, 1.0]
  return buckets.map(threshold => ({
    threshold,
    trades: trades.filter(t => getCompliancePct(t) >= threshold),
    expectancy: calculateExpectancy(trades.filter(...))
  }))
}

export function getInvalidationRate(trades: Trade[]) {
  const withInvalidations = trades.filter(t =>
    t.invalidations && t.invalidations.length > 0
  )
  return withInvalidations.length / trades.length
}
```

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create new playbook with all extended fields
- [ ] Add trade details (all 4 types)
- [ ] Upload example images
- [ ] Create trade with checklist - verify scoring
- [ ] Create trade with invalidations - verify auto F
- [ ] Verify grade explanation shows checklist/invalidation status
- [ ] Test rubric weight validation (must sum to 1.0)
- [ ] Verify existing playbooks still work (backwards compatible)

## Migration Path for Existing Data

Existing playbooks will automatically get:
- Default rubric weights (0.5, 0.2, 0.3)
- Empty trade details/examples
- No impact on existing trades

## Key Design Decisions

1. **Hard invalidations**: Instant fail to enforce discipline
2. **Checklist weight**: 30% by default (configurable)
3. **Primary items**: 1.2x multiplier for important checks
4. **Backwards compatible**: Existing playbooks work without changes
5. **Type safety**: Strict discriminated union for detail types

## Performance Notes

- Indexes added for all new foreign keys
- RLS policies mirror existing playbook patterns
- Trade detail loading happens once per playbook selection
- Examples loaded lazily in separate tab

## Future Enhancements

- [ ] Bulk import trade details from templates
- [ ] Share playbook templates with community
- [ ] AI-suggested invalidations based on trade history
- [ ] Automated checklist compliance reports
- [ ] Mobile-optimized checklist entry
