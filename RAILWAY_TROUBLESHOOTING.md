# Railway Deployment Troubleshooting

## "Error creating build plan with Nixpacks"

This is a common error when Railway's Nixpacks builder can't properly detect or configure your project. Here are several solutions:

### Solution 1: Use Dockerfile (Recommended)

If Nixpacks continues to fail, switch to using Dockerfile:

1. Go to your service in Railway dashboard
2. Click on **Settings**
3. Go to **Build** section
4. Change **Builder** from "Nixpacks" to "Dockerfile"
5. Railway will automatically use the `Dockerfile` in your root directory (backend/ or frontend/)
6. Redeploy the service

**Note:** The Dockerfiles are already configured and ready to use.

### Solution 2: Verify File Locations

Make sure these files exist in the correct locations:

**For Backend:**
- `backend/nixpacks.toml` ✓
- `backend/package.json` ✓
- `backend/Procfile` ✓ (fallback)

**For Frontend:**
- `frontend/nixpacks.toml` ✓
- `frontend/package.json` ✓
- `frontend/Procfile` ✓ (fallback)

### Solution 3: Check Root Directory Setting

In Railway service settings:
1. Go to **Settings** → **Source**
2. Verify **Root Directory** is set correctly:
   - Backend service: `backend`
   - Frontend service: `frontend`

### Solution 4: Manual Build Configuration

If automatic detection fails, you can manually set build commands:

1. Go to service → **Settings** → **Build**
2. Under **Build Command**, enter:
   - Backend: `npm ci && npx prisma generate && npm run build`
   - Frontend: `npm ci && npm run build`
3. Under **Start Command**, enter:
   - Backend: `npx prisma migrate deploy && node dist/main.js`
   - Frontend: `npm start`

### Solution 5: Clear Build Cache

Sometimes cached builds cause issues:

1. Go to service → **Deployments**
2. Click on the failed deployment
3. Click **"Redeploy"** or **"Clear Cache and Redeploy"**

### Solution 6: Check Package.json

Verify your `package.json` files are valid JSON:

```bash
# Test backend package.json
cd backend && node -e "JSON.parse(require('fs').readFileSync('package.json'))"

# Test frontend package.json
cd frontend && node -e "JSON.parse(require('fs').readFileSync('package.json'))"
```

### Solution 7: Use Railway CLI for Testing

Test the build locally with Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Test build (in backend or frontend directory)
railway up
```

## Other Common Issues

### Build Fails at "npm ci"

**Error:** `npm ERR! code ERESOLVE` or dependency conflicts

**Solution:**
- Check that `package-lock.json` is committed to git
- Try deleting `package-lock.json` and `node_modules`, then run `npm install` locally
- Commit the new `package-lock.json`

### Prisma Generate Fails

**Error:** `Prisma Client did not initialize yet`

**Solution:**
- Ensure `prisma/schema.prisma` exists
- Verify `DATABASE_URL` is set (even if migrations haven't run yet)
- Prisma Client generation should happen during build, not runtime

### Migrations Fail on Start

**Error:** `Migration failed` or database connection errors

**Solution:**
- Verify `DATABASE_URL` is correctly linked in Railway
- Check database service is running
- Ensure database has proper permissions
- Check logs for specific migration errors

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
- Railway automatically sets `PORT` environment variable
- Don't hardcode port numbers in your code
- Use `process.env.PORT || 3001` (backend) or `process.env.PORT || 3000` (frontend)

### CORS Errors

**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:**
- Verify `FRONTEND_URL` in backend matches your frontend domain exactly
- No trailing slashes
- Include `https://` protocol
- Check backend logs for CORS configuration

## Getting Help

1. **Check Railway Logs:**
   - Go to service → **Deployments** → Click deployment → **Logs**
   - Look for specific error messages

2. **Railway Community:**
   - [Railway Discord](https://discord.gg/railway)
   - [Railway Documentation](https://docs.railway.app)

3. **Verify Configuration:**
   - All environment variables are set
   - Services are linked correctly
   - Root directories are correct
   - Build commands are valid

## Quick Fix Checklist

- [ ] Root directory set correctly (backend/ or frontend/)
- [ ] `nixpacks.toml` exists in root directory
- [ ] `package.json` is valid JSON
- [ ] All required environment variables are set
- [ ] Database and Redis services are linked
- [ ] Build logs show specific errors
- [ ] Tried switching to Dockerfile builder
- [ ] Cleared cache and redeployed

