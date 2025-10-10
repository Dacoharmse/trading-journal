# Vercel Deployment Guide

## ❌ Current Error

The build is failing with:
```
Error: Missing environment variable: NEXT_PUBLIC_SUPABASE_URL
```

This is because Vercel doesn't have access to your `.env.local` file (which is intentionally not committed to Git for security).

---

## ✅ Solution: Add Environment Variables to Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to your Vercel project dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings**
   - Click on **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add the required environment variables**

   Add these two variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `your_supabase_project_url` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_key` | Production, Preview, Development |

   **Where to find these values:**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Click on your project
   - Go to **Project Settings** → **API**
   - Copy:
     - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
     - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Save and Redeploy**
   - Click **Save** after adding each variable
   - Go to **Deployments** tab
   - Click the **⋯** menu on the failed deployment
   - Click **Redeploy**

---

### Option 2: Via Vercel CLI

If you prefer using the command line:

```bash
# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste your Supabase URL when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste your Supabase anon key when prompted

# Also add for preview deployments
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview

# Redeploy
vercel --prod
```

---

## 📋 Complete Deployment Checklist

### Step 1: Set Up Supabase (If Not Done)

- [ ] Create Supabase account at https://supabase.com
- [ ] Create a new project
- [ ] Note down your Project URL and anon key
- [ ] Run database migrations (SQL schema)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Enable Email/Password authentication

### Step 2: Configure Vercel

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` to Vercel environment variables
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel environment variables
- [ ] Ensure both are added to **Production**, **Preview**, and **Development** environments

### Step 3: Redeploy

- [ ] Trigger a new deployment (redeploy the failed one)
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Check deployment logs for any errors
- [ ] Visit your deployed URL

### Step 4: Verify Deployment

- [ ] Open your Vercel deployment URL
- [ ] Test registration/login
- [ ] Create a test account
- [ ] Log a test trade
- [ ] Verify all pages load
- [ ] Check mobile responsiveness

---

## 🔧 Alternative: Use .env.production

If you want to commit environment variables (NOT RECOMMENDED for production with real credentials), you can create a `.env.production` file:

```env
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**⚠️ WARNING:** Only do this for demo/testing purposes. Never commit real credentials to Git!

---

## 🚀 Expected Build Output

After adding environment variables, you should see:

```
✓ Compiled successfully in 20.5s
  Skipping validation of types
  Skipping linting
  Collecting page data ...
  Generating static pages (24/24)
✓ Build completed successfully
```

---

## 🔍 Troubleshooting

### Build Still Fails After Adding Variables

1. **Check variable names are exact:**
   - Must be: `NEXT_PUBLIC_SUPABASE_URL` (not SUPABASE_URL)
   - Must be: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not SUPABASE_KEY)

2. **Ensure no spaces in values:**
   - Values should not have leading/trailing spaces
   - Copy directly from Supabase dashboard

3. **Verify environment selection:**
   - Make sure you added variables to the correct environment
   - For production deploys, check "Production" checkbox

4. **Clear build cache:**
   - In Vercel dashboard, go to Settings → General
   - Scroll to "Build & Development Settings"
   - Try redeploying with "Clear cache and redeploy"

### Different Error After Adding Variables

If you see a different error, check:

1. **TypeScript/ESLint errors:**
   - Already configured in `next.config.ts` to ignore these
   - Should not fail the build

2. **Supabase connection errors:**
   - Verify your Supabase project is active
   - Check the URL and key are correct
   - Ensure Supabase project is not paused

3. **Module not found:**
   - Run `npm install` locally first
   - Commit `package-lock.json` if missing
   - Redeploy

---

## 📊 Vercel Build Settings

Your project should use these settings (usually auto-detected):

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |
| **Development Command** | `npm run dev` |
| **Node Version** | 18.x or higher |

---

## 🎯 Quick Fix Summary

**The fastest way to fix your current deployment:**

1. Go to: https://vercel.com/dashboard → Select project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_SUPABASE_URL` with your Supabase project URL
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your Supabase anon key
4. Select all environments (Production, Preview, Development)
5. Save both variables
6. Go to Deployments → Click on failed deployment → Redeploy

**That's it!** Your build should succeed. ✅

---

## 📞 Need Your Supabase Credentials?

### Where to Find Them:

1. Go to: https://supabase.com/dashboard
2. Select your project (or create one if you haven't)
3. Click on **Settings** (gear icon) in the left sidebar
4. Click on **API** in the settings menu
5. You'll see:
   - **Project URL** → Copy this for `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → Copy the **anon/public** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Don't Have a Supabase Project Yet?

1. Create one at: https://supabase.com/dashboard
2. Click **New Project**
3. Choose organization (or create one)
4. Enter project name: "Trading Journal"
5. Enter database password (save this!)
6. Select region (choose closest to your users)
7. Click **Create new project**
8. Wait ~2 minutes for setup
9. Then follow the steps above to get your credentials

---

## ✅ After Successful Deployment

Once your deployment succeeds:

1. **Get your deployment URL** from Vercel dashboard
2. **Add it to Supabase:**
   - Go to Supabase dashboard → Authentication → URL Configuration
   - Add your Vercel URL to **Site URL**
   - Add `your-vercel-url.vercel.app/auth/callback` to **Redirect URLs**

3. **Test your live application:**
   - Visit your Vercel URL
   - Register a new user
   - Create an account
   - Log a trade
   - Verify everything works

4. **Set up custom domain (optional):**
   - In Vercel dashboard: Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

---

**Need Help?** Check the main [PRODUCTION_READY.md](./PRODUCTION_READY.md) guide for more details.

---

**Last Updated**: 2025-10-10
**Status**: ⚠️ Awaiting environment variable configuration
