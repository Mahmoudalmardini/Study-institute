# Study Institute - Start All Services
# This script starts the database, backend, and frontend services

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Study Institute - Starting Services" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Start Docker services
Write-Host "[1/3] Starting Docker services (PostgreSQL & Redis)..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 3

# Check if Docker services started
$postgres = docker ps --filter "name=study-institute-postgres" --format "{{.Status}}"
$redis = docker ps --filter "name=study-institute-redis" --format "{{.Status}}"

if ($postgres -and $redis) {
    Write-Host "  ✓ Docker services are running`n" -ForegroundColor Green
} else {
    Write-Host "  ✗ Error: Docker services failed to start`n" -ForegroundColor Red
    Write-Host "Please make sure Docker Desktop is running and try again." -ForegroundColor Yellow
    exit 1
}

# Start Backend
Write-Host "[2/3] Starting Backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Backend Server' -ForegroundColor Cyan; Write-Host '=============='; npm run start:dev"
Write-Host "  ✓ Backend starting in new window`n" -ForegroundColor Green
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[3/3] Starting Frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Frontend Server' -ForegroundColor Cyan; Write-Host '==============='; npm run dev"
Write-Host "  ✓ Frontend starting in new window`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Services are starting up..." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Please wait about 30 seconds for the services to fully start.`n" -ForegroundColor Yellow

Write-Host "Access the application at:" -ForegroundColor White
Write-Host "  → http://localhost:3000`n" -ForegroundColor Cyan

Write-Host "Default login credentials:" -ForegroundColor White
Write-Host "  Username: admin" -ForegroundColor Cyan
Write-Host "  Password: admin123`n" -ForegroundColor Cyan

# Wait a bit and open browser
Write-Host "Opening browser in 20 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 20
Start-Process "http://localhost:3000"

Write-Host "`nBrowser opened! Check the two PowerShell windows for server output.`n" -ForegroundColor Green

