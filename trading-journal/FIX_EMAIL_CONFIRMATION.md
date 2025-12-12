# Fix "Email not confirmed" Error

## Quick Fix (Run SQL in Supabase)

The fastest way to fix the "Email not confirmed" error is to run this SQL in **Supabase SQL Editor**:

```sql
-- Replace 'tester@2gs.com' with your test user's email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'tester@2gs.com'
AND email_confirmed_at IS NULL;
```

**Verify it worked:**
```sql
SELECT
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'tester@2gs.com';
```

You should see `email_confirmed_at` now has a timestamp. The user can now sign in!

---

## Using the Admin Panel (After Setting Up Admin Account)

### Step 1: Make Yourself an Admin

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user account
3. Copy your user ID

4. Run this SQL in **Supabase SQL Editor**:
```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = 'YOUR-USER-ID-HERE';
```

### Step 2: Use the Admin Panel

1. Sign in to your app
2. Navigate to `/admin/users`
3. Find the user with unconfirmed email
4. Click the three dots (⋮) menu
5. Select **"Confirm Email"**
6. Click **"Confirm Email"** in the dialog

The user's email will be confirmed and they can sign in immediately!

---

## For Demo Accounts

If you're setting up demo accounts (student@demo.com / mentor@demo.com), run this:

```sql
-- Confirm demo student email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'student@demo.com'
AND email_confirmed_at IS NULL;

-- Confirm demo mentor email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'mentor@demo.com'
AND email_confirmed_at IS NULL;
```

---

## Alternative: Use Supabase Dashboard

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Users**
3. Find the user
4. Click on the user row
5. Click **"Send email confirmation"** (this sends an email)

OR

6. In the user details, find the **email_confirmed_at** field
7. Click **Edit** and set it to the current timestamp

---

## What Was Added

### 1. Admin User Management Enhancement

File: [app/admin/users/page.tsx](app/admin/users/page.tsx)

**New Features:**
- ✅ "Confirm Email" option in user actions menu
- ✅ Dialog with warning about bypassing email verification
- ✅ Admin can manually confirm any user's email
- ✅ Logs admin action for audit trail

### 2. API Route for Email Confirmation

File: [app/api/admin/confirm-email/route.ts](app/api/admin/confirm-email/route.ts)

**What it does:**
- Checks admin authentication
- Uses Supabase Admin API to update `email_confirmed_at`
- Requires service role key (set in environment variables)

### 3. SQL Scripts

Files:
- [QUICK_FIX_EMAIL_CONFIRMATION.sql](QUICK_FIX_EMAIL_CONFIRMATION.sql)
- Contains ready-to-run SQL for manual confirmation

---

## Important Notes

### Security Considerations

⚠️ **Only confirm emails for:**
- Test accounts you created
- Demo accounts
- Trusted users
- Internal team members

❌ **Do NOT confirm emails for:**
- Unknown users
- Production users without verification
- Suspicious accounts

### Why This Happens

When you create users in Supabase Dashboard with **Auto Confirm User: NO**, the user is created but their email is not confirmed. They need to click the confirmation link sent to their email.

For testing and demo purposes, you can bypass this with:
1. **Auto Confirm User: YES** when creating users in Dashboard
2. Running the SQL script to confirm manually
3. Using the admin panel's "Confirm Email" feature

---

## Recommended Production Setup

For production, you should:

1. **Enable email confirmation** for security
2. **Set up email templates** in Supabase Dashboard
3. **Configure SMTP** for sending emails
4. **Only use manual confirmation** for trusted accounts

The admin panel feature should be used sparingly and only when necessary (e.g., user didn't receive email, testing, emergency access).

---

## Environment Variables Required

For the API route to work, ensure you have:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for admin API
```

The service role key can be found in:
**Supabase Dashboard** → **Settings** → **API** → **Service Role Key**

⚠️ **Keep this key secret!** It bypasses Row Level Security.

---

## Troubleshooting

### Error: "Email not confirmed"
**Fix:** Run the SQL script above or use admin panel

### Error: "Forbidden - Admin access required"
**Fix:** Make sure your user has `role = 'admin'` in user_profiles table

### API route not working
**Fix:** Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

### Still can't sign in
**Fix:** Check Supabase logs for auth errors, verify user exists in both `auth.users` and `user_profiles`

---

## Quick Commands

### Confirm your test user:
```sql
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'tester@2gs.com';
```

### Make yourself admin:
```sql
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Check user status:
```sql
SELECT
    u.email,
    u.email_confirmed_at,
    p.role,
    p.is_active
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE u.email = 'tester@2gs.com';
```

---

That's it! Your user should now be able to sign in without the "Email not confirmed" error.
