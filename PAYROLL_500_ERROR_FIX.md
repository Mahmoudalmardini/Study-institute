# Fix Payroll 500 Errors

## Problem
The payroll page shows 500 errors for:
- `/api/payroll/salaries` 
- `/api/payroll/hour-requests/pending`

## Root Cause
The 500 errors are likely because:
1. **Database tables don't exist** - Payroll migrations haven't been run
2. **Database connection issue** - Backend can't connect to database
3. **Query error** - Prisma query is failing

## Solution

### Step 1: Check Railway Deploy Logs

Go to Railway Dashboard → Your Service → **Deploy Logs** tab

Look for:
```
✅ Database migrations completed successfully!
```

OR

```
❌ Error running migrations
```

### Step 2: Verify Migrations Were Run

The payroll tables should exist:
- `teacher_salaries`
- `hour_requests`
- `monthly_payroll_records`

### Step 3: Check Backend Logs

In Railway → Service → **Logs** tab, look for:
```
Error in getAllSalaries: ...
Error in getPendingHourRequests: ...
```

The error handling I added will show the actual error.

## Common Issues

### Issue 1: Migrations Not Run
**Fix:** Railway should run migrations automatically via `start.sh`, but if not:
1. Check Railway Deploy Logs
2. Look for migration errors
3. Manually run: `npx prisma migrate deploy`

### Issue 2: Database Tables Missing
**Fix:** 
1. Check if migrations exist: `backend/prisma/migrations/`
2. Look for migration: `*_add_payroll_models/migration.sql`
3. If missing, migrations need to be created

### Issue 3: Database Connection
**Fix:**
1. Check Railway → Settings → Variables
2. Verify `DATABASE_URL` is set correctly
3. Check database service is running

## What I've Done

✅ Added error handling to `getAllSalaries()` method
✅ Added error handling to `getPendingHourRequests()` method
✅ Added try-catch blocks to log actual errors

## Next Steps

1. **Wait for Railway deployment** (commit `45ddf31`)
2. **Check Railway Deploy Logs** for migration status
3. **Check Railway Logs** for actual error messages
4. **Share the error logs** so I can fix the specific issue

The error handling will now show the exact error in the logs, making it easier to diagnose!

