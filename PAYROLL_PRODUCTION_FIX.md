# Payroll Production 500 Error - Fix Instructions

## Problem
The payroll management page returns **500 Internal Server Error** in production because the **payroll database tables are missing**.

### Error Messages:
```
GET /api/payroll/salaries - 500 Internal Server Error
GET /api/payroll/hour-requests/pending - 500 Internal Server Error
```

## Root Cause
The payroll migration was never run on the Railway production database. The following tables are missing:
- `teacher_salaries`
- `hour_requests` 
- `monthly_payroll_records`

## Solution

### Step 1: Fix Applied to Code ✅
Changed `$queryRaw` with template literals to `$queryRawUnsafe` for table existence checks:
```typescript
// Before (incorrect):
await this.prisma.$queryRaw`SELECT 1 FROM teacher_salaries LIMIT 1`;

// After (correct):
await this.prisma.$queryRawUnsafe('SELECT 1 FROM teacher_salaries LIMIT 1');
```

This fix is now committed and will be deployed.

### Step 2: Run Database Migration on Railway 🚀

You need to run the Prisma migration on your Railway production database:

#### Option A: Via Railway CLI (Recommended)
```bash
# 1. Connect to Railway backend service
railway link

# 2. Run the migration
railway run npx prisma migrate deploy

# 3. Verify tables were created
railway run npx prisma db execute --stdin < backend/prisma/migrations/20251102132840_add_payroll_models/migration.sql
```

#### Option B: Via Railway Dashboard
1. Go to Railway Dashboard → Your Project → Backend Service
2. Click on "Settings" → "Deploy Triggers"
3. Add a custom command: `npx prisma migrate deploy`
4. Or manually trigger a deployment after pushing code

#### Option C: Via Database Direct Connection
If you have direct database access:
```bash
# Get DATABASE_URL from Railway
# Then run locally:
DATABASE_URL="your-railway-db-url" npx prisma migrate deploy
```

### Step 3: Verify Fix
1. Redeploy the backend service (after code fix is pushed)
2. Visit: `https://study-institute-production.up.railway.app/admin/payroll`
3. Page should load with teacher list
4. No more 500 errors

## Migration Details
The payroll migration (`20251102132840_add_payroll_models`) creates:

### Tables Created:
1. **teacher_salaries** - Stores monthly/hourly wage information
2. **hour_requests** - Teachers submit hours worked
3. **monthly_payroll_records** - Monthly calculated payroll

### What the Migration Does:
```sql
CREATE TABLE "teacher_salaries" (...)
CREATE TABLE "hour_requests" (...)  
CREATE TABLE "monthly_payroll_records" (...)
-- Plus indexes and foreign keys
```

## After Fix
✅ Payroll page will load successfully
✅ Admin can view teachers and salaries
✅ Teachers can submit hour requests
✅ Monthly payroll records can be generated

## Need Help?
See also: `RAILWAY_MIGRATION_FIX.md` for general migration troubleshooting.

