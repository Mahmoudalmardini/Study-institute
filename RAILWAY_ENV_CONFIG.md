# Railway Environment Variables Configuration

## Required Environment Variables for Backend Service

Copy and paste these into your Railway Backend service Variables section:

### Core Application Settings
```bash
NODE_ENV=production
PORT=3001
```

### Database (Auto-configured by Railway)
```bash
# Railway automatically provides DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Redis (If using Railway Redis)
```bash
# Railway automatically provides REDIS_URL
REDIS_URL=${{Redis.REDIS_URL}}
```

### JWT Authentication
```bash
JWT_SECRET=your-production-jwt-secret-change-this-to-secure-random-string
JWT_EXPIRATION=30m
JWT_REFRESH_SECRET=your-production-refresh-secret-change-this-to-another-secure-random-string
JWT_REFRESH_EXPIRATION=7d
```

**🔒 Security Note**: Generate secure random strings for JWT secrets:
```bash
# Run this in your terminal to generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Rate Limiting (UPDATED - Core Fix)
```bash
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

**⚠️ Important**: This is a critical change! Previously was 10, now 100.

### CORS Configuration
```bash
# Your frontend URL from Railway
CORS_ORIGIN=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
# Or if you have a custom domain:
# CORS_ORIGIN=https://yourdomain.com
# For multiple origins:
# CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### File Upload
```bash
MAX_FILE_SIZE=10485760
UPLOAD_DESTINATION=./uploads
```

## Optional: Logging and Monitoring

```bash
# Log level (error, warn, log, debug, verbose)
LOG_LEVEL=log
```

## Frontend Service Environment Variables

### API Configuration
```bash
NEXT_PUBLIC_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
# Or if backend has custom domain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## Verification Checklist

After setting environment variables:

- [ ] JWT_SECRET is a long random string (not the default)
- [ ] JWT_REFRESH_SECRET is a different long random string
- [ ] THROTTLE_LIMIT is set to 100 (not 10)
- [ ] CORS_ORIGIN points to your frontend domain
- [ ] DATABASE_URL is auto-populated by Railway
- [ ] REDIS_URL is auto-populated by Railway (if using Redis)
- [ ] NEXT_PUBLIC_API_URL points to backend domain

## How to Access Railway Variables

1. Go to [Railway Dashboard](https://railway.app/)
2. Select your project
3. Click on the service (Backend or Frontend)
4. Click "Variables" in the sidebar
5. Add variables using either:
   - **Raw Editor** (paste all at once)
   - **+ New Variable** button (add one by one)

## Railway Reference Variables

Railway provides special syntax to reference other services:

- `${{ServiceName.VARIABLE}}` - Reference variable from another service
- `${{Postgres.DATABASE_URL}}` - Auto-generated database URL
- `${{Redis.REDIS_URL}}` - Auto-generated Redis URL
- `${{Backend.RAILWAY_PUBLIC_DOMAIN}}` - Backend's public URL
- `${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` - Frontend's public URL

## Testing Variables

After setting variables, test with:

1. **Check Variable is Set**
   - In Railway dashboard, go to service logs
   - Look for startup messages confirming configuration

2. **Test Backend**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

3. **Check Logs**
   ```bash
   railway logs --service backend --tail 20
   ```

## Common Issues

### Issue: "Invalid JWT Secret"
**Solution**: Ensure JWT_SECRET is set and is a long random string

### Issue: "Database connection failed"
**Solution**: Check DATABASE_URL is correctly set to `${{Postgres.DATABASE_URL}}`

### Issue: "CORS error"
**Solution**: Ensure CORS_ORIGIN matches your frontend domain exactly (including https://)

### Issue: Still getting rate limited
**Solution**: Verify THROTTLE_LIMIT is 100, not 10. Redeploy if needed.

## Sensitive Variables

Mark these as sensitive in Railway (they'll be hidden in logs):
- JWT_SECRET
- JWT_REFRESH_SECRET
- DATABASE_URL (if manually set)
- Any API keys

## Variable Priority

Railway variables override .env files. The order:
1. Railway Environment Variables (highest priority)
2. .env files in code
3. Default values in configuration.ts (lowest priority)

For production, always set critical variables in Railway dashboard.

