# Playbook System Implementation Guide

## Status: Core Components Complete

### ✅ Completed

1. **Database Migration** ([supabase/migrations/20251008_playbooks.sql](supabase/migrations/20251008_playbooks.sql))
   - `playbooks` table with name, category, sessions, symbols, rr_min
   - `playbook_rules` table with type (must/should/optional), weight, sort
   - `playbook_confluences` table with weight, primary flag, sort
   - `playbook_rubric` table with scoring weights and grade cutoffs
   - Trade table updates for playbook_id, rules_checked, confluences_checked, setup_score, setup_grade
   - RLS policies for all tables
   - Seed example "Asia Breakout" playbook

2. **Scoring Engine** ([lib/playbook-scoring.ts](lib/playbook-scoring.ts))
   - `scoreSetup()` - Deterministic grade calculation
   - Weighted scoring with must-rule penalty
   - Primary confluences get 1.2x multiplier
   - Grade mapping (A+ to F) based on cutoffs
   - Helper functions: `getGradeColor()`, `formatScore()`, `getGradeExplanation()`
   - Rubric validation

3. **TypeScript Types** ([types/supabase.ts](types/supabase.ts))
   - `Playbook`, `PlaybookRule`, `PlaybookConfluence`, `PlaybookRubric` interfaces
   - Trade interface updated with playbook fields

4. **SetupChecklist Component** ([components/trades/SetupChecklist.tsx](components/trades/SetupChecklist.tsx))
   - Rules grouped by must/should/optional
   - Confluences with primary indicators
   - Live score & grade display
   - Collapsible sections
   - "Select all primary" quick action
   - Real-time explanation of grade

### 🚧 Remaining Tasks

#### 1. Playbook List Page (`/app/playbook/page.tsx`)

```typescript
- Card grid layout showing all playbooks
- Name, category, sessions, active status
- Quick stats: X rules, Y confluences
- New Playbook button
- Edit/Delete actions
- Filter by category and active status
```

#### 2. Playbook Editor (`/app/playbook/[id]/page.tsx` + components)

**Components needed:**
- `components/playbook/PlaybookEditor.tsx` - Main editor layout with tabs
- `components/playbook/RulesEditor.tsx` - Sortable rules list with type/weight
- `components/playbook/ConfluencesEditor.tsx` - Sortable confluences with primary flag
- `components/playbook/ScoringEditor.tsx` - Rubric editor with sliders
- `components/playbook/PreviewPanel.tsx` - Mock compliance preview

**Features:**
- Basics tab: Name, category, description, sessions (multi), symbols (multi), baseline RR
- Rules tab: Add/edit/delete/reorder rules, set type and weight
- Confluences tab: Add/edit/delete/reorder confluences, mark primary
- Scoring tab: Adjust rubric weights, penalty, grade cutoffs
- Preview tab: Mock checklist with live scoring

#### 3. Update NewTradeSheet

Integrate playbook selection and SetupChecklist:

```typescript
// Add to NewTradeSheet
const [playbookId, setPlaybookId] = useState('')
const [playbook, setPlaybook] = useState<Playbook | null>(null)
const [playbookRules, setPlaybookRules] = useState<PlaybookRule[]>([])
const [playbookConfluences, setPlaybookConfluences] = useState<PlaybookConfluence[]>([])
const [playbookRubric, setPlaybookRubric] = useState<PlaybookRubric | null>(null)
const [rulesChecked, setRulesChecked] = useState<Record<string, boolean>>({})
const [confluencesChecked, setConfluencesChecked] = useState<Record<string, boolean>>({})

// Load playbook data when selected
useEffect(() => {
  if (playbookId) {
    loadPlaybookData(playbookId)
  }
}, [playbookId])

// Calculate score on submit
const handleSubmit = async () => {
  const scoreResult = scoreSetup({
    rules: playbookRules.map(r => ({ id: r.id, type: r.type, weight: r.weight })),
    rulesChecked,
    confluences: playbookConfluences.map(c => ({ id: c.id, weight: c.weight, primary: c.primary_confluence })),
    confChecked: confluencesChecked,
    rubric: playbookRubric!
  })

  const tradeData = {
    ...otherFields,
    playbook_id: playbookId,
    rules_checked: rulesChecked,
    confluences_checked: confluencesChecked,
    setup_score: scoreResult.score,
    setup_grade: scoreResult.grade
  }

  await onSave(tradeData)
}
```

#### 4. Update Trades Table

Add columns in `TradesTable.tsx`:
- Playbook name
- Setup Grade badge (with color)
- Setup Score percentage

#### 5. Update Trade Drawer

Add section in `TradeDrawer.tsx`:

```typescript
{trade.playbook_id && (
  <div className="space-y-2">
    <h4>Setup Quality</h4>
    <GradeBadge grade={trade.setup_grade} score={trade.setup_score} />
    <ComplianceSummary
      rulesChecked={trade.rules_checked}
      confluencesChecked={trade.confluences_checked}
      playbook={playbook}
    />
  </div>
)}
```

#### 6. Migration Script

Create `scripts/migrate-strategies-to-playbooks.ts`:

```typescript
// For each strategy:
// 1. Create playbook with strategy name and type
// 2. Parse rules text into playbook_rules (type=should, weight=1)
// 3. Create default rubric

// For each confluence:
// Link to playbooks or mark global?

// Update trades: strategy_id → playbook_id mapping
```

#### 7. Update Navigation

Replace in main nav:
- Remove "Strategies" link
- Remove "Confluences" link
- Add "Playbooks" link → `/playbook`

#### 8. Analytics Integration

Add to analytics/dashboard:
- Filter by playbook
- Group performance by playbook
- Show avg setup score vs expectancy R
- Chart: "Setup Grade A+ = 0.34R avg, Grade C = -0.08R avg"

### Sample Queries

**Load playbook with children:**
```sql
-- Playbook
SELECT * FROM playbooks WHERE id = $1

-- Rules
SELECT * FROM playbook_rules WHERE playbook_id = $1 ORDER BY sort

-- Confluences
SELECT * FROM playbook_confluences WHERE playbook_id = $1 ORDER BY sort

-- Rubric
SELECT * FROM playbook_rubric WHERE playbook_id = $1
```

**Trades with grade stats:**
```sql
SELECT
  playbook_id,
  setup_grade,
  COUNT(*) as trade_count,
  AVG(r_multiple) as avg_r,
  AVG(setup_score) as avg_score
FROM trades
WHERE playbook_id IS NOT NULL
GROUP BY playbook_id, setup_grade
ORDER BY playbook_id, setup_grade
```

### Testing Checklist

- [ ] Run playbooks migration
- [ ] Create a playbook via UI
- [ ] Add rules (must/should/optional) with weights
- [ ] Add confluences (mark some as primary)
- [ ] Adjust rubric and verify preview updates
- [ ] Create trade with playbook
- [ ] Check/uncheck compliance items and watch grade change
- [ ] Submit trade and verify score/grade stored
- [ ] View trade in table with grade badge
- [ ] Open trade drawer and verify compliance summary
- [ ] Filter trades by playbook in analytics

### File Structure

```
/app
  /playbook
    /page.tsx                     # List view
    /[id]
      /page.tsx                   # Editor view

/components
  /playbook
    /PlaybookEditor.tsx           # Main editor
    /RulesEditor.tsx              # Rules management
    /ConfluencesEditor.tsx        # Confluences management
    /ScoringEditor.tsx            # Rubric editor
    /PreviewPanel.tsx             # Mock scoring preview
  /trades
    /SetupChecklist.tsx           # ✅ Complete
    /GradeBadge.tsx               # Grade display component
    /ComplianceSummary.tsx        # Compliance breakdown

/lib
  /playbook-scoring.ts            # ✅ Complete
  /playbook-api.ts                # Supabase CRUD helpers

/scripts
  /migrate-strategies-to-playbooks.ts  # Migration script

/supabase/migrations
  /20251008_playbooks.sql         # ✅ Complete
```

### Implementation Priority

1. **Playbook List Page** - Simple CRUD to create/view playbooks
2. **Playbook Editor** - Full editor with all tabs
3. **Update NewTradeSheet** - Integrate SetupChecklist
4. **Update Trades Display** - Show grades in table/drawer
5. **Migration Script** - Convert old data
6. **Analytics** - Add playbook insights

### Notes

- SetupChecklist is ready to use - just integrate into NewTradeSheet
- Scoring engine is fully tested and deterministic
- Migration includes seed data for testing
- All database RLS policies in place
- Primary confluences get 1.2x weight multiplier
- Must-rule penalty is customizable per playbook
- Grade cutoffs are editable per playbook
