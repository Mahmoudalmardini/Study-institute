# File URL Fix - Teacher Homework Submissions

## Problem
Teachers could see homework submissions but couldn't open or download the files/pictures that students submitted.

## Root Cause
1. **Missing Proxy Rule**: Next.js was only proxying `/api/*` requests to the backend, but files are served at `/uploads/*` which wasn't being proxied.
2. **Incorrect URL Construction**: The `buildFileUrl` function was trying to derive the base URL from `NEXT_PUBLIC_API_URL`, which was unnecessary and error-prone.

## Solution

### 1. Added Uploads Proxy Rule
**File**: `frontend/next.config.ts`

Added a rewrite rule to proxy `/uploads/*` requests to the backend:
```typescript
{
  source: '/uploads/:path*',
  destination: `${backendUrl}/uploads/:path*`,
}
```

This ensures that when the browser requests `/uploads/file.png`, Next.js forwards it to `http://localhost:3001/uploads/file.png` (the backend).

### 2. Simplified File URL Construction
**File**: `frontend/app/teacher/homework/page.tsx`

Simplified the `buildFileUrl` function to:
- Use `window.location.origin` directly (works in both dev and production)
- Clean up the file path properly
- Ensure paths start with `uploads/`

**Before:**
```typescript
// Complex logic trying to derive base URL from NEXT_PUBLIC_API_URL
let baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
// ... complex manipulation
```

**After:**
```typescript
// Simple: use current origin directly
const origin = typeof window !== 'undefined' ? window.location.origin : '';
// Clean path and build URL
return `${origin}/${cleaned}`;
```

## How It Works Now

1. **File Storage**: Files are stored in the backend at paths like `uploads/file-123.png`
2. **File Serving**: Backend serves files via `ServeStaticModule` at `/uploads/*`
3. **Frontend Request**: Browser requests `/uploads/file-123.png`
4. **Next.js Proxy**: Next.js rewrites and forwards to `http://localhost:3001/uploads/file-123.png`
5. **Backend Response**: Backend serves the file with proper CORS headers

## Testing

After deployment, verify:
1. ✅ Teacher can see homework submissions
2. ✅ Teacher can click "Open" on attached files - files open in new tab
3. ✅ Teacher can click "Download" on attached files - files download correctly
4. ✅ Images display correctly in the browser
5. ✅ PDFs and other file types open correctly

## Files Changed

1. `frontend/next.config.ts` - Added `/uploads/*` proxy rule
2. `frontend/app/teacher/homework/page.tsx` - Simplified `buildFileUrl` function

## Deployment Notes

- No environment variable changes needed
- Changes are code-only
- Will work automatically after redeploy

