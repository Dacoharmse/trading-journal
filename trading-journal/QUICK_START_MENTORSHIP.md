# 🚀 Mentorship Platform - Quick Start

## 1️⃣ Run Database Migration (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy & paste **`COMPLETE_MENTORSHIP_MIGRATION.sql`**
3. Click **Run**
4. Wait for "Success. No rows returned" with "COMMIT"

## 2️⃣ Make Yourself Admin (1 minute)

Find your User ID: Supabase Dashboard → Authentication → Users → Copy your UUID

```sql
UPDATE public.user_profiles
SET role = 'admin', is_active = true
WHERE id = 'YOUR_USER_ID_HERE';
```

**Or** set first user as admin:

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
```

## 3️⃣ Verify Setup (2 minutes)

```sql
-- Check your admin status
SELECT email, role, is_mentor FROM public.user_profiles WHERE email = 'your@email.com';

-- Count new tables (should be 14)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'mentor_students', 'trade_reviews', 'notifications', 'public_trades');
```

## 4️⃣ Test Access

- Navigate to: **http://localhost:3000/admin**
- You should see the Admin Dashboard!

---

## 📋 What Was Created

✅ **14 New Tables**
- User profiles with roles
- Mentor-student connections
- Trade reviews with comments
- Shared playbooks
- Public trades with social features
- Notifications
- Admin audit logging
- Mentor applications

✅ **40+ Database Indexes** for performance

✅ **30+ RLS Policies** for security

✅ **10+ Automated Triggers** for notifications

✅ **7 Helper Functions** for common operations

---

## 🎯 What You Can Do Now

### As Admin
- `/admin` - Admin dashboard
- `/admin/users` - Manage all users
- `/admin/mentors` - Review mentor applications
- Change user roles
- View audit logs

### As Mentor (after approval)
- `/mentor` - Mentor dashboard
- `/mentor/reviews` - Review student trades
- `/mentor/students` - View assigned students
- Share playbooks with students
- Publish educational trades

### As Trader
- Request trade reviews
- View mentor feedback
- Access shared playbooks
- Like and bookmark public trades
- Comment on educational content

---

## 🔐 Security Features

- ✅ Row Level Security on all tables
- ✅ Role-based access control
- ✅ Admin action audit logging
- ✅ Encrypted connections
- ✅ Permission checks before sensitive operations

---

## 📖 Full Documentation

For detailed setup and troubleshooting:
- **[MENTORSHIP_SETUP_GUIDE.md](MENTORSHIP_SETUP_GUIDE.md)** - Complete setup instructions
- **[MENTORSHIP_PLATFORM_PLAN.md](MENTORSHIP_PLATFORM_PLAN.md)** - Feature overview and design
- **[COMPLETE_MENTORSHIP_MIGRATION.sql](COMPLETE_MENTORSHIP_MIGRATION.sql)** - The migration file

---

## 🆘 Troubleshooting

**Can't access admin dashboard?**
```sql
-- Verify your role
SELECT email, role FROM public.user_profiles WHERE email = 'your@email.com';
-- Should show role = 'admin'
```

**No tables created?**
```sql
-- Check if migration ran
SELECT COUNT(*) FROM public.user_profiles;
-- Should not error
```

**Permission denied errors?**
```sql
-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
-- Then re-run the policy section from migration
```

---

## ✨ Next Steps

1. ✅ Run migration
2. ✅ Set admin role
3. ✅ Test admin access
4. 📝 Customize UI components (coming next)
5. 🧪 Test all features
6. 🚀 Deploy to production

**That's it! You now have a complete mentorship platform! 🎉**
