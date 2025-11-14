# Railway Deployment - Quick Reference

## Quick Setup Checklist

### 1. Create Services
- [ ] Create Railway project
- [ ] Add PostgreSQL database
- [ ] Add Redis (optional)
- [ ] Deploy Backend service (root: `backend`)
- [ ] Deploy Frontend service (root: `frontend`)

### 2. Backend Environment Variables
```
NODE_ENV=production
JWT_SECRET=<generate-secure-secret>
JWT_REFRESH_SECRET=<generate-secure-secret>
FRONTEND_URL=https://your-frontend.railway.app
```

**Auto-provided by Railway:**
- `DATABASE_URL` (from PostgreSQL service)
- `REDIS_URL` (from Redis service, if added)
- `PORT` (automatically set)

### 3. Frontend Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

**Auto-provided by Railway:**
- `PORT` (automatically set)

### 4. Generate Domains
- [ ] Generate domain for Backend
- [ ] Generate domain for Frontend
- [ ] Update `FRONTEND_URL` in Backend with Frontend domain
- [ ] Update `NEXT_PUBLIC_API_URL` in Frontend with Backend domain

## Generate Secure Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Service URLs

After deployment, your services will be available at:
- **Backend API**: `https://your-backend.railway.app/api`
- **Frontend**: `https://your-frontend.railway.app`
- **Health Check**: `https://your-backend.railway.app/api/health`

## Common Commands

### View Logs
- Go to service → Deployments → Click deployment → Logs

### Redeploy
- Push to Git repository (auto-deploys)
- Or: Service → Deployments → Redeploy

### Run Migrations Manually
```bash
railway run --service backend npx prisma migrate deploy
```

### Seed Database
```bash
railway run --service backend npx prisma db seed
```

## Troubleshooting

**Backend won't start:**
- Check `DATABASE_URL` is linked
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Check logs for specific errors

**CORS errors:**
- Ensure `FRONTEND_URL` matches frontend domain exactly
- No trailing slashes

**Frontend can't connect to API:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is running
- Check backend logs

For detailed instructions, see [RAILWAY.md](./RAILWAY.md)

