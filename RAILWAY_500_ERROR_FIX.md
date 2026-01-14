# Railway 500 Error Fix Guide

## Problem
Multiple 500 errors on Railway deployment affecting:
- `/api/students` - 500 error
- `/api/classes` - 500 error  
- `/api/subjects` - 500 error
- `/api/users?role=STUDENT` - 500 error
- Frontend error: "Cannot access 'ed' before initialization"

## Root Causes

### 1. Database/Migration Issues
- Migrations may not be running properly on Railway
- Database connection might be failing silently
- Seed script might be failing

### 2. Circular Dependency (Students ↔ Installments)
- Both modules import each other using `forwardRef()`
- This can cause initialization issues in production

### 3. Frontend Build Issues
- Minified code has circular dependencies
- "Cannot access 'ed' before initialization" indicates variable hoisting issue

## Solutions

### Step 1: Check Railway Logs
```bash
# In Railway dashboard, check:
1. Build logs - ensure migrations ran successfully
2. Deploy logs - check for startup errors
3. Runtime logs - look for 500 error details
```

### Step 2: Verify Environment Variables
Ensure these are set in Railway:
```
DATABASE_URL=postgresql://... (auto-set when PostgreSQL linked)
JWT_SECRET=(secure random string)
JWT_REFRESH_SECRET=(secure random string)
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app/api
FRONTEND_URL=https://your-app.up.railway.app
```

### Step 3: Database Migration Check
The 500 errors suggest database tables might not exist. Check if migrations ran:

1. In Railway dashboard → your service → Logs
2. Look for: "📦 Running database migrations..."
3. Should see: "✅ Database migrations completed successfully!"

If migrations failed:
- Check DATABASE_URL is correctly set
- Verify PostgreSQL service is linked
- Try manual migration: Add a one-time deployment command

### Step 4: Fix Circular Dependency
The circular dependency between Students and Installments needs better handling.

**Option A: Remove circular dependency** (Recommended)
- Move shared logic to a separate service
- Use events instead of direct service calls

**Option B: Ensure proper forwardRef usage**
- Already implemented but may need adjustment

### Step 5: Frontend Build Issue
The "Cannot access 'ed' before initialization" error suggests:
- A variable is being used before declaration in minified code
- Likely in one of the page components

Check for:
- Circular imports in frontend code
- Variables declared after use
- Hoisting issues with `const`/`let`

## Quick Fix Steps

### 1. Redeploy with Fresh Build
```bash
# Force rebuild on Railway
git commit --allow-empty -m "Force rebuild"
git push
```

### 2. Check Database Connection
Add this to Railway → Settings → Environment Variables:
```
DATABASE_URL_CHECK=true
```

Then check logs for database connection status.

### 3. Manual Migration (if needed)
If auto-migrations fail, run manually:
1. Railway Dashboard → your service
2. Settings → Deploy → Add override
3. Start Command: `cd /app/backend && npx prisma migrate deploy && cd /app && ./start.sh`

### 4. Enable Debug Logging
Add to Railway environment variables:
```
LOG_LEVEL=debug
DEBUG=*
```

This will show more detailed error messages in logs.

## Expected Behavior After Fix

✅ `/api/students` returns paginated student list
✅ `/api/classes` returns class list
✅ `/api/subjects` returns subject list
✅ `/api/users?role=STUDENT` returns filtered users
✅ Frontend loads without "Cannot access" errors
✅ Admin dashboard shows students, teachers, classes, subjects

## If Still Not Working

1. **Check Railway Logs** - Look for specific error messages
2. **Verify Database** - Ensure PostgreSQL is linked and accessible
3. **Test Locally** - Run `docker-compose up` to test the same setup locally
4. **Check Network** - Ensure Railway internal networking is working
5. **Contact Support** - If all else fails, Railway support can check internal issues

## Monitoring

After deployment, monitor:
- Railway logs for errors
- Frontend console for client errors
- API responses (should be 200, not 500)
- Database connection status

## Prevention

To avoid this in future:
1. Always test with `docker-compose` before deploying
2. Use Railway's preview deployments for testing
3. Monitor logs during deployment
4. Keep dependencies up to date
5. Avoid circular dependencies in code architecture

