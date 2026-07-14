# Start C1 Speaking Coach
# Run this after Ollama is installed and model is downloaded

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting C1 Speaking Coach" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Ollama
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $ollamaInstalled) {
    Write-Host "✗ Ollama not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: .\setup.ps1" -ForegroundColor Yellow
    Write-Host "Or follow: SETUP_INSTRUCTIONS.md" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Ollama installed" -ForegroundColor Green

# Check if Ollama is running
try {
    $null = Invoke-WebRequest -Uri "http://localhost:11434" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Ollama service running" -ForegroundColor Green
} catch {
    Write-Host "! Ollama not running, starting..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "✓ Ollama service started" -ForegroundColor Green
}

# Check for model
$hasModel = ollama list | Select-String "qwen2.5:7b"
if (-not $hasModel) {
    Write-Host "! No AI model found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Downloading qwen2.5:7b-instruct (4.7GB)..." -ForegroundColor Cyan
    Write-Host "This will take 5-10 minutes..." -ForegroundColor Gray
    ollama pull qwen2.5:7b-instruct
    Write-Host "✓ Model downloaded" -ForegroundColor Green
} else {
    Write-Host "✓ AI model ready" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting application..." -ForegroundColor Cyan
Write-Host ""

# Start the dev server
npm run dev --workspace=@c1sc/desktop
