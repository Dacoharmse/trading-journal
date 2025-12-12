# Complete Mentorship System Migration Guide

This guide will help you apply all necessary database migrations for the mentorship system.

## Migrations to Apply (In Order)

Apply these migrations in your Supabase SQL Editor at:
`https://dcodkkmamshucctkywbf.supabase.co/project/_/sql`

### 1. Core Mentorship Tables (REQUIRED)
**File:** `FIXED_MENTORSHIP_MIGRATION.sql`

This creates:
- ✅ `mentorship_connections` - Student-mentor relationships
- ✅ `trade_review_requests` - Trade review requests from students
- ✅ `mentor_notifications` - Notifications for mentors
- ✅ `published_trades` - Educational trades published by mentors

### 2. Playbook Sharing (REQUIRED for Share Playbooks feature)
**File:** `supabase/migrations/20240121000005_shared_playbooks.sql`

This creates:
- ✅ `shared_playbooks` - Playbooks shared by mentors with students

## What Each Migration Does

### FIXED_MENTORSHIP_MIGRATION.sql
- **Fixes:** "Failed to load students" error
- **Fixes:** "Failed to load trade review requests" error
- **Creates:** Core mentorship infrastructure
- **Enables:** Student management, trade reviews, notifications

### 20240121000005_shared_playbooks.sql
- **Creates:** Playbook sharing system
- **Enables:** Mentors to share playbooks with all students or specific students
- **Features:** Share notes, view shared playbooks, unshare functionality

## How to Apply

1. Open Supabase SQL Editor
2. Copy the contents of `FIXED_MENTORSHIP_MIGRATION.sql`
3. Paste and click "Run"
4. Copy the contents of `supabase/migrations/20240121000005_shared_playbooks.sql`
5. Paste and click "Run"

## What Will Work After Migration

### ✅ Mentor Dashboard (`/mentor`)
- View stats (students, playbooks, trades, rating)
- Quick action cards to navigate
- Full overview of mentorship activities

### ✅ Student Management (`/mentor/students`)
- View all active students
- Search students by name/email
- View student trading journals
- See student performance stats
- Access full student trade history

### ✅ Trade Reviews (`/mentor/reviews`)
- View pending review requests from students
- Provide feedback on student trades
- Track review status (pending, in_progress, completed)
- See trade details with student context

### ✅ Share Playbooks (`/mentor/playbooks`)
**NEW! Fully Comprehensive Playbook Sharing**
- View all your playbooks
- Share with all students or specific students
- Add notes when sharing
- View currently shared playbooks
- Unshare playbooks
- View playbook details (rules, confluences)
- Search and filter playbooks
- Track sharing stats

## New Features in Playbook Sharing

1. **Flexible Sharing Options**
   - Share with all students
   - Share with specific selected students
   - Add notes to help students understand the playbook

2. **Share Management**
   - View all currently shared playbooks
   - Update sharing settings
   - Unshare playbooks
   - Track when playbooks were shared

3. **Playbook Preview**
   - View full playbook details before sharing
   - See all rules (must, should, optional)
   - See all confluences (including primary ones)
   - View rule/confluence weights

4. **Statistics Dashboard**
   - Total playbooks count
   - Shared playbooks count
   - Active students count
   - Active playbooks count

5. **Student Selection**
   - Checkbox-based selection
   - See student names and emails
   - Select multiple students at once

## Recommended Additional Features

The playbook sharing system I created also includes these recommended features:

### 🎯 Smart Sharing
- Share indicators on playbook cards
- Visual feedback for shared vs unshared
- Easy update/reshare functionality

### 📊 Rich Analytics
- View rule and confluence counts
- See playbook categories
- Track active/inactive status

### 🔍 Search & Filter
- Search by playbook name, description, or category
- Quick filtering capabilities

### 💬 Communication
- Add sharing notes to provide context
- Help students understand when/how to use playbooks

### 🎨 Visual Design
- Clean card-based layout
- Color-coded badges for status
- Intuitive icons for actions
- Responsive grid layout

## Troubleshooting

### Error: "Failed to load playbooks"
- Ensure the `playbooks` table exists (should already be there from previous migrations)
- Run the shared_playbooks migration

### Error: "Failed to load students"
- Run the `FIXED_MENTORSHIP_MIGRATION.sql`
- This creates the `mentorship_connections` table

### Error: "relation shared_playbooks does not exist"
- Run `supabase/migrations/20240121000005_shared_playbooks.sql`

## Testing the System

After applying migrations:

1. **Go to `/mentor/playbooks`**
2. You should see your playbooks (if you have any)
3. Click "Share" on any playbook
4. Select sharing options and click "Share Playbook"
5. Check "Currently Shared" section to see shared playbooks
6. Click "View" to see playbook details
7. Click "Unshare" to remove sharing

## Next Steps

After migrations are applied:

1. ✅ Create some playbooks in your journal
2. ✅ Share them with your students
3. ✅ Students will see shared playbooks (student-side view needs to be built)
4. ✅ Track student engagement with playbooks

## Student-Side Features (Recommended Future Work)

- View shared playbooks from mentors
- Copy shared playbooks to own journal
- Rate/feedback on shared playbooks
- Request clarification on playbooks
- Track which playbooks they're using
