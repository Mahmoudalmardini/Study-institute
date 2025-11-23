# CORS Fix Summary

## Problems Fixed

### 1. Backend CORS Configuration
**Issue:** Backend was only checking `FRONTEND_URL` and ignoring `CORS_ORIGIN` environment variable.

**Fix:** Updated `backend/src/config/configuration.ts` to check `CORS_ORIGIN` first, then `FRONTEND_URL`, then default.

```typescript
// Before:
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// After:
const frontendUrl = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
```

### 2. Frontend API URL Handling
**Issue:** Frontend was not properly handling relative paths when `NEXT_PUBLIC_API_URL="/api"` was set, causing it to fall back to `localhost:3001`.

**Fix:** Updated `frontend/app/teacher/homework/page.tsx` to:
- Properly construct absolute URLs from relative paths
- Use `window.location.origin` when the API URL is relative
- Handle both relative (`/api`) and absolute (`https://...`) URLs

## How It Works

1. **Next.js Proxy:** Your `next.config.ts` already has a rewrite rule that proxies `/api/*` requests to `http://localhost:3001/api/*` on the server side.

2. **Frontend Request Flow:**
   - Frontend makes request to `/api/homework/submissions/received`
   - Next.js proxy intercepts and forwards to `http://localhost:3001/api/homework/submissions/received`
   - Backend processes the request
   - CORS headers are set based on `CORS_ORIGIN` or `FRONTEND_URL`

3. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL="/api"` - Relative path works because of Next.js proxy
   - `CORS_ORIGIN="https://study-institute-production.up.railway.app"` - Backend now reads this
   - `FRONTEND_URL="https://study-institute-production.up.railway.app"` - Fallback if CORS_ORIGIN not set

## Next Steps

1. **Redeploy your Railway service** - The code changes need to be deployed
2. **Verify environment variables in Railway:**
   ```
   CORS_ORIGIN="https://study-institute-production.up.railway.app"
   FRONTEND_URL="https://study-institute-production.up.railway.app"
   NEXT_PUBLIC_API_URL="/api"
   ```
3. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
4. **Test the homework submissions page**

## Expected Behavior After Fix

✅ Frontend makes requests to: `https://study-institute-production.up.railway.app/api/homework/submissions/received`
✅ Backend CORS allows: `https://study-institute-production.up.railway.app`
✅ No more CORS errors
✅ Teacher can see student homework submissions

## Troubleshooting

If you still see errors:

1. **Check Railway logs** to verify environment variables are set correctly
2. **Check browser console** - Look for the log: `Built API URL: https://study-institute-production.up.railway.app/api`
3. **Verify CORS headers** in Network tab → Response Headers → `Access-Control-Allow-Origin`
4. **Ensure both services are running** - Check PM2 status in Railway logs

