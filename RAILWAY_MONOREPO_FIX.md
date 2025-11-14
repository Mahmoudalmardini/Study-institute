# Railway Monorepo Deployment Fix

## The Problem

If you see this error:
```
✖ Railpack could not determine how to build the app.
The app contents that Railpack analyzed contains:
./backend/
./frontend/
```

This means Railway is analyzing the **root directory** instead of the service directory. This happens because your project is a **monorepo** (multiple services in one repository).

## The Solution

### Step 1: Verify Root Directory Setting

For **EACH service** (Backend and Frontend), you MUST set the Root Directory:

1. Go to your Railway project dashboard
2. Click on the service (Backend or Frontend)
3. Go to **Settings** → **Source**
4. Check the **Root Directory** field:
   - **Backend service**: Must be `backend`
   - **Frontend service**: Must be `frontend`
5. If it's empty or incorrect, set it and **Save**

### Step 2: Use Dockerfile Builder (Recommended)

Dockerfile is more reliable for monorepos:

1. Go to service → **Settings** → **Build**
2. Change **Builder** from "Nixpacks" to **"Dockerfile"**
3. Railway will automatically use:
   - `backend/Dockerfile` for backend service
   - `frontend/Dockerfile` for frontend service
4. Click **Save**
5. Go to **Deployments** → **Redeploy**

### Step 3: Verify Service Structure

Make sure your service directories contain:
- `backend/package.json` ✓
- `backend/Dockerfile` ✓
- `frontend/package.json` ✓
- `frontend/Dockerfile` ✓

## Quick Fix Checklist

- [ ] Backend service: Root Directory = `backend`
- [ ] Frontend service: Root Directory = `frontend`
- [ ] Both services: Builder = `Dockerfile` (not Nixpacks)
- [ ] Saved all settings
- [ ] Redeployed both services

## Why This Happens

Railway's Nixpacks builder looks for `package.json` in the root directory. In a monorepo:
- Root directory has: `backend/`, `frontend/`, `README.md`, etc.
- No `package.json` at root level
- Railway can't detect the project type

**Solution**: Tell Railway which directory to use via "Root Directory" setting.

## Alternative: Manual Build Commands

If Dockerfile still doesn't work, set build commands manually:

**Backend:**
- Build Command: `npm ci && npx prisma generate && npm run build`
- Start Command: `npx prisma migrate deploy && node dist/main.js`

**Frontend:**
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`

To set these:
1. Service → **Settings** → **Build**
2. Enable "Override" for build/start commands
3. Enter the commands above
4. Save and redeploy

## Still Having Issues?

1. **Check Logs**: Service → Deployments → Click deployment → Logs
2. **Verify Root Directory**: Settings → Source → Root Directory must be set
3. **Clear Cache**: Deployments → Redeploy → "Clear Cache and Redeploy"
4. **Use Railway CLI**: Test locally with `railway up` in the service directory

