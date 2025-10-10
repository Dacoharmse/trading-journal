# Backtesting Lab - Session Delete Feature

## Overview

Added the ability to delete an entire backtest session (all backtests for a playbook) directly from the Backtesting Lab main page.

## Feature Description

### Delete Backtest Session

**Location**: Backtesting Lab main page (`/backtesting`)

**What it does**:
- Deletes ALL backtests associated with a specific playbook
- Preserves the playbook itself (only deletes backtest data)
- Allows users to start fresh backtesting on the same playbook

**When to use**:
- You want to clear all backtest data for a playbook and start over
- You've been testing different variations and want a clean slate
- You want to remove old backtest data while keeping the playbook

## UI Implementation

### Delete Button
- **Location**: On each playbook card (only visible when backtests exist)
- **Appearance**: Red trash icon button next to "View Results" button
- **Tooltip**: "Delete all backtests for this playbook"

### Confirmation Dialog
Shows detailed warning including:
- Playbook name being affected
- Number of backtests to be deleted
- List of what will be permanently deleted:
  - X backtested trades
  - All performance metrics and statistics
  - All charts and images
  - All notes and analysis
- Clear note that playbook will NOT be deleted
- Bold warning: "This action cannot be undone!"

## How to Use

1. Navigate to **Backtesting Lab** (`/backtesting`)
2. Find the playbook card with backtests you want to delete
3. Click the **red trash icon** button
4. Review the confirmation dialog
5. Click **"Delete Session"** to confirm

## Code Implementation

### Main File
**File**: [`app/backtesting/page.tsx`](app/backtesting/page.tsx)

**Key Functions**:

```typescript
// Open delete confirmation dialog
const openDeleteDialog = (playbook: PlaybookWithStats) => {
  setPlaybookToDelete(playbook)
  setDeleteDialogOpen(true)
}

// Delete all backtests for the playbook
const handleDeleteSession = async () => {
  await supabase
    .from('backtests')
    .delete()
    .eq('playbook_id', playbookToDelete.id)

  await loadData() // Refresh the list
}
```

**Changes Made**:
- Added delete button to playbook cards (lines 299-315)
- Added AlertDialog component for confirmation (lines 337-380)
- Added state management for delete operation
- Added loading states to prevent double-clicks

## Database Operations

### Delete Query
```typescript
await supabase
  .from('backtests')
  .delete()
  .eq('playbook_id', playbookId)
```

**What happens**:
1. All backtests with matching `playbook_id` are deleted
2. Playbook remains in database (untouched)
3. User can immediately create new backtests for the same playbook

## Safety Features

1. ✅ **Confirmation Dialog**: Requires explicit user confirmation
2. ✅ **Detailed Warning**: Shows count and list of what will be deleted
3. ✅ **Loading State**: Prevents accidental double-deletion
4. ✅ **RLS Protection**: Users can only delete their own backtest data
5. ✅ **Error Handling**: Graceful error messages if deletion fails
6. ✅ **Playbook Preservation**: Clarifies that playbook will NOT be deleted
7. ✅ **Auto Refresh**: UI updates immediately after deletion

## Testing

### Automated Test
**Script**: [`scripts/test-delete-session.ts`](scripts/test-delete-session.ts)

Run the test:
```bash
npx tsx scripts/test-delete-session.ts
```

**Test Coverage**:
- ✅ Create test backtest session
- ✅ Delete all backtests for playbook
- ✅ Verify playbook still exists
- ✅ Verify all backtests are deleted
- ✅ Data integrity checks

### Manual Testing Checklist

- [ ] Navigate to Backtesting Lab
- [ ] Verify delete button appears on playbook cards with backtests
- [ ] Verify delete button does NOT appear on playbooks without backtests
- [ ] Click delete button
- [ ] Verify confirmation dialog shows correct information:
  - [ ] Playbook name
  - [ ] Backtest count
  - [ ] Warning details
- [ ] Click "Cancel" and verify nothing is deleted
- [ ] Click delete button again
- [ ] Click "Delete Session" and verify:
  - [ ] Loading state appears
  - [ ] Backtests are deleted
  - [ ] Card shows "No backtests yet"
  - [ ] Playbook still appears in list
- [ ] Navigate to playbook detail page
- [ ] Verify can add new backtests

## User Experience

### Before Deletion
```
Asia Range Card:
- Trades: 2
- Win Rate: 100%
- Expectancy: +1.250R
- Profit Factor: ∞
[View Results] [🗑️]
```

### After Deletion
```
Asia Range Card:
- No backtests yet
[Start Testing]
```

## Comparison with Other Delete Features

### 1. Delete Backtest Session (THIS FEATURE)
- **Location**: Backtesting Lab main page
- **Deletes**: All backtests for a playbook
- **Keeps**: The playbook itself

### 2. Delete Individual Backtest
- **Location**: Backtest detail page > Trades Overview tab
- **Deletes**: Single backtest
- **Keeps**: All other backtests and playbook

### 3. Delete All Backtests
- **Location**: Backtest detail page header
- **Deletes**: All backtests for a playbook
- **Keeps**: The playbook itself
- **Note**: Same functionality as Session Delete, different location

## Related Documentation

- [Backtest Delete Features](BACKTEST_DELETE_FEATURES.md) - Individual and bulk delete
- [Playbook Implementation](PLAYBOOK_IMPLEMENTATION.md) - Playbook structure

## Future Enhancements

Potential improvements:
- [ ] Export session data before deleting
- [ ] Archive session instead of delete
- [ ] Soft delete with restore option
- [ ] Batch session deletion (multiple playbooks at once)
- [ ] Session comparison before deletion

## Support

For issues or questions:
- Review the test script for implementation examples
- Check database migration files for schema details
- See related documentation for other delete features
