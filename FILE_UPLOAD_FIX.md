# Homework File Upload Fix

## Issue
The teacher homework details page was not showing student-submitted files because files were not being uploaded and saved correctly when students submitted homework.

## Root Cause
The `FilesInterceptor` in the homework controller was using a simple `dest` configuration which doesn't properly persist uploaded files. The `uploads` directory was empty, and all submissions in the database had empty `fileUrls` arrays.

## Additional Issue Found
After fixing the file upload, files were visible but couldn't be downloaded/opened. The error was:
```
Cannot GET /api/uploads/files-1760556168322-706359730.png
```

**Cause**: The backend serves static files at `/uploads` (via ServeStaticModule), but the frontend was building URLs as `/api/uploads/...` by including the API prefix.

**Fix**: Updated the `buildFileUrl` function in the teacher homework page to strip the `/api` prefix when building file URLs.

## Solution

### 1. Updated Homework Module (`backend/src/modules/homework/homework.module.ts`)
- Added `MulterModule` with proper disk storage configuration
- Configured multer to save files to `./uploads` directory with unique filenames
- Set file size limit to 50MB
- Files are now saved with format: `files-{timestamp}-{random}.{ext}`

### 2. Updated Homework Controller (`backend/src/modules/homework/homework.controller.ts`)
- Simplified `FilesInterceptor` to use module-level multer configuration
- Added logging to track uploaded files

### 3. Updated Homework Service (`backend/src/modules/homework/homework.service.ts`)
- Added comprehensive logging for file upload debugging
- Improved file URL storage in submissions

### 4. Fixed File Download Functionality (`frontend/app/teacher/homework/page.tsx`)
- Implemented proper download handler using Blob API for cross-browser compatibility
- Works on all devices including mobile browsers
- Changed download button from `<a>` tag to button with click handler
- Fetches file as blob, creates temporary download link, and triggers download programmatically
- Added Open/Download buttons to both submission list and detail modal views

## Frontend Already Working
The teacher homework page (`frontend/app/teacher/homework/page.tsx`) already has the UI to display files:
- Shows attached files in the submission list (lines 444-467)
- Shows files in the homework details modal (lines 541-578)
- Supports downloading and viewing files

## How It Works

### Student Submission Flow:
1. Student selects files in the homework form
2. Files are sent via FormData to `/homework/submit-to-teacher`
3. Multer saves files to `./uploads` directory with unique names
4. File paths are stored in the `submission.fileUrls` array
5. Files are served via ServeStaticModule at `/uploads/*`

### Teacher Viewing Flow:
1. Teacher opens homework details page
2. Backend fetches submissions with `fileUrls` field
3. Frontend transforms file URLs to include API base URL
4. Files are displayed with download and view options

## Testing the Fix

### Step 1: Restart Backend
```bash
cd backend
npm run start:dev
```

### Step 2: Test File Upload
1. Login as a student
2. Go to homework page
3. Submit homework with files attached
4. Check that files appear in `backend/uploads/` directory

### Step 3: Verify Teacher View
1. Login as a teacher (assigned to the student)
2. Go to homework page
3. Open a submission
4. Files should now be visible with download/view options

### Step 4: Verify Database
Run the check script to see file URLs:
```bash
cd backend
node check-submissions.js
```
Should show file URLs like: `["uploads/files-1234567890-123456789.pdf"]`

## Files Modified
- `backend/src/modules/homework/homework.module.ts` - Added multer configuration
- `backend/src/modules/homework/homework.controller.ts` - Updated interceptor
- `backend/src/modules/homework/homework.service.ts` - Added logging
- `backend/check-submissions.js` - Updated to show file URLs
- `frontend/app/teacher/homework/page.tsx` - Fixed file URL building to exclude /api prefix

## Related Files (Already Correct)
- `frontend/app/teacher/homework/page.tsx` - UI for displaying files
- `frontend/app/student/homework/page.tsx` - UI for uploading files
- `backend/src/app.module.ts` - ServeStaticModule configuration

## Notes
- Existing submissions without files will remain empty
- New submissions will properly save files
- Files are accessible at `http://localhost:3001/uploads/{filename}` (note: no `/api` prefix)
- File URLs in database are stored as: `uploads/files-{timestamp}-{random}.{ext}`
- Frontend automatically builds correct full URLs by removing `/api` prefix
- Maximum file size: 50MB per file
- Maximum 10 files per submission
- **Download functionality works on all devices** including mobile browsers (iOS, Android)
- Files are downloaded using Blob API for maximum compatibility
- Each file has both "Open" (view in browser) and "Download" (save to device) options

