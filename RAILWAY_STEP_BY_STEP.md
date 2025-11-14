# Railway Deployment - Step by Step Fix

## 🚨 Current Error
Railway is using Nixpacks and analyzing the root directory. You need to:
1. Set Root Directory for each service
2. Switch from Nixpacks to Dockerfile builder

---

## 📋 Step-by-Step Instructions

### PART 1: Fix Backend Service

#### Step 1: Open Backend Service
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your project
3. Click on the **Backend** service (or create it if it doesn't exist)

#### Step 2: Set Root Directory
1. Click **Settings** (gear icon on the right)
2. Click **Source** tab
3. Scroll down to **"Root Directory"**
4. **Clear any existing value** (if any)
5. Type: `backend` (lowercase, no quotes, no slashes)
6. Click **"Update"** or **"Save"** button
7. **Wait for confirmation** - you should see a success message

#### Step 3: Change Builder to Dockerfile
1. Still in **Settings**
2. Click **Build** tab
3. Find **"Builder"** dropdown (should say "Nixpacks")
4. Click the dropdown
5. Select **"Dockerfile"**
6. Click **"Update"** or **"Save"**

#### Step 4: Set Start Command (Important!)
1. Still in **Settings** → **Build** tab
2. Scroll to **"Start Command"** section
3. Enable **"Override"** toggle
4. Enter: `npx prisma migrate deploy && node dist/main.js`
5. Click **"Update"** or **"Save"**

#### Step 5: Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** button
3. Or click **"Clear Cache and Redeploy"** (recommended)

---

### PART 2: Fix Frontend Service

#### Step 1: Open Frontend Service
1. In your Railway project
2. Click on the **Frontend** service (or create it if it doesn't exist)

#### Step 2: Set Root Directory
1. Click **Settings** (gear icon)
2. Click **Source** tab
3. Scroll to **"Root Directory"**
4. **Clear any existing value** (if any)
5. Type: `frontend` (lowercase, no quotes, no slashes)
6. Click **"Update"** or **"Save"**
7. **Wait for confirmation**

#### Step 3: Change Builder to Dockerfile
1. Still in **Settings**
2. Click **Build** tab
3. Find **"Builder"** dropdown
4. Change from "Nixpacks" to **"Dockerfile"**
5. Click **"Update"** or **"Save"**

#### Step 4: Set Start Command
1. Still in **Settings** → **Build** tab
2. Scroll to **"Start Command"** section
3. Enable **"Override"** toggle
4. Enter: `npm start`
5. Click **"Update"** or **"Save"**

#### Step 5: Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** button
3. Or click **"Clear Cache and Redeploy"**

---

## ✅ Verification Checklist

After completing the steps above, verify:

- [ ] Backend service: Root Directory = `backend`
- [ ] Backend service: Builder = `Dockerfile`
- [ ] Backend service: Start Command = `npx prisma migrate deploy && node dist/main.js`
- [ ] Frontend service: Root Directory = `frontend`
- [ ] Frontend service: Builder = `Dockerfile`
- [ ] Frontend service: Start Command = `npm start`
- [ ] Both services have been redeployed

---

## 🔍 How to Verify Settings

1. Go to service → **Settings** → **Source**
   - Root Directory should show: `backend` or `frontend`
   - NOT empty, NOT `/backend`, NOT `./backend`

2. Go to service → **Settings** → **Build**
   - Builder should show: `Dockerfile`
   - NOT `Nixpacks`, NOT `Railpack`

3. Check build logs:
   - Go to **Deployments** → Click latest deployment → **Logs**
   - You should see: `Building Docker image...` or `Using Dockerfile`
   - You should NOT see: `Using Nixpacks` or `Railpack`

---

## 🐛 If It Still Fails

### Check 1: Root Directory Not Saving
- Refresh the Railway page
- Go back to Settings → Source
- Verify Root Directory is still set
- If it's empty, set it again and make sure to click "Update"

### Check 2: Dockerfile Not Found
- Verify files exist in your repository:
  - `backend/Dockerfile` ✓
  - `frontend/Dockerfile` ✓
- Push to Git if you haven't already

### Check 3: Build Logs Show Errors
- Go to Deployments → Latest deployment → Logs
- Look for specific error messages
- Common issues:
  - Missing `package.json` → Root Directory not set correctly
  - Docker build fails → Check Dockerfile syntax
  - Port errors → Railway sets PORT automatically, don't hardcode

### Check 4: Try Manual Build Commands
If Dockerfile still doesn't work, use manual commands:

**Backend:**
- Build Command: `cd backend && npm ci && npx prisma generate && npm run build`
- Start Command: `cd backend && npx prisma migrate deploy && node dist/main.js`

**Frontend:**
- Build Command: `cd frontend && npm ci && npm run build`
- Start Command: `cd frontend && npm start`

To set these:
1. Settings → Build
2. Enable "Override" for Build Command
3. Enable "Override" for Start Command
4. Enter commands above
5. Save and redeploy

---

## 📞 Still Need Help?

1. **Check Railway Logs:**
   - Service → Deployments → Latest → Logs
   - Copy the error message

2. **Verify Git Repository:**
   - Make sure all files are pushed to Git
   - Railway pulls from your Git repo

3. **Railway Support:**
   - [Railway Discord](https://discord.gg/railway)
   - [Railway Docs](https://docs.railway.app)

---

## 🎯 Quick Reference

| Service | Root Directory | Builder | Start Command |
|---------|---------------|---------|---------------|
| Backend | `backend` | Dockerfile | `npx prisma migrate deploy && node dist/main.js` |
| Frontend | `frontend` | Dockerfile | `npm start` |

**Remember:** Root Directory must be set BEFORE changing the builder!

