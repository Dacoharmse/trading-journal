# Backtesting Lab - Delete Features Documentation

## Overview

The Backtesting Lab now includes comprehensive delete functionality with proper confirmation dialogs and safety measures.

## Features Implemented

### 1. Delete Individual Backtest ✅

**Location**: Backtest detail page (`/backtesting/[id]`) - Trades Overview tab

**Features**:
- Delete button on each backtest card
- Confirmation dialog showing:
  - Symbol and direction
  - Entry date
  - Result (R)
- Loading state during deletion
- Automatic UI refresh after deletion

**How to Use**:
1. Navigate to a playbook's backtest page
2. Click the "Trades Overview" tab
3. Click the trash icon on any backtest card
4. Review the confirmation dialog
5. Click "Delete Backtest" to confirm

**Code Files**:
- [`app/backtesting/[id]/page.tsx`](app/backtesting/[id]/page.tsx) (lines 124-145, 425-479)
- [`components/backtesting/BacktestTradeCard.tsx`](components/backtesting/BacktestTradeCard.tsx) (lines 108-117)

### 2. Delete All Backtests (Bulk Delete) ✅

**Location**: Backtest detail page (`/backtesting/[id]`) - Header area

**Features**:
- "Delete All" button appears when backtests exist
- Confirmation dialog showing:
  - Total count of backtests to be deleted
  - Warning about what will be permanently deleted
  - Clear warning that action cannot be undone
- Loading state during deletion
- Automatic UI refresh after deletion

**How to Use**:
1. Navigate to a playbook's backtest page
2. Click the red "Delete All" button in the header
3. Review the detailed warning dialog
4. Click "Delete All Backtests" to confirm

**Code Files**:
- [`app/backtesting/[id]/page.tsx`](app/backtesting/[id]/page.tsx) (lines 147-162, 210-226, 481-514)

## Database Structure

**Table**: `backtests`

**RLS Policies**:
- ✅ Users can view their own backtests
- ✅ Users can insert their own backtests
- ✅ Users can update their own backtests
- ✅ Users can delete their own backtests

**Migration**: [`supabase/migrations/20251009_backtests.sql`](supabase/migrations/20251009_backtests.sql)

## API Operations

### Delete Individual Backtest
```typescript
await supabase
  .from('backtests')
  .delete()
  .eq('id', backtestId)
```

### Delete All Backtests for a Playbook
```typescript
await supabase
  .from('backtests')
  .delete()
  .eq('playbook_id', playbookId)
```

## Safety Features

### Individual Delete
1. ✅ Confirmation dialog with backtest details
2. ✅ Loading state prevents double-deletion
3. ✅ Error handling with user feedback
4. ✅ RLS ensures users can only delete their own data
5. ✅ UI automatically refreshes after deletion

### Bulk Delete
1. ✅ Prominent warning with count of items to delete
2. ✅ List of what will be permanently deleted
3. ✅ Bold "cannot be undone" warning
4. ✅ Loading state prevents accidental clicks
5. ✅ Error handling with user feedback
6. ✅ RLS ensures users can only delete their own data

## Testing

### Automated Test Script

Run the test script to verify both delete features:

```bash
npx tsx scripts/test-delete-backtests.ts
```

**Test Coverage**:
- ✅ Individual backtest deletion
- ✅ Bulk deletion (delete all)
- ✅ Data verification before and after deletion
- ✅ RLS policy compliance
- ✅ Data integrity

### Manual Testing Checklist

#### Test Individual Delete
- [ ] Navigate to backtesting lab
- [ ] Select a playbook with backtests
- [ ] Click "Trades Overview" tab
- [ ] Click trash icon on a backtest card
- [ ] Verify confirmation dialog shows correct details
- [ ] Click "Delete Backtest"
- [ ] Verify backtest is removed from list
- [ ] Verify counts update correctly

#### Test Bulk Delete
- [ ] Navigate to backtesting lab
- [ ] Select a playbook with multiple backtests
- [ ] Click "Delete All" button in header
- [ ] Verify warning dialog shows correct count
- [ ] Click "Delete All Backtests"
- [ ] Verify all backtests are removed
- [ ] Verify "No backtests yet" message appears
- [ ] Verify analytics are reset

## UI Components

### Delete Single Backtest Dialog
**Component**: AlertDialog (Shadcn/ui)

**Content**:
- Title: "Delete Backtest?"
- Description with backtest details
- Warning: "This action cannot be undone"
- Actions: Cancel / Delete Backtest

### Delete All Backtests Dialog
**Component**: AlertDialog (Shadcn/ui)

**Content**:
- Title: "Delete All Backtests?"
- Count of backtests to delete
- Warning box with list of what will be deleted
- Bold warning: "This action cannot be undone!"
- Actions: Cancel / Delete All Backtests

## Error Handling

Both delete operations include:
1. Try-catch blocks
2. Console error logging
3. User-friendly alert messages
4. Proper cleanup of loading states

## Future Enhancements

Potential improvements:
- [ ] Soft delete with trash/restore functionality
- [ ] Bulk selection (select multiple, not all)
- [ ] Export before delete option
- [ ] Undo functionality (with time limit)
- [ ] Archive instead of delete
- [ ] Confirmation via typing playbook name

## Related Features

- **Playbook Delete**: See [`PLAYBOOK_DELETE_FEATURES.md`](PLAYBOOK_DELETE_FEATURES.md)
- **Trade Delete**: See trade management documentation

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- Review the test scripts for implementation examples
- Consult the database migration files for schema details
