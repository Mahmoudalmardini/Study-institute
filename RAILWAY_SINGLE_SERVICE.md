# Railway Deployment - Single Service (Backend + Frontend)

This guide shows how to deploy both backend and frontend in **one Railway service**.

## ✅ Setup Complete

I've created:
- `Dockerfile` (root level) - Builds both backend and frontend
- `ecosystem.config.js` - PM2 config to run both services
- `railway-combined.json` - Railway configuration

## 🚀 Deployment Steps

### Step 1: Configure Railway Service

1. Go to your Railway project
2. Click on your service (or create one)
3. **Settings → Source:**
   - **Root Directory**: Leave empty or set to `/` (root)
   - This service will use the root directory

4. **Settings → Build:**
   - **Builder**: Change to `Dockerfile`
   - **Dockerfile Path**: `Dockerfile` (should auto-detect)
   - **Start Command** (Override): 
     ```
     cd backend && npx prisma migrate deploy && pm2-runtime start /app/ecosystem.config.js
     ```
   - Click **Update**

### Step 2: Environment Variables

Add these environment variables in **Settings → Variables**:

**Required:**
```
NODE_ENV=production
PORT=3001
FRONTEND_PORT=3000

# Database (link PostgreSQL service)
DATABASE_URL=<auto-provided when you link PostgreSQL>

# JWT Secrets (generate secure ones!)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS - Use your Railway domain
FRONTEND_URL=https://your-service.railway.app

# Frontend API URL - Use your Railway domain
NEXT_PUBLIC_API_URL=https://your-service.railway.app/api

# Redis (optional - link Redis service if you have one)
REDIS_URL=<auto-provided when you link Redis>

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DESTINATION=./uploads

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=500
```

### Step 3: Link Services

1. **Link PostgreSQL:**
   - Settings → Variables → Add Reference
   - Select your PostgreSQL service
   - This adds `DATABASE_URL` automatically

2. **Link Redis (Optional):**
   - Settings → Variables → Add Reference
   - Select your Redis service
   - This adds `REDIS_URL` automatically

### Step 4: Configure Networking

Since both services run in one container, you need to expose both ports:

1. **Settings → Networking**
2. Railway will automatically expose the PORT (3001 for backend)
3. For frontend, you have two options:

   **Option A: Use Railway's default port (Recommended)**
   - Railway exposes one port by default
   - Set `PORT=3000` to expose frontend
   - Access backend via internal networking
   - Frontend will be at: `https://your-service.railway.app`
   - Backend API will be at: `https://your-service.railway.app/api` (via frontend proxy or direct)

   **Option B: Use a reverse proxy (Advanced)**
   - Set up nginx or use Railway's built-in routing
   - Route `/api/*` to backend (port 3001)
   - Route `/*` to frontend (port 3000)

### Step 5: Generate Domain & Update URLs

1. **Settings → Networking → Generate Domain**
2. Note your Railway domain (e.g., `your-app.railway.app`)
3. Update environment variables:
   - `FRONTEND_URL=https://your-app.railway.app`
   - `NEXT_PUBLIC_API_URL=https://your-app.railway.app/api`

### Step 6: Redeploy

1. Go to **Deployments**
2. Click **"Clear Cache and Redeploy"**
3. Wait for build to complete

## 🔧 How It Works

1. **Build Stage:**
   - Builds backend (NestJS) → outputs to `/app/backend/dist`
   - Builds frontend (Next.js) → outputs to `/app/frontend/.next`

2. **Runtime:**
   - PM2 runs both services:
     - Backend on port 3001
     - Frontend on port 3000
   - Both services run simultaneously in one container

3. **Access:**
   - Frontend: `https://your-service.railway.app`
   - Backend API: `https://your-service.railway.app/api` (if proxied) or internal port 3001

## ⚠️ Important Notes

### Port Configuration

Railway exposes **one port** per service. You have options:

1. **Expose Frontend (Recommended):**
   - Set `PORT=3000` in environment variables
   - Frontend accessible at Railway domain
   - Backend accessible internally or via frontend proxy

2. **Expose Backend:**
   - Set `PORT=3001` in environment variables
   - Backend accessible at Railway domain
   - Frontend not directly accessible (needs proxy)

3. **Use Railway's Private Networking:**
   - Both services run internally
   - Use Railway's service mesh for communication
   - Expose only one service publicly

### Recommended Setup

For a single service, I recommend:
- Expose **frontend** (PORT=3000)
- Frontend makes API calls to backend internally
- Update `NEXT_PUBLIC_API_URL` to use Railway's internal networking or proxy

## 🐛 Troubleshooting

### Both services won't start
- Check PM2 logs: `pm2 logs` (in Railway logs)
- Verify both services are in `ecosystem.config.js`
- Check port conflicts

### Port errors
- Railway sets `PORT` automatically
- Backend uses `PORT` or defaults to 3001
- Frontend uses `FRONTEND_PORT` or defaults to 3000
- Make sure ports don't conflict

### Build fails
- Check Dockerfile builds both services
- Verify `package.json` files exist in both directories
- Check build logs for specific errors

### Database connection
- Verify `DATABASE_URL` is set
- Check PostgreSQL service is linked
- Ensure migrations run: `npx prisma migrate deploy`

## 📊 Monitoring

- **PM2 Dashboard:** Access via Railway logs
- **Health Check:** Backend health endpoint at `/api/health`
- **Logs:** Both services log to Railway's log viewer

## 🔄 Alternative: Two Services (Recommended)

While single service works, **two separate services** is recommended because:
- ✅ Better resource isolation
- ✅ Independent scaling
- ✅ Easier debugging
- ✅ Railway best practice
- ✅ Separate health checks

But if you prefer one service, this setup will work!

