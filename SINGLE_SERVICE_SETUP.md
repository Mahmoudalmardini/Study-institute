# Quick Setup: Single Service for Backend + Frontend

## ✅ Files Created

I've created everything you need:
- ✅ `Dockerfile` (root level) - Builds both services
- ✅ `ecosystem.config.js` - Runs both with PM2
- ✅ `railway-combined.json` - Railway config

## 🚀 Quick Setup Steps

### 1. Configure Your Railway Service

**Settings → Source:**
- **Root Directory**: Leave empty or `/` (root directory)
- Click **Update**

**Settings → Build:**
- **Builder**: `Dockerfile`
- **Dockerfile Path**: `Dockerfile` (auto-detects)
- **Start Command** (Override - enable it):
  ```
  cd /app/backend && npx prisma migrate deploy && cd /app && pm2-runtime start ecosystem.config.js
  ```
- Click **Update**

### 2. Environment Variables

Add these in **Settings → Variables**:

```
NODE_ENV=production
BACKEND_PORT=3001
PORT=3000

# Database (link PostgreSQL service to get DATABASE_URL automatically)

# JWT Secrets (generate secure ones!)
JWT_SECRET=<generate-secure-secret>
JWT_REFRESH_SECRET=<generate-secure-secret>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS - Update after you get your Railway domain
FRONTEND_URL=https://your-service.railway.app

# Frontend API URL - Update after you get your Railway domain
NEXT_PUBLIC_API_URL=https://your-service.railway.app/api

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DESTINATION=./uploads

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=500
```

### 3. Link PostgreSQL

**Settings → Variables → Add Reference:**
- Select your PostgreSQL service
- This automatically adds `DATABASE_URL`

### 4. Generate Domain & Update URLs

1. **Settings → Networking → Generate Domain**
2. Copy your domain (e.g., `your-app.railway.app`)
3. Update environment variables:
   - `FRONTEND_URL=https://your-app.railway.app`
   - `NEXT_PUBLIC_API_URL=https://your-app.railway.app/api`

### 5. Redeploy

**Deployments → Clear Cache and Redeploy**

## 📝 Important Notes

- **PORT=3000**: Railway exposes this port (frontend)
- **BACKEND_PORT=3001**: Backend runs internally on this port
- Both services run in the same container using PM2
- Frontend is accessible at your Railway domain
- Backend API is accessible internally or via frontend proxy

## ✅ That's It!

After redeploying, both services will run in one Railway service!

For detailed information, see `RAILWAY_SINGLE_SERVICE.md`

