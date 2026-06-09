# VocabMemo Deployment Guide

This guide walks you through deploying VocabMemo to Vercel with Supabase backend and Google OAuth integration.

## Prerequisites

- GitHub account
- Vercel account
- Supabase project set up
- Google OAuth credentials configured
- Anthropic API key

## Step 1: Push Code to GitHub

1. Create a new repository on GitHub (e.g., `flashcards-vocab`)

2. Add the remote and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/flashcards-vocab.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in

2. Click "Add New..." → "Project"

3. Import your GitHub repository (`flashcards-vocab`)

4. Under "Environment Variables", add:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

5. Click "Deploy"

6. Once deployed, note your Vercel URL (e.g., `https://flashcards-vocab.vercel.app`)

## Step 3: Update Supabase Configuration

1. Go to your Supabase project → Authentication → Providers

2. **For Google OAuth:**
   - Click on Google provider
   - Under "Redirect URL", add: `https://YOUR_VERCEL_URL/auth/callback`
   - Save

3. **For Site URL:**
   - Go to Authentication → URL Configuration
   - Set "Site URL" to: `https://YOUR_VERCEL_URL`
   - In "Redirect URLs", add your Vercel URL and local dev URL (if needed)

## Step 4: Deploy Edge Function

Deploy the Anthropic integration function:

```bash
supabase functions deploy generate-cards
```

## Step 5: Set Anthropic API Key

Configure the API key for the Edge Function:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx
```

Replace `sk-ant-xxxx` with your actual Anthropic API key.

## Step 6: Apply Database Migration

Push any pending database schema changes:

```bash
supabase db push
```

## Verification

After deployment, verify everything works:

1. Visit your Vercel URL in a browser
2. Test Google OAuth sign-in
3. Create a flashcard theme
4. Generate flashcards (tests the Edge Function)
5. Review flashcards

## Troubleshooting

- **Blank page on SPA routes:** The `vercel.json` rewrites all routes to `index.html`. Ensure it's deployed.
- **OAuth errors:** Double-check the redirect URL in Supabase matches your Vercel URL exactly.
- **Generation fails:** Verify the Anthropic API key is set: `supabase secrets list`
- **Database errors:** Run `supabase db push` again or check Supabase dashboard for errors.

## Next Steps

- Set up CI/CD in GitHub Actions (optional)
- Monitor your Vercel analytics
- Configure custom domain in Vercel settings
