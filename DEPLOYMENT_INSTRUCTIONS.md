# Deployment Instructions for Railway

## Summary of Changes

### Backend Fixes
1. ✅ Enhanced error logging in `backend/src/main.ts`
2. ✅ Improved global exception filter in `backend/src/common/filters/http-exception.filter.ts`
3. ✅ Added health check endpoints in `backend/src/health/`
4. ✅ Better error handling for database operations

### Frontend Fixes  
1. ✅ Fixed admin students page error handling
2. ✅ Fixed teacher page with fallback values
3. ✅ Added optional chaining to prevent crashes

## Deploy to Railway

### Option 1: Automatic Deployment (Recommended)
If you have GitHub connected to Railway:

```bash
git add .
git commit -m "Fix 500 errors: enhanced logging, health checks, error handling"
git push origin main
```

Railway will automatically:
- Detect the push
- Build the Docker image
- Run migrations
- Deploy the application

### Option 2: Manual Deployment
If automatic deployment is not set up:

1. Go to Railway Dashboard
2. Click on your service
3. Click "Deploy" → "Redeploy"

## After Deployment

### 1. Check Deployment Logs
Go to: Railway Dashboard → Your Service → Deployments → Latest → Deploy Logs

Look for these success messages:
```
✅ Database migrations completed successfully!
✅ Application created successfully
🚀 Application is running on: http://0.0.0.0:3001/api
✅ Application bootstrap completed successfully
```

### 2. Test Health Endpoints

**Basic Health Check:**
```
https://study-institute-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-15T...",
  "uptime": 123.45
}
```

**Database Health Check:**
```
https://study-institute-production.up.railway.app/api/health/db
```

Expected response:
```json
{
  "status": "connected",
  "timestamp": "2026-01-15T...",
  "tables": [
    {"table_name": "users"},
    {"table_name": "students"},
    {"table_name": "teachers"},
    ...
  ]
}
```

### 3. Test Previously Failing Endpoints

Login first, then test:

1. **Students Page:**
   - Visit: `https://study-institute-production.up.railway.app/admin/students`
   - Should load without "Error loading students"

2. **Teacher Page:**
   - Visit: `https://study-institute-production.up.railway.app/teacher`
   - Should load without "Application error"

3. **Classes Page:**
   - Visit: `https://study-institute-production.up.railway.app/admin/classes`
   - Should load class list

4. **Subjects Page:**
   - Visit: `https://study-institute-production.up.railway.app/admin/subjects`
   - Should load subject list

## If Issues Persist

### Check Logs for Specific Errors
Railway Dashboard → Service → Logs

The enhanced logging will now show:
- Detailed error messages
- Stack traces for 500 errors
- Database connection status
- API request details

### Common Issues and Solutions

#### Issue: "database" : "disconnected" in health check
**Solution:**
1. Verify PostgreSQL service is linked
2. Check DATABASE_URL environment variable is set
3. Restart the service

#### Issue: Still getting 500 errors
**Solution:**
1. Check the specific error in Railway logs
2. Look for stack traces (now included)
3. Verify all environment variables are set:
   - DATABASE_URL
   - JWT_SECRET
   - JWT_REFRESH_SECRET
   - NEXT_PUBLIC_API_URL
   - PORT=3000

#### Issue: Frontend errors persist
**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check browser console for specific errors
3. Verify NEXT_PUBLIC_API_URL is correct

## Environment Variables Checklist

Verify these are set in Railway → Settings → Variables:

- [ ] `DATABASE_URL` (auto-set when PostgreSQL linked)
- [ ] `JWT_SECRET` (must be a secure random string)
- [ ] `JWT_REFRESH_SECRET` (must be a different secure random string)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `NEXT_PUBLIC_API_URL=https://study-institute-production.up.railway.app/api`
- [ ] `FRONTEND_URL=https://study-institute-production.up.railway.app`

## Success Criteria

✅ Health check returns "status": "ok"
✅ Database health check shows all tables
✅ Admin students page loads without errors
✅ Teacher page loads without errors
✅ Classes page loads without errors
✅ Subjects page loads without errors
✅ No 500 errors in API responses
✅ No JavaScript errors in browser console

## Next Steps

After successful deployment:
1. Monitor Railway logs for any new errors
2. Test all major features (students, teachers, classes, subjects, homework)
3. Verify user authentication works correctly
4. Check that all CRUD operations work

## Support

If you continue to experience issues:
1. Share the Railway deployment logs
2. Share the browser console errors
3. Share the response from `/api/health/db`

The enhanced logging will provide detailed information to diagnose any remaining issues.

