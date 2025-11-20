# Mentorship Platform - Complete Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete mentorship platform in your Trading Journal application.

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Supabase project set up
- ✅ Access to Supabase SQL Editor
- ✅ Your user account created in the application
- ✅ Previous migrations run (`migration-add-new-fields.sql` and `migration-add-risk-limits.sql`)

---

## 🗄️ Step 1: Run the Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project: `dcodkkmamshucctkywbf`

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy Migration File**
   - Open `COMPLETE_MENTORSHIP_MIGRATION.sql`
   - Select ALL (Ctrl+A)
   - Copy (Ctrl+C)

4. **Paste and Run**
   - Paste into Supabase SQL Editor
   - Click **Run** (or Ctrl+Enter)
   - Wait for completion (30-60 seconds)

5. **Verify Success**
   - You should see: "Success. No rows returned" with "COMMIT"
   - Check for any error messages in red

### Option B: Using Supabase CLI

```bash
# Make sure you're in the project directory
cd "c:\Users\User\Projects\Trading Jouranal\trading-journal\trading-journal"

# Run the migration
supabase db execute -f COMPLETE_MENTORSHIP_MIGRATION.sql
```

---

## 👤 Step 2: Set Up Your Admin Account

After running the migration, you need to make yourself an admin.

### Find Your User ID

1. **Go to Supabase Dashboard**
2. Click **Authentication** > **Users**
3. Find your email address
4. Copy your **User ID** (UUID format)

### Method 1: Using SQL Editor

```sql
-- Replace YOUR_USER_ID with your actual UUID
UPDATE public.user_profiles
SET role = 'admin',
    is_active = true,
    full_name = 'Your Name'  -- Optional: set your display name
WHERE id = 'YOUR_USER_ID';
```

### Method 2: Set First User as Admin (if you're the only user)

```sql
UPDATE public.user_profiles
SET role = 'admin',
    is_active = true
WHERE id = (
    SELECT id
    FROM auth.users
    ORDER BY created_at
    LIMIT 1
);
```

### Verify Admin Access

```sql
-- Check your profile
SELECT id, email, full_name, role, is_mentor, mentor_approved
FROM public.user_profiles
WHERE email = 'your@email.com';

-- Should show: role = 'admin'
```

---

## 🔐 Step 3: Verify RLS Policies

Run these queries to ensure Row Level Security is working:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'user_profiles', 'mentor_students', 'trade_reviews',
    'notifications', 'public_trades', 'admin_audit_log'
);

-- All should show: rowsecurity = true

-- Check you can access admin features
SELECT COUNT(*) FROM public.admin_audit_log;
-- Should work without error if you're admin
```

---

## 🧪 Step 4: Test the New Features

### Test 1: Admin Dashboard Access

1. **Navigate to**: http://localhost:3000/admin
2. **Expected**: Admin dashboard loads with stats
3. **If access denied**: Your role isn't set to 'admin' - go back to Step 2

### Test 2: Create a Mentor Application

1. **Log in as a regular user** (or create a second account)
2. **Navigate to**: http://localhost:3000/mentor/apply
3. **Fill out application form**
4. **Submit**
5. **As admin**: Go to `/admin/mentors/applications` to review

### Test 3: Notifications

```sql
-- Manually create a test notification
SELECT create_notification(
    'YOUR_USER_ID'::UUID,
    'system_message',
    'Welcome to Mentorship Platform!',
    'Your admin account has been set up successfully.',
    NULL,
    NULL,
    '/admin'
);

-- Check it was created
SELECT * FROM public.notifications WHERE user_id = 'YOUR_USER_ID';
```

### Test 4: Trade Review System

1. **As trader**: Create a trade
2. **Click "Request Review"** on the trade
3. **As admin**: Navigate to `/mentor/reviews` - should see the request
4. **Complete review**
5. **As trader**: Should receive notification

---

## 📊 Step 5: Understand the Database Structure

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_profiles` | Enhanced user data with roles | `role`, `is_mentor`, `mentor_approved` |
| `mentor_students` | Mentor-student connections | `mentor_id`, `student_id`, `status` |
| `trade_reviews` | Review requests and responses | `trade_id`, `trader_id`, `mentor_id`, `status` |
| `review_comments` | Threaded discussions | `review_id`, `user_id`, `parent_comment_id` |
| `shared_playbooks` | Playbooks shared by mentors | `playbook_id`, `mentor_id`, `is_public` |
| `public_trades` | Educational trade posts | `trade_id`, `mentor_id`, `title`, `key_lessons` |
| `notifications` | In-app notifications | `user_id`, `type`, `is_read` |
| `admin_audit_log` | Admin action tracking | `admin_id`, `action`, `target_user_id` |
| `mentor_applications` | Mentor approval workflow | `user_id`, `status`, `reviewed_by` |

### User Roles

- **`admin`**: Full access to everything
- **`mentor`**: Can review trades, share content, publish public trades
- **`trader`**: Standard user (default)
- **`premium`**: Premium features (future)

---

## 🔔 Step 6: Configure Notifications (Optional)

### Email Notifications

To enable email notifications, you need to set up Supabase Auth emails:

1. **Go to**: Supabase Dashboard > Authentication > Email Templates
2. **Create custom template** for:
   - Trade review request
   - Review completed
   - Mentor assigned
   - etc.

### Real-time Notifications

The system automatically uses Supabase Realtime for instant notifications.

To subscribe in your app:

```typescript
// In your notification component
const supabase = createClient()

supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Handle new notification
      console.log('New notification:', payload.new)
      // Show toast, play sound, update badge count, etc.
    }
  )
  .subscribe()
```

---

## 🎨 Step 7: Verify Database Counts

Run these to see what was created:

```sql
-- Tables created
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'user_profiles', 'mentor_students', 'trade_reviews',
    'review_comments', 'shared_playbooks', 'playbook_copies',
    'public_trades', 'trade_likes', 'trade_bookmarks',
    'public_trade_comments', 'notifications',
    'admin_audit_log', 'mentor_applications', 'system_settings'
);
-- Expected: 14 tables

-- Indexes created
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE '%mentor%' OR tablename LIKE '%review%' OR tablename LIKE '%public_trade%';
-- Expected: 40+ indexes

-- RLS policies created
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';
-- Expected: 30+ policies

-- Triggers created
SELECT COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname LIKE 'trigger_%' OR tgname LIKE '%_updated_at%';
-- Expected: 10+ triggers

-- Functions created
SELECT COUNT(*) as function_count
FROM pg_proc
WHERE proname IN (
    'update_updated_at_column',
    'create_notification',
    'notify_mentor_on_review_request',
    'notify_trader_on_review_complete',
    'update_public_trade_like_count',
    'update_mentor_rating',
    'handle_new_user'
);
-- Expected: 7 functions
```

---

## 🛠️ Step 8: Customize System Settings

The migration created some default settings. You can customize them:

```sql
-- View current settings
SELECT * FROM public.system_settings;

-- Update settings
UPDATE public.system_settings
SET value = '50'
WHERE key = 'max_students_per_mentor';

UPDATE public.system_settings
SET value = '24'
WHERE key = 'review_response_time_hours';

-- Add new settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'enable_featured_trades',
    'true',
    'Allow admins to feature trades on homepage'
);
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied for table user_profiles"

**Solution**: RLS policies may not have applied correctly.

```sql
-- Re-enable RLS and re-create policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Re-run the policy creation section from the migration
```

### Issue: "Function create_notification does not exist"

**Solution**: Functions didn't create properly.

```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';

-- If missing, re-run Section 11 of the migration
```

### Issue: Notifications not being created

**Solution**: Check trigger is active.

```sql
-- Check triggers
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname LIKE '%notify%';

-- If tgenabled = 'D' (disabled), enable it:
ALTER TABLE public.trade_reviews ENABLE TRIGGER trigger_notify_mentor_review_request;
```

### Issue: Can't access admin dashboard

**Solution**: Verify your role.

```sql
-- Check your role
SELECT id, email, role, is_active
FROM public.user_profiles
WHERE email = 'your@email.com';

-- If role != 'admin', fix it:
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

### Issue: Auto user profile creation not working

**Solution**: Check the auth trigger.

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If missing, create it:
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

---

## 📈 Step 9: Populate Test Data (Optional)

For testing purposes, you can create some dummy data:

```sql
-- Create a test mentor
INSERT INTO public.user_profiles (id, email, full_name, role, is_mentor, mentor_approved, mentor_bio, mentor_specialties)
VALUES (
    gen_random_uuid(),
    'mentor@test.com',
    'Test Mentor',
    'mentor',
    true,
    true,
    'Experienced trader specializing in forex and scalping',
    ARRAY['Scalping', 'Forex', 'Risk Management']
);

-- Create some test notifications
INSERT INTO public.notifications (user_id, type, title, message)
SELECT
    id,
    'system_message',
    'Welcome to the Platform',
    'Your account has been set up successfully'
FROM public.user_profiles
WHERE role = 'trader'
LIMIT 5;
```

---

## 🔒 Security Best Practices

### 1. Verify RLS is Enabled

```sql
-- This should return rows
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- If any tables show up, enable RLS:
ALTER TABLE public.TABLE_NAME ENABLE ROW LEVEL SECURITY;
```

### 2. Test Permission Boundaries

```sql
-- As a regular trader, try to access admin features
-- (Should fail with permission denied)
SELECT * FROM public.admin_audit_log;

-- As a regular trader, try to see other users' reviews
-- (Should only see your own)
SELECT * FROM public.trade_reviews;
```

### 3. Enable Audit Logging

Make sure all admin actions are logged:

```typescript
// After any admin action in your app
await logAdminAction(
  'approve_mentor',
  targetUserId,
  { application_id, notes }
)
```

---

## ✅ Verification Checklist

After completing setup, verify:

- [ ] Migration ran successfully without errors
- [ ] Your account has admin role
- [ ] Can access `/admin` dashboard
- [ ] RLS is enabled on all tables (run verification query)
- [ ] At least one notification exists in your account
- [ ] Can create a mentor application
- [ ] Triggers are active (check pg_trigger)
- [ ] Functions were created (check pg_proc)
- [ ] System settings table has default values
- [ ] Auto user profile creation works (create test user)

---

## 📚 Next Steps

Once setup is complete:

1. **Build the UI components** - User management, mentor dashboard, etc.
2. **Test the workflows** - Create reviews, assign mentors, etc.
3. **Customize the features** - Adjust settings, add custom fields
4. **Deploy to production** - Once tested locally

---

## 🆘 Need Help?

### Common SQL Queries

```sql
-- View all mentors
SELECT id, email, full_name, mentor_rating, mentor_total_reviews
FROM public.user_profiles
WHERE is_mentor = true AND mentor_approved = true;

-- View pending mentor applications
SELECT ma.*, up.email, up.full_name
FROM public.mentor_applications ma
JOIN public.user_profiles up ON ma.user_id = up.id
WHERE ma.status = 'pending'
ORDER BY ma.created_at DESC;

-- View active mentorship connections
SELECT
    m.email as mentor_email,
    s.email as student_email,
    ms.assigned_at,
    ms.status
FROM public.mentor_students ms
JOIN public.user_profiles m ON ms.mentor_id = m.id
JOIN public.user_profiles s ON ms.student_id = s.id
WHERE ms.status = 'active';

-- View recent trade reviews
SELECT
    tr.*,
    t.symbol,
    trader.email as trader_email,
    mentor.email as mentor_email
FROM public.trade_reviews tr
JOIN public.trades t ON tr.trade_id = t.id
JOIN public.user_profiles trader ON tr.trader_id = trader.id
LEFT JOIN public.user_profiles mentor ON tr.mentor_id = mentor.id
ORDER BY tr.requested_at DESC
LIMIT 10;

-- View unread notifications count per user
SELECT
    up.email,
    COUNT(*) as unread_count
FROM public.notifications n
JOIN public.user_profiles up ON n.user_id = up.id
WHERE n.is_read = false
GROUP BY up.email
ORDER BY unread_count DESC;
```

---

## 🎉 Congratulations!

Your Trading Journal now has a complete mentorship platform with:
- ✅ Role-based user management
- ✅ Mentor application system
- ✅ Trade review workflow
- ✅ Playbook sharing
- ✅ Public trade feed
- ✅ Social features (likes, comments, bookmarks)
- ✅ Notification system
- ✅ Admin panel with audit logging
- ✅ Complete security with RLS

**Ready to transform your trading education platform!** 🚀
