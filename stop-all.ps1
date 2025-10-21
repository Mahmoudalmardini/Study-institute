# Study Institute - Stop All Services
# This script stops the backend, frontend, and Docker services

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Study Institute - Stopping Services" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Stop Node processes on ports 3000 and 3001
Write-Host "[1/2] Stopping Backend and Frontend servers..." -ForegroundColor Yellow

$backend = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $backendProcess = Get-Process -Id $backend.OwningProcess -ErrorAction SilentlyContinue
    if ($backendProcess) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Backend server stopped" -ForegroundColor Green
    }
} else {
    Write-Host "  • Backend was not running" -ForegroundColor Gray
}

$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontend) {
    $frontendProcess = Get-Process -Id $frontend.OwningProcess -ErrorAction SilentlyContinue
    if ($frontendProcess) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Frontend server stopped" -ForegroundColor Green
    }
} else {
    Write-Host "  • Frontend was not running" -ForegroundColor Gray
}

# Stop Docker services
Write-Host "`n[2/2] Stopping Docker services..." -ForegroundColor Yellow
docker-compose down
Write-Host "  ✓ Docker services stopped`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All services stopped successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

