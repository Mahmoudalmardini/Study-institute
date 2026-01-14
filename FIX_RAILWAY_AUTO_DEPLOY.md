# Fix Railway Auto-Deploy Not Working

## Problem
When you push to GitHub, Railway is NOT automatically deploying.

## Root Cause
Railway needs to detect GitHub pushes via **webhooks**. If auto-deploy isn't working, it's usually one of these issues:

1. **Auto-deploy is disabled** in Railway settings
2. **GitHub webhook is missing or broken**
3. **Wrong branch configured** in Railway
4. **Repository connection issue**

## Solution: Fix Railway Auto-Deploy

### Step 1: Check Railway Settings

1. Go to Railway Dashboard
2. Click your project: "charming-charisma"
3. Click your service: "Study-institute"
4. Click **"Settings"** tab
5. Scroll to **"Source"** section

**Check these settings:**
- ✅ **Repository:** Should be `Mahmoudalmardini/Study-institute`
- ✅ **Branch:** Should be `main`
- ✅ **Auto Deploy:** Should be **ON** (toggle enabled)

**If Auto Deploy is OFF:**
- Click the toggle to turn it **ON**
- Railway will now auto-deploy on every push

### Step 2: Reconnect GitHub Repository (If Needed)

If the repository connection looks wrong:

1. Railway Dashboard → Your Service → Settings
2. Scroll to **"Source"** section
3. Click **"Disconnect"** (if connected)
4. Click **"Connect GitHub"** or **"Connect Repository"**
5. Select: `Mahmoudalmardini/Study-institute`
6. Select branch: `main`
7. Enable **"Auto Deploy"**
8. Click **"Connect"**

### Step 3: Verify GitHub Webhook

Railway creates a webhook in GitHub to detect pushes:

1. Go to GitHub: https://github.com/Mahmoudalmardini/Study-institute
2. Click **"Settings"** (repo settings, not your profile)
3. Click **"Webhooks"** in left sidebar
4. Look for a webhook from Railway (should show `railway.app` or `railway.xyz`)
5. If webhook is missing or shows errors:
   - Go back to Railway
   - Disconnect and reconnect the repository (Step 2)

### Step 4: Test Auto-Deploy

After fixing settings:

1. Make a small change (or use the test commit below)
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Test: Verify Railway auto-deploy"
   git push origin main
   ```
3. Go to Railway Dashboard → Deployments
4. Within 1-2 minutes, you should see a **new deployment** starting automatically

## Manual Deployment (Temporary Fix)

While fixing auto-deploy, you can manually trigger deployments:

1. Railway Dashboard → Your Service
2. Click **"Deployments"** tab
3. Click **"New Deployment"** button
4. Select **"Deploy latest commit"**
5. Click **"Deploy"**

## Verify Current Status

### Check What Railway is Connected To:

1. Railway Dashboard → Service → Settings → Source
2. Note the repository and branch
3. Verify it matches: `Mahmoudalmardini/Study-institute` / `main`

### Check Latest Commit on GitHub:

Go to: https://github.com/Mahmoudalmardini/Study-institute/commits/main

Latest commit should be visible there.

### Check Railway Deployments:

1. Railway Dashboard → Service → Deployments
2. Latest deployment should match the latest GitHub commit

## Common Issues

### Issue 1: Auto-Deploy Toggle is OFF
**Fix:** Turn it ON in Settings → Source

### Issue 2: Wrong Branch
**Fix:** Change branch to `main` in Settings → Source

### Issue 3: Repository Not Connected
**Fix:** Reconnect repository in Settings → Source

### Issue 4: GitHub Webhook Missing
**Fix:** Disconnect and reconnect repository (this recreates webhook)

### Issue 5: Personal Access Token in Git URL
**Current remote URL uses token directly:**
```
https://ghp_...@github.com/...
```

**This might interfere with webhooks. Consider:**
- Using SSH instead: `git@github.com:Mahmoudalmardini/Study-institute.git`
- Or let Railway handle authentication (disconnect/reconnect)

## Quick Test

Let's create a test commit to verify auto-deploy works:

```bash
# Create a test file
echo "# Auto-deploy test" > .railway-test.md

# Commit and push
git add .railway-test.md
git commit -m "Test: Verify Railway auto-deploy is working"
git push origin main
```

Then watch Railway Dashboard → Deployments. Within 1-2 minutes, a new deployment should start automatically.

## After Fixing

Once auto-deploy is working:
- ✅ Every `git push` will trigger Railway deployment
- ✅ You'll see deployments appear automatically in Railway
- ✅ No need to manually trigger deployments

## Still Not Working?

If auto-deploy still doesn't work after these steps:

1. **Check Railway Status:** https://status.railway.app
2. **Check Railway Logs:** Service → Logs → Look for webhook errors
3. **Contact Railway Support:** Dashboard → Help → Contact Support

---

**The most common fix is simply turning ON the "Auto Deploy" toggle in Railway settings!**

