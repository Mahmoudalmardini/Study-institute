# Deployment Guide - Production Fixes

This guide will help you deploy the production fixes to Railway.

## Pre-Deployment Checklist

- [ ] All code changes have been committed to your repository
- [ ] You have access to Railway dashboard
- [ ] Backend service is identified in Railway
- [ ] You have the ability to set environment variables

## Step-by-Step Deployment

### Step 1: Update Railway Environment Variables

1. Log into [Railway Dashboard](https://railway.app/)
2. Select your project
3. Click on the **Backend** service
4. Go to the **Variables** tab
5. Add or update these variables:

```bash
THROTTLE_TTL=60
THROTTLE_LIMIT=100
JWT_EXPIRATION=30m
```

6. Click **Deploy** or wait for automatic redeployment

### Step 2: Deploy Backend Changes

If Railway doesn't auto-deploy:

```bash
# From your project root
git add .
git commit -m "fix: resolve production issues - rate limiting, transactions, error handling"
git push origin main
```

Railway will automatically detect the changes and redeploy.

### Step 3: Deploy Frontend Changes

If you have a separate frontend service on Railway:

1. The frontend changes will be deployed automatically with the backend
2. If separate deployment is needed, Railway will handle it after the git push

### Step 4: Verify Deployment

1. **Check Deployment Status**
   - In Railway dashboard, wait for deployment to complete
   - Look for green checkmarks indicating successful deployment

2. **Check Logs**
   ```bash
   railway logs --tail 100
   ```
   
   Look for:
   - `Prisma Client connected`
   - No connection errors
   - Application started successfully

3. **Test Rate Limiting**
   - Try creating 10 accounts rapidly
   - Should NOT logout
   - Should create all accounts successfully

4. **Test Pagination**
   - Navigate between pages quickly
   - Should work smoothly without errors

5. **Check Logging**
   - Create a test account
   - Check Railway logs for:
     ```
     User created successfully: test@example.com (ID: xxx, Role: STUDENT)
     Student record created for user: test@example.com
     ```

### Step 5: Monitor for 24 Hours

After deployment, monitor:

1. **Railway Logs** - Check for any errors
2. **Database** - Verify no orphaned User records without Student/Teacher records
3. **User Reports** - Confirm no logout issues
4. **Performance** - Check response times haven't degraded

## Rollback Procedure

If critical issues occur:

### Option 1: Quick Rollback (Environment Variables Only)

In Railway dashboard, revert environment variables:
```bash
THROTTLE_LIMIT=10  # Original value
```

This will restore original rate limiting while keeping other improvements.

### Option 2: Full Rollback (Code)

```bash
git revert HEAD
git push origin main
```

Railway will automatically redeploy the previous version.

**Note**: Keep transaction changes even if rolling back, as they prevent data corruption.

## Troubleshooting

### Issue: "Too many connections" errors in logs

**Solution**: The connection pool is set to 30. If still seeing errors:
1. Check Railway PostgreSQL plan limits
2. Consider upgrading database plan
3. Temporarily reduce connection_limit to 20

### Issue: Users still getting logged out

**Solution**: 
1. Verify THROTTLE_LIMIT is set to 100 in Railway
2. Check frontend is deployed with latest changes
3. Clear browser cache and retry

### Issue: Accounts still disappearing

**Solution**:
1. Check Railway logs for transaction errors
2. Look for patterns: `Failed to create user: [error]`
3. Verify database connection is stable
4. Check PostgreSQL plan isn't hitting resource limits

## Success Metrics

After 24-48 hours, you should see:

- ✅ Zero automatic logout complaints
- ✅ Zero missing accounts reports
- ✅ Smooth pagination experience
- ✅ Detailed logs for all user operations
- ✅ No orphaned User records in database

## Database Query to Check for Orphaned Records

Run this query in Railway PostgreSQL console:

```sql
-- Check for users without Student/Teacher records
SELECT u.id, u.email, u.role, u."createdAt"
FROM users u
LEFT JOIN students s ON u.id = s."userId"
LEFT JOIN teachers t ON u.id = t."userId"
WHERE 
  (u.role = 'STUDENT' AND s.id IS NULL)
  OR (u.role = 'TEACHER' AND t.id IS NULL);
```

If you find orphaned records, they were created before the transaction fix. The new code will prevent future orphans.

## Support

If issues persist after deployment:
1. Collect Railway logs
2. Document reproduction steps
3. Check database connection metrics in Railway dashboard
4. Verify all environment variables are correctly set

