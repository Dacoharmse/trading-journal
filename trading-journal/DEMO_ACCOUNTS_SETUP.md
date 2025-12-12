# Demo Accounts Setup Guide

## Migration File

The complete migration file has been created:
**`supabase/migrations/20240121000006_student_panel_complete.sql`**

This migration creates:
- `published_trades` table with full RLS policies
- Adds mentor fields to `user_profiles` (specialties, experience_years)
- All necessary indexes and triggers

---

## Step-by-Step Setup

### Step 1: Apply Migrations

Run the migrations in order:

```bash
# Navigate to your project
cd trading-journal/trading-journal

# Apply all migrations
npx supabase db push
```

Or manually in Supabase SQL Editor:

1. `20240121000005_shared_playbooks_fixed.sql` (if not already applied)
2. `20240121000004_trade_review_requests.sql` (if not already applied)
3. `20240121000006_student_panel_complete.sql` (NEW)

---

### Step 2: Create Demo Accounts in Supabase

#### Option A: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"**

**Create Student Account:**
- Email: `student@demo.com`
- Password: `Demo123!Student`
- Auto Confirm User: **YES** ✓
- Click "Create User"

**Create Mentor Account:**
- Email: `mentor@demo.com`
- Password: `Demo123!Mentor`
- Auto Confirm User: **YES** ✓
- Click "Create User"

#### Option B: Using Sign Up (If you have public registration enabled)

Visit your app's signup page and create both accounts manually.

---

### Step 3: Update User Profiles

After creating the auth users, run this SQL in Supabase SQL Editor:

```sql
-- Update Demo Student Profile
UPDATE public.user_profiles
SET
    full_name = 'Demo Student',
    bio = 'Demo student account for testing the student panel features',
    is_mentor = false,
    role = 'user'
WHERE email = 'student@demo.com';

-- Update Demo Mentor Profile
UPDATE public.user_profiles
SET
    full_name = 'Demo Mentor',
    bio = 'Experienced trader with 10+ years in forex and stocks. Specializing in day trading and swing trading strategies.',
    is_mentor = true,
    mentor_approved = true,
    specialties = ARRAY['Day Trading', 'Swing Trading', 'Risk Management', 'Technical Analysis'],
    experience_years = 10,
    role = 'mentor'
WHERE email = 'mentor@demo.com';

-- Create mentorship connection
INSERT INTO public.mentorship_connections (
    mentor_id,
    student_id,
    status
)
SELECT
    (SELECT id FROM public.user_profiles WHERE email = 'mentor@demo.com'),
    (SELECT id FROM public.user_profiles WHERE email = 'student@demo.com'),
    'active'
WHERE
    EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'mentor@demo.com')
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'student@demo.com')
ON CONFLICT DO NOTHING;
```

---

## Demo Credentials

### 🎓 Student Account
```
Email: student@demo.com
Password: Demo123!Student
```

**Access:**
- Student Dashboard: `/student/dashboard`
- Shared Playbooks: `/student/playbooks`
- Educational Trades: `/student/trades`
- Trade Reviews: `/student/reviews`
- Find Mentors: `/student/mentors`

### 👨‍🏫 Mentor Account
```
Email: mentor@demo.com
Password: Demo123!Mentor
```

**Access:**
- Share Playbooks: `/mentor/playbooks`
- Publish Trades: `/mentor/publish`
- Review Requests: `/mentor/reviews`

---

## Step 4: Create Demo Content

### As Mentor (mentor@demo.com):

1. **Create a Playbook:**
   - Go to your playbooks section
   - Create a new playbook (e.g., "Scalping Strategy")
   - Add rules and confluences
   - Save it

2. **Share the Playbook:**
   - Go to `/mentor/playbooks`
   - Click on your playbook
   - Share with "All Students"
   - Add a note like "Great starting strategy for beginners"

3. **Create and Log Trades:**
   - Go to your trade journal
   - Log a few trades (winners and losers)
   - Add chart screenshots if possible
   - Write detailed notes

4. **Publish Educational Trades:**
   - Go to `/mentor/publish`
   - Select trades to publish
   - Add educational content:
     - Title (e.g., "Perfect Setup: EUR/USD Breakout")
     - Description
     - Lessons learned
     - Tags (e.g., "Breakout", "Risk Management")
   - Choose visibility (All Students or Public)
   - Publish

### As Student (student@demo.com):

1. **View Dashboard:**
   - Go to `/student/dashboard`
   - See overview of available content

2. **Browse Shared Playbooks:**
   - Go to `/student/playbooks`
   - View the playbook shared by the mentor
   - Study the rules and confluences

3. **Browse Educational Trades:**
   - Go to `/student/trades`
   - View published trades
   - Read lessons learned
   - Filter by outcome (wins/losses)

4. **Request Trade Review:**
   - Log some of your own trades first
   - Go to `/student/reviews`
   - Click "Request Review"
   - Select a trade
   - Choose the mentor
   - Ask specific questions
   - Submit

5. **Find More Mentors:**
   - Go to `/student/mentors`
   - Browse available mentors
   - Send connection requests

---

## Quick Test Checklist

### ✅ Mentor Features
- [ ] Share playbook with students
- [ ] Publish educational trades
- [ ] View student review requests
- [ ] Provide feedback on student trades

### ✅ Student Features
- [ ] View shared playbooks from mentors
- [ ] Browse published educational trades
- [ ] Request trade reviews from mentors
- [ ] View mentor profiles and stats
- [ ] Send mentor connection requests
- [ ] View dashboard with overview stats

---

## Database Verification

Run this to verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'user_profiles',
    'mentorship_connections',
    'shared_playbooks',
    'published_trades',
    'trade_review_requests',
    'playbooks',
    'trades'
);

-- Check demo accounts
SELECT
    id,
    email,
    full_name,
    is_mentor,
    mentor_approved,
    role
FROM user_profiles
WHERE email IN ('student@demo.com', 'mentor@demo.com');

-- Check mentorship connection
SELECT
    mc.id,
    mc.status,
    m.full_name as mentor_name,
    s.full_name as student_name
FROM mentorship_connections mc
JOIN user_profiles m ON m.id = mc.mentor_id
JOIN user_profiles s ON s.id = mc.student_id
WHERE m.email = 'mentor@demo.com'
AND s.email = 'student@demo.com';
```

---

## Troubleshooting

### Problem: Can't see shared playbooks as student
**Solution:**
- Verify mentorship connection is `status = 'active'`
- Check that playbook `shared_with = 'all_students'`
- Verify RLS policies are enabled

### Problem: Can't publish trades as mentor
**Solution:**
- Verify `is_mentor = true` and `mentor_approved = true`
- Check that trades exist in your journal
- Verify RLS policies on published_trades table

### Problem: Demo accounts not found
**Solution:**
- Create auth users in Supabase Dashboard first
- Then run the UPDATE statements to set profile data
- Verify user_profiles table has matching records

---

## Production Notes

For production use:

1. **Remove demo accounts** or change passwords
2. **Set up proper email confirmation** flow
3. **Configure mentor approval** workflow
4. **Add email notifications** for:
   - New review requests
   - Mentor accepts connection
   - New shared content
5. **Add analytics** to track engagement
6. **Consider rate limiting** on connection requests

---

## Support

If you encounter any issues:
1. Check Supabase logs for RLS policy violations
2. Verify all migrations were applied successfully
3. Check browser console for JavaScript errors
4. Verify authentication is working correctly
