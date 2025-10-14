# Restart Backend Script
Write-Host "🔄 Restarting Backend..." -ForegroundColor Yellow

# Navigate to backend directory
Set-Location backend

# Clean build
Write-Host "🧹 Cleaning dist folder..." -ForegroundColor Cyan
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Start backend
Write-Host "🚀 Starting backend..." -ForegroundColor Green
npm run start:dev

