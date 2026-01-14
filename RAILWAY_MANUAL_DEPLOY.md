# Railway Manual Deployment Instructions

## If Auto-Deploy Isn't Working

### Option 1: Trigger Deployment via Railway Dashboard (RECOMMENDED)

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Click on your project: "Study Institute"
3. Click on your service
4. Go to "Deployments" tab
5. Click the **"Deploy"** button in the top right
6. Select "Deploy latest commit"

### Option 2: Check Railway GitHub Integration

1. Go to Railway Dashboard → Your Project
2. Click "Settings" tab
3. Scroll to "Service Settings"
4. Check "Source Repo" is connected to: `Mahmoudalmardini/Study-institute`
5. Check "Branch" is set to: `main`
6. Check "Auto Deploy" is **enabled** (toggle should be ON)

### Option 3: Manually Trigger from GitHub

1. Go to: https://github.com/Mahmoudalmardini/Study-institute
2. Click "Actions" tab
3. If you have Railway GitHub Action, click "Run workflow"

### Option 4: Use Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

## Verify Latest Commit is on GitHub

Latest commit should be:
```
3a82ebd - Force cache bust: Add ARG to rebuild frontend with standalone output
```

Check here: https://github.com/Mahmoudalmardini/Study-institute/commits/main

## What Should Happen After Deployment

1. Railway detects new commit
2. Starts building Docker image
3. Build logs show:
   ```
   ARG CACHEBUST=2026-01-15-standalone-v2
   RUN npm run build
   ✓ Creating an optimized production build
   ✓ Collecting build traces
   ```
4. Deployment completes
5. Service restarts with new code

## Current Status

✅ All code is pushed to GitHub
✅ Dockerfile has standalone output configuration
✅ next.config.ts has `output: 'standalone'`
✅ ecosystem.config.js uses `server.js`
✅ Cache-bust ARG added to force rebuild

⏳ Waiting for Railway to deploy

## Next Steps

1. **Go to Railway Dashboard NOW**
2. **Click "Deploy" button manually**
3. **Watch build logs**
4. **Wait for "Success" status**
5. **Clear browser cache**
6. **Test the application**

## If Manual Deploy Button Doesn't Exist

Check Railway service settings:
- Service → Settings → Deploy
- Make sure "Auto Deploy" is enabled
- Make sure branch is set to "main"
- Make sure it's connected to the correct GitHub repo

## Contact Railway Support

If nothing works:
1. Go to Railway Dashboard
2. Click the "?" icon (Help)
3. Click "Contact Support"
4. Explain: "Auto-deploy not triggering for new commits"

