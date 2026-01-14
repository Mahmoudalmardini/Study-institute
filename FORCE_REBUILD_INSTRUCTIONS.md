# Force Rebuild on Railway

## Problem Identified

The build logs show:
```
frontend-build RUN npm run build cached
```

Railway is **using cached build layers** and NOT rebuilding with the new `next.config.ts`!

The old chunk names in browser (`page-2edace83ebec3810.js`, `vendor-4131f71d417778e7.js`) confirm this.

## Solutions

### Option 1: Commit Cache-Bust File (RECOMMENDED)

```bash
git add frontend/.buildcache-bust frontend/package.json
git commit -m "Force Railway to rebuild frontend with new webpack config"
git push
```

### Option 2: Clear Railway Build Cache

1. Go to Railway Dashboard
2. Your Service → Settings
3. Scroll down to "Build Configuration"
4. Click "Clear Build Cache" or "Rebuild"
5. Or in Deployments → Click "Redeploy" with "Clear Cache" option

### Option 3: Add Empty Commit with Railway Environment Variable

```bash
# Set a build timestamp to invalidate cache
```

In Railway:
1. Settings → Variables
2. Add new variable: `BUILD_TIMESTAMP=2026-01-14-22-40`
3. Redeploy

### Option 4: Modify Dockerfile to Bust Cache

In your Dockerfile, add this line before `RUN npm run build`:

```dockerfile
# Force rebuild - bust cache
ENV BUILD_TIMESTAMP=2026-01-14-22-40
RUN npm run build
```

## After Forcing Rebuild

Watch the build logs - you should see:
```
frontend-build RUN npm run build
[NOT cached, but actually running]
✓ Creating an optimized production build
✓ Compiled successfully
```

Then check:
1. Build completes successfully
2. New deployment created
3. Browser console error is gone
4. New chunk names appear (different from old ones)

## Verify New Build

After rebuild, the chunk names should change to something like:
- `runtime-[newhash].js`
- `vendor-[newhash].js`
- `common-[newhash].js`
- `page-[newhash].js`

If you still see the old names, Railway is still using cache.

## Why This Happened

Railway's Docker layer caching is aggressive. When you only changed `next.config.ts`, Railway saw:
- `COPY frontend/ ./` → Same files (cached)
- `RUN npm run build` → Dependencies haven't changed (cached)

By adding a new file or changing package.json, we invalidate the cache.

## Expected Timeline

1. Push changes: 1 minute
2. Railway detects push: 1-2 minutes
3. Build (NO cache): 2-5 minutes
4. Deploy: 1-2 minutes
5. **Total: ~10 minutes**

Then clear browser cache and test!

