# 🔧 Quick Fix: Teacher Homework Submissions Not Showing

## ⚡ The Problem
Frontend is calling `localhost:3001` instead of your production backend URL.

## ✅ The Solution (3 Steps)

### 1️⃣ Find Your Backend URL
```
Railway Dashboard → Backend Service → Settings → Networking
Copy the domain: https://xxxxx.up.railway.app
```

### 2️⃣ Set Frontend Environment Variable
```
Railway Dashboard → Frontend Service → Variables → + New Variable

Key:   NEXT_PUBLIC_API_URL
Value: https://xxxxx.up.railway.app/api
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
       (your backend URL from step 1)

⚠️ IMPORTANT: Add /api at the end!
```

### 3️⃣ Set Backend CORS Variable
```
Railway Dashboard → Backend Service → Variables → + New Variable

Key:   FRONTEND_URL
Value: https://study-institute-production.up.railway.app
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
       (your current frontend URL)

⚠️ IMPORTANT: No trailing slash!
```

### 4️⃣ Wait for Redeploy
- Railway will automatically redeploy both services
- Wait 2-5 minutes
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Log in again

## 🎯 Expected Result
✅ Teacher can see student homework submissions  
✅ No CORS errors in browser console  
✅ No "Failed to fetch" errors  

## 🐛 Still Not Working?

### Check #1: Frontend Environment Variable
```bash
# In Railway Frontend → Deployments → Logs, look for:
"NEXT_PUBLIC_API_URL=https://xxxxx.up.railway.app/api"
```

### Check #2: Backend CORS Configuration
```bash
# In Railway Backend → Variables, verify:
FRONTEND_URL=https://study-institute-production.up.railway.app
```

### Check #3: Browser Console
```
F12 → Console Tab → Look for:
"URL: https://xxxxx.up.railway.app/api/homework/submissions/received"

❌ If you see "http://localhost:3001" → Frontend didn't rebuild
✅ If you see your Railway URL → Correct!
```

## 📋 Quick Checklist

- [ ] Found backend Railway URL
- [ ] Added `NEXT_PUBLIC_API_URL` to Frontend service
- [ ] Added `FRONTEND_URL` to Backend service  
- [ ] Waited for both services to redeploy
- [ ] Cleared browser cache
- [ ] Hard refreshed page (Ctrl+Shift+R)
- [ ] Logged out and logged back in
- [ ] Tested homework page

## 💡 Pro Tips

1. **Environment variables starting with `NEXT_PUBLIC_` require a rebuild**
   - Railway will automatically rebuild when you change them
   - Just wait for the deployment to finish

2. **Clear cache is crucial**
   - Old JavaScript code may be cached
   - Use Ctrl+Shift+R or open in incognito mode

3. **Check the Network tab**
   - F12 → Network tab
   - Try loading homework page
   - Click on the failed request
   - Check the URL it's trying to access

## 🔍 Visual Verification

**Before Fix:**
```
Browser → DevTools → Network
❌ Request URL: http://localhost:3001/api/homework/submissions/received
❌ Status: (failed) net::ERR_FAILED
❌ CORS Error: blocked by CORS policy
```

**After Fix:**
```
Browser → DevTools → Network
✅ Request URL: https://xxxxx.up.railway.app/api/homework/submissions/received
✅ Status: 200 OK
✅ Response: {success: true, data: [array of submissions]}
```

---

**Need the full detailed guide?** See `TEACHER_HOMEWORK_FIX.md`

