# Trading Journal - Testing Guide

## 🧪 Manual Testing Checklist

Use this guide to systematically test all features before going live.

---

## 1. Authentication & User Management

### Registration
- [ ] Navigate to `/auth/register`
- [ ] Fill in email and password
- [ ] Submit form
- [ ] Verify account is created
- [ ] Check for welcome email (if configured)

### Login
- [ ] Navigate to `/auth/login`
- [ ] Enter credentials
- [ ] Successfully login
- [ ] Redirected to dashboard

### Logout
- [ ] Click logout button
- [ ] Verify session is cleared
- [ ] Redirected to login page

---

## 2. Account Management (`/accounts`)

### Create Account
- [ ] Click "Add New Account"
- [ ] **Live Account**:
  - Enter account name (e.g., "TD Ameritrade Live")
  - Select broker from dropdown
  - Choose "Live Account" type
  - Enter starting balance (e.g., 10000)
  - Select currency (USD)
  - Optionally add trading pairs
  - Submit form
  - Verify account appears in list

- [ ] **Prop Firm Account**:
  - Enter account name (e.g., "FTMO Phase 1")
  - Select "Other / Prop Firm" from broker dropdown
  - Enter custom broker name (e.g., "FTMO")
  - Choose "Prop Firm" type
  - Select phase (Phase 1/2/Funded)
  - Enter starting balance
  - Enter profit target (e.g., 10000)
  - Enter max drawdown (e.g., 5000)
  - Enter daily drawdown limit (e.g., 2500)
  - Set account status (New/Profits/Drawdown)
  - Submit form
  - Verify prop firm progress bars appear

### Edit Account
- [ ] Click edit button on existing account
- [ ] Modify account details
- [ ] Save changes
- [ ] Verify changes are reflected

### Delete Account
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Verify account is removed

### Toggle Active Status
- [ ] Toggle account active/inactive switch
- [ ] Verify badge changes (Active/Inactive)

---

## 3. Trade Management (`/trades`)

### Add Trade
- [ ] Click "New Trade" or navigate to `/trades?new=true`
- [ ] Fill in trade details:
  - Select account
  - Enter symbol (e.g., "SPY")
  - Choose direction (Long/Short)
  - Select session (Asia/London/NY)
  - Enter entry date/time
  - Enter entry price
  - Enter exit price
  - Enter quantity
  - Optionally add strategy, tags
  - Add notes
- [ ] Submit form
- [ ] Verify trade appears in table

### Edit Trade
- [ ] Click on a trade row
- [ ] Trade drawer opens on right
- [ ] Click "Edit Trade"
- [ ] Modify trade details
- [ ] Save changes
- [ ] Verify changes are reflected

### Delete Trade
- [ ] Open trade drawer
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Verify trade is removed

### Bulk Edit
- [ ] Select multiple trades using checkboxes
- [ ] Click "Bulk Edit" button
- [ ] Update common fields (e.g., add tag, change strategy)
- [ ] Apply changes
- [ ] Verify all selected trades are updated

### Filter Trades
- [ ] Use filter toolbar:
  - [ ] Filter by account
  - [ ] Filter by direction (Long/Short)
  - [ ] Filter by session (Asia/London/NY)
  - [ ] Filter by result (Win/Loss)
  - [ ] Filter by date range
- [ ] Verify table updates with filtered results

### Sort Trades
- [ ] Click column headers to sort:
  - [ ] Date (ascending/descending)
  - [ ] Symbol
  - [ ] P&L
  - [ ] Win Rate
- [ ] Verify sorting works correctly

### Export Trades
- [ ] Click "Export" button
- [ ] Choose format (CSV/JSON)
- [ ] Download file
- [ ] Verify data is correct

---

## 4. Journal Entries

### Add Journal Entry
- [ ] Open a trade in the drawer
- [ ] Click "Add Journal Entry"
- [ ] Write entry text
- [ ] Add tags/emotions
- [ ] Save entry
- [ ] Verify entry appears

### Upload Images
- [ ] Click "Upload Image"
- [ ] Select image file (JPG/PNG)
- [ ] Verify image uploads successfully
- [ ] Image appears in trade details
- [ ] Click image to view full size

### Edit Journal Entry
- [ ] Click edit on existing entry
- [ ] Modify text
- [ ] Save changes
- [ ] Verify changes are saved

---

## 5. Dashboard (`/`)

### Overview Metrics
- [ ] View total P&L
- [ ] View win rate
- [ ] View profit factor
- [ ] View Sharpe ratio
- [ ] View total trades count

### Charts
- [ ] Equity curve loads and displays correctly
- [ ] P&L by day/week/month chart displays
- [ ] Win rate chart displays
- [ ] Charts respond to date range filter

### Recent Trades
- [ ] Recent trades list displays
- [ ] Click on trade to view details

### Calendar Heatmap
- [ ] Calendar shows P&L for each day
- [ ] Hover over day shows tooltip
- [ ] Color coding represents profit/loss

---

## 6. Calendar View (`/calendar`)

### Month View
- [ ] Calendar displays current month
- [ ] Navigate to previous/next month
- [ ] Days with trades are highlighted
- [ ] Color indicates profit/loss

### Day Details
- [ ] Click on a day
- [ ] Drawer opens showing trades for that day
- [ ] View daily summary (total P&L, trades, win rate)

### Streaks
- [ ] View current winning/losing streak
- [ ] View longest winning streak
- [ ] View longest losing streak

---

## 7. Reports (`/reports`)

### Generate Report
- [ ] Select date range
- [ ] Select account (or all accounts)
- [ ] Click "Generate Report"
- [ ] Report displays:
  - [ ] Summary statistics
  - [ ] P&L breakdown
  - [ ] Trade distribution
  - [ ] Strategy performance
  - [ ] Best/worst trades

### Export Report
- [ ] Click "Export PDF" (if implemented)
- [ ] Or copy report data

---

## 8. Performance (`/performance`)

### Performance Metrics
- [ ] View detailed performance metrics
- [ ] Monthly performance breakdown
- [ ] Strategy comparison
- [ ] Symbol performance
- [ ] Session performance

### Charts
- [ ] Cumulative P&L chart
- [ ] Drawdown chart
- [ ] Win rate over time
- [ ] R-multiple distribution

---

## 9. Risk Management (`/risk`)

### Risk Metrics
- [ ] View current drawdown
- [ ] View max drawdown
- [ ] View daily drawdown
- [ ] View risk per trade

### Risk Limits
- [ ] View profit targets (for prop accounts)
- [ ] View drawdown limits
- [ ] Warning indicators for breaches

---

## 10. Settings (`/settings`)

### Profile Tab
- [ ] Update full name
- [ ] Update bio
- [ ] Update phone
- [ ] Update country
- [ ] Update experience level
- [ ] Update trading style
- [ ] Save changes
- [ ] Verify changes persist

### Preferences Tab
- [ ] Change theme (Light/Dark/System)
- [ ] Change currency preference
- [ ] Change timezone
- [ ] Change default broker
- [ ] Update display settings
- [ ] Update risk management settings
- [ ] Add trading confluences
- [ ] Save preferences
- [ ] Verify changes persist

### Notifications Tab
- [ ] Toggle email notifications
- [ ] Toggle daily summary
- [ ] Toggle weekly report
- [ ] Toggle trading alerts
- [ ] Save notification preferences

### Security Tab
- [ ] Update password:
  - [ ] Enter current password
  - [ ] Enter new password
  - [ ] Confirm new password
  - [ ] Submit
  - [ ] Verify password changed
- [ ] Enable/Disable 2FA (if implemented)
- [ ] View active sessions

---

## 11. Import (`/import`)

### Import Trades
- [ ] Download CSV template
- [ ] Fill in trade data
- [ ] Upload CSV file
- [ ] Map CSV columns to trade fields
- [ ] Preview import
- [ ] Confirm import
- [ ] Verify trades are imported

---

## 12. Playbook (`/playbook`)

### View Playbooks
- [ ] List of all playbooks displays
- [ ] Filter by category
- [ ] Search playbooks

### Create Playbook
- [ ] Click "New Playbook"
- [ ] Enter playbook name
- [ ] Add description
- [ ] Add rules and criteria
- [ ] Add chart setup
- [ ] Save playbook
- [ ] Verify playbook appears in list

### Edit Playbook
- [ ] Click on playbook
- [ ] Edit details
- [ ] Save changes
- [ ] Verify changes persist

---

## 13. Analytics (`/analytics`)

### Advanced Analytics
- [ ] View time-based analysis
- [ ] View session breakdown
- [ ] View strategy effectiveness
- [ ] View symbol heatmap
- [ ] Filter by date range
- [ ] Filter by account

---

## 14. Mobile Responsiveness

### Test on Mobile
- [ ] Navigate on mobile browser (iOS Safari / Chrome Mobile)
- [ ] All pages render correctly
- [ ] Sidebar collapses to hamburger menu
- [ ] Tables are scrollable
- [ ] Forms are usable
- [ ] Charts display correctly
- [ ] Touch interactions work
- [ ] No horizontal scrolling issues

---

## 15. Edge Cases & Error Handling

### Network Errors
- [ ] Disconnect internet
- [ ] Try to perform actions
- [ ] Verify error messages appear
- [ ] Reconnect internet
- [ ] Verify app recovers gracefully

### Invalid Data
- [ ] Submit form with empty required fields
- [ ] Verify validation messages appear
- [ ] Enter invalid email format
- [ ] Enter invalid numbers
- [ ] Verify appropriate errors shown

### Long Data Sets
- [ ] Import 100+ trades
- [ ] Verify pagination works
- [ ] Verify performance is acceptable
- [ ] Verify charts render correctly

### Image Uploads
- [ ] Try uploading oversized image
- [ ] Try uploading invalid file type
- [ ] Verify appropriate error messages

---

## 16. Browser Compatibility

### Chrome/Edge
- [ ] All features work
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] No console errors
- [ ] Date pickers work correctly

---

## 17. Performance Testing

### Page Load Times
- [ ] Dashboard loads < 3 seconds
- [ ] Trades page loads < 3 seconds
- [ ] Reports generate < 5 seconds

### Interactions
- [ ] Forms submit quickly
- [ ] Tables sort/filter quickly
- [ ] Charts render smoothly
- [ ] No lag in UI interactions

---

## 🐛 Bug Reporting Template

When you find a bug, document it using this template:

```
**Bug Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser: [Chrome 120, Safari 17, etc.]
- Device: [Desktop, iPhone 14, etc.]
- OS: [Windows 11, macOS, etc.]

**Screenshots/Error Messages:**
[Attach if applicable]

**Priority:**
- [ ] Critical (blocks core functionality)
- [ ] High (major feature broken)
- [ ] Medium (minor issue)
- [ ] Low (cosmetic)
```

---

## ✅ Sign-Off Checklist

Before going live, ensure:

- [ ] All critical features tested and working
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] Mobile experience is good
- [ ] Error handling works correctly
- [ ] Data persistence verified
- [ ] Security measures in place
- [ ] Production environment configured
- [ ] Backup strategy in place
- [ ] Monitoring tools set up

---

**Testing Date**: _____________
**Tester**: _____________
**Version**: 1.0.0
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Completed
