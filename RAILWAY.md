# Railway Deployment Guide

This guide will help you deploy the Study Institute application to Railway.

## Prerequisites

1. A [Railway](https://railway.app) account
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Railway CLI (optional, for local testing)

## Deployment Overview

Railway will deploy two services:
- **Backend**: NestJS API server
- **Frontend**: Next.js application

You'll also need to provision:
- **PostgreSQL Database**: Provided by Railway
- **Redis**: Provided by Railway (optional, but recommended)

## Step-by-Step Deployment

### 1. Create a New Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (or your Git provider)
4. Select your repository

### 2. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. Note the `DATABASE_URL` - it will be automatically available to your services

### 3. Add Redis (Optional but Recommended)

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will automatically create a Redis instance
4. Note the `REDIS_URL` - it will be automatically available to your services

### 4. Deploy Backend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** (if not already connected) or **"Empty Service"**
3. If using Empty Service:
   - Click on the service
   - Go to **Settings** → **Source**
   - Connect your GitHub repository
   - Set **Root Directory** to `backend`

4. **Configure the Service:**
   - Railway will auto-detect Node.js and use the `railway.json` configuration
   - The build command will run: `npm ci && npx prisma generate && npm run build`
   - The start command will run: `npx prisma migrate deploy && node dist/main.js`

5. **Add Environment Variables:**
   - Go to the service → **Variables** tab
   - Add the following variables:

   ```
   NODE_ENV=production
   PORT=3001
   
   # JWT Configuration (IMPORTANT: Generate secure secrets!)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRATION=15m
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
   JWT_REFRESH_EXPIRATION=7d
   
   # CORS - Set this to your frontend URL after deploying frontend
   FRONTEND_URL=https://your-frontend-service.railway.app
   
   # File Upload
   MAX_FILE_SIZE=10485760
   UPLOAD_DESTINATION=./uploads
   
   # Rate Limiting
   THROTTLE_TTL=60
   THROTTLE_LIMIT=500
   ```

6. **Link Database and Redis:**
   - In the service settings, go to **Variables** tab
   - Click **"Add Reference"**
   - Select your PostgreSQL database (this adds `DATABASE_URL` automatically)
   - Select your Redis instance (this adds `REDIS_URL` automatically)

7. **Generate Domain:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"** to get a public URL
   - Note this URL - you'll need it for the frontend `NEXT_PUBLIC_API_URL

### 5. Deploy Frontend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** or **"Empty Service"**
3. If using Empty Service:
   - Click on the service
   - Go to **Settings** → **Source**
   - Connect your GitHub repository
   - Set **Root Directory** to `frontend`

4. **Configure the Service:**
   - Railway will auto-detect Next.js and use the `railway.json` configuration
   - The build command will run: `npm ci && npm run build`
   - The start command will run: `npm start`

5. **Add Environment Variables:**
   - Go to the service → **Variables** tab
   - Add the following variable:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app/api
   ```

   **Important:** Replace `your-backend-service.railway.app` with your actual backend Railway domain from step 4.

6. **Generate Domain:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"** to get a public URL
   - Note this URL

7. **Update Backend CORS:**
   - Go back to your Backend service
   - Update the `FRONTEND_URL` variable with your frontend Railway domain:
   ```
   FRONTEND_URL=https://your-frontend-service.railway.app
   ```

### 6. Run Database Migrations

The backend service will automatically run Prisma migrations on startup via the start command:
```
npx prisma migrate deploy && node dist/main.js
```

If you need to run migrations manually:
1. Go to your Backend service
2. Click on **"Deployments"**
3. Click on the latest deployment
4. Open the **"Logs"** tab to verify migrations ran successfully

### 7. Seed Database (Optional)

If you want to seed the database with initial data:

1. Go to your Backend service
2. Click **"Deployments"** → **"View Logs"**
3. Or use Railway CLI:
   ```bash
   railway run --service backend npx prisma db seed
   ```

## Environment Variables Summary

### Backend Service Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | Yes | `production` |
| `PORT` | Server port | No | `3001` (Railway sets this automatically) |
| `DATABASE_URL` | PostgreSQL connection | Yes | Auto-provided by Railway |
| `REDIS_URL` | Redis connection | No | Auto-provided by Railway |
| `JWT_SECRET` | JWT signing secret | Yes | Generate a secure random string |
| `JWT_EXPIRATION` | Access token expiry | No | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes | Generate a secure random string |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry | No | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | `https://your-app.railway.app` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | No | `10485760` (10MB) |
| `UPLOAD_DESTINATION` | Upload directory | No | `./uploads` |
| `THROTTLE_TTL` | Rate limit window (seconds) | No | `60` |
| `THROTTLE_LIMIT` | Requests per window | No | `500` |

### Frontend Service Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `https://your-backend.railway.app/api` |
| `PORT` | Server port | No | `3000` (Railway sets this automatically) |

## Generating Secure Secrets

For production, generate secure random strings for JWT secrets:

**Using OpenSSL:**
```bash
openssl rand -base64 32
```

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Custom Domains

Railway provides free `.railway.app` domains. To use a custom domain:

1. Go to your service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Add your domain
4. Follow the DNS configuration instructions

## Monitoring and Logs

- **View Logs**: Go to your service → **Deployments** → Click a deployment → **Logs**
- **Metrics**: Railway provides CPU, Memory, and Network metrics in the dashboard
- **Health Checks**: Both services have health endpoints:
  - Backend: `https://your-backend.railway.app/api/health`
  - Frontend: `https://your-frontend.railway.app`

## Troubleshooting

### Backend Issues

**Migrations failing:**
- Check that `DATABASE_URL` is correctly set
- Verify database is accessible
- Check logs for specific error messages

**CORS errors:**
- Ensure `FRONTEND_URL` matches your frontend domain exactly
- Check for trailing slashes
- Verify the frontend is using the correct `NEXT_PUBLIC_API_URL`

**Redis connection errors:**
- Verify `REDIS_URL` is set (if using Redis)
- Check Redis service is running
- Redis is optional - the app will work without it

### Frontend Issues

**API connection errors:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is deployed and running
- Check backend logs for errors

**Build failures:**
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### General Issues

**Service not starting:**
- Check environment variables are set correctly
- Verify build completed successfully
- Check service logs for startup errors

**Port conflicts:**
- Railway automatically assigns ports via `PORT` environment variable
- Don't hardcode ports in your code

## Updating Your Deployment

1. Push changes to your Git repository
2. Railway will automatically detect changes and redeploy
3. Monitor the deployment in the Railway dashboard

## Cost Considerations

- Railway offers a free tier with $5 credit
- PostgreSQL and Redis services consume credits
- Monitor usage in the Railway dashboard
- Consider upgrading to a paid plan for production use

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Use Railway's variable system** for all sensitive data
3. **Generate strong JWT secrets** using cryptographically secure methods
4. **Enable HTTPS** (Railway provides this automatically)
5. **Review and update** environment variables regularly
6. **Use Railway's private networking** for service-to-service communication when possible

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- Check service logs for detailed error messages

---

**Default Login Credentials** (if database was seeded):
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the default admin password immediately after first login in production!

