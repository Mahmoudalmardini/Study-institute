# Fix: Teacher Cannot See Student Homework Submissions

## Problem
Teachers are unable to see homework submissions because the frontend is trying to access `localhost:3001` instead of the production backend URL, causing CORS errors and connection failures.

## Root Cause
The `NEXT_PUBLIC_API_URL` environment variable is not set in the Railway frontend deployment, causing the application to default to `localhost:3001/api`.

## Solution

### Step 1: Get Your Backend URL

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Click on the **Backend** service
4. Go to **Settings** → **Networking**  
5. Copy the generated domain (e.g., `https://study-institute-backend-production.up.railway.app`)

### Step 2: Configure Frontend Environment Variable

1. In Railway Dashboard, click on the **Frontend** service
2. Go to **Variables** tab
3. Add or update the following variable:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api
```

**Important:** 
- Replace `your-backend-url.up.railway.app` with your actual backend URL from Step 1
- Include `/api` at the end
- Do NOT include a trailing slash after `/api`

### Step 3: Configure Backend CORS

1. In Railway Dashboard, click on the **Backend** service
2. Go to **Variables** tab
3. Add or update the following variable:

```
FRONTEND_URL=https://study-institute-production.up.railway.app
```

**Important:**
- Replace with your actual frontend URL (visible in your browser)
- Do NOT include a trailing slash
- Include the `https://` protocol

### Step 4: Verify Other Backend Variables

Ensure these are also set in your Backend service:

```
NODE_ENV=production
JWT_SECRET=<your-secure-secret>
JWT_REFRESH_SECRET=<your-secure-refresh-secret>
DATABASE_URL=<automatically-set-by-railway>
```

### Step 5: Redeploy

After setting the variables:

1. Railway should automatically trigger a redeploy
2. If not, manually redeploy:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
3. Wait for both services to finish deploying (usually 2-5 minutes)

### Step 6: Test

1. Log in as a teacher at: `https://study-institute-production.up.railway.app/login`
2. Navigate to the Homework page
3. You should now see student submissions

## Verification

### Check Frontend Logs
1. Go to Frontend service → **Deployments** → Click latest deployment → **Logs**
2. Look for confirmation that the build used the correct API URL

### Check Backend Logs
1. Go to Backend service → **Deployments** → Click latest deployment → **Logs**
2. Look for incoming requests from the frontend
3. Verify no CORS errors

### Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for the log: `URL: https://your-backend.up.railway.app/api/homework/submissions/received`
4. Verify no CORS errors or 401 errors

## Common Issues

### Issue 1: Still seeing localhost:3001
**Cause:** Frontend didn't rebuild with new environment variable  
**Solution:** 
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Manually redeploy the frontend service in Railway

### Issue 2: CORS errors persist
**Cause:** Backend `FRONTEND_URL` doesn't match the actual frontend URL  
**Solution:**
- Double-check the `FRONTEND_URL` in backend matches exactly
- No trailing slashes
- Must include `https://`
- Redeploy backend after changing

### Issue 3: 401 Unauthorized errors
**Cause:** JWT token issues or authentication problem  
**Solution:**
- Logout and login again
- Check that `JWT_SECRET` and `JWT_REFRESH_SECRET` are set in backend
- Verify the token is being sent in browser DevTools → Network tab → Request Headers

### Issue 4: Environment variable not taking effect
**Cause:** Frontend needs rebuild for `NEXT_PUBLIC_*` variables  
**Solution:**
- In Railway, these variables are baked into the build
- Must trigger a new build/deploy after changing them
- Go to Frontend → Deployments → Redeploy

## Quick Checklist

- [ ] Backend service has a generated Railway domain
- [ ] Frontend `NEXT_PUBLIC_API_URL` is set to backend URL + `/api`
- [ ] Backend `FRONTEND_URL` is set to frontend URL
- [ ] Backend `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- [ ] Backend `DATABASE_URL` is linked to PostgreSQL
- [ ] Both services redeployed after variable changes
- [ ] Cleared browser cache and hard refreshed
- [ ] Tested login and navigation to homework page
- [ ] Checked browser console for errors

## Expected Behavior After Fix

1. Teacher logs in successfully
2. Navigates to Homework Submissions page
3. Sees list of student homework submissions
4. No errors in browser console
5. Can click "Evaluate Homework" button
6. Can accept/reject submissions and provide feedback

## Additional Notes

- Environment variables starting with `NEXT_PUBLIC_` are embedded during build time in Next.js
- Any change to `NEXT_PUBLIC_API_URL` requires a full frontend rebuild
- The backend can hot-reload most environment variables without rebuild
- CORS settings in the backend must match the exact frontend URL

## Support

If issues persist after following these steps:

1. Check Railway deployment logs for both services
2. Check browser console for specific error messages
3. Verify network requests in DevTools → Network tab
4. Ensure you're using the latest deployment of both services

---

**Last Updated:** November 23, 2025

