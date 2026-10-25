# ==============================================================================
# Windows PowerShell Automated Deployment Script
# ==============================================================================

param(
    [string]$ImageName = "library-management-system",
    [string]$Tag = "latest",
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Automated Deployment: $ImageName:$Tag on Port $Port" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 1: Run pre-flight tests
Write-Host "`n[1/4] Running automated tests prior to deployment..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Automated tests failed. Aborting deployment!"
    exit 1
}

# Step 2: Build container image
Write-Host "`n[2/4] Building production container image..." -ForegroundColor Yellow
docker build -t "$ImageName`:$Tag" .

# Step 3: Stop existing container if running
Write-Host "`n[3/4] Checking for existing running container..." -ForegroundColor Yellow
$existing = docker ps -q -f "name=$ImageName"
if ($existing) {
    Write-Host "Stopping running container..." -ForegroundColor DarkYellow
    docker stop $ImageName | Out-Null
}

$stopped = docker ps -aq -f "name=$ImageName"
if ($stopped) {
    Write-Host "Removing old container..." -ForegroundColor DarkYellow
    docker rm $ImageName | Out-Null
}

# Step 4: Run new container
Write-Host "`n[4/4] Launching updated container..." -ForegroundColor Green
docker run -d `
    --name $ImageName `
    -p "$Port`:3000" `
    --restart unless-stopped `
    -v library_storage:/usr/src/app/data_storage `
    "$ImageName`:$Tag"

# Health Verification
Write-Host "`nWaiting 5 seconds for health probe..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-RestMethod -Uri "http://localhost:$Port/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Deployment SUCCESSFUL! Service is healthy on http://localhost:$Port" -ForegroundColor Green
    Write-Host "Status: $($response.status), Uptime: $($response.uptimeSeconds)s" -ForegroundColor DarkCyan
} catch {
    Write-Warning "Health check could not be reached immediately. Check container logs:"
    docker logs $ImageName
}
