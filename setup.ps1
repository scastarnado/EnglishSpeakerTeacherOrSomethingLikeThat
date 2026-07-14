# Automated Setup Script for C1 Speaking Coach
# This script installs Ollama and downloads the optimal AI model

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "C1 Speaking Coach - Automated Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Ollama is installed
Write-Host "[1/4] Checking Ollama installation..." -ForegroundColor Yellow
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $ollamaInstalled) {
    Write-Host "Ollama is not installed. Downloading installer..." -ForegroundColor Red
    Write-Host ""
    Write-Host "IMPORTANT: Please follow these steps:" -ForegroundColor Yellow
    Write-Host "1. Visit https://ollama.ai/download" -ForegroundColor White
    Write-Host "2. Download Ollama for Windows" -ForegroundColor White
    Write-Host "3. Run the installer (OllamaSetup.exe)" -ForegroundColor White
    Write-Host "4. After installation, Ollama will start automatically" -ForegroundColor White
    Write-Host "5. Re-run this script" -ForegroundColor White
    Write-Host ""
    
    # Try to open download page
    Start-Process "https://ollama.ai/download"
    
    Write-Host "Opening Ollama download page in your browser..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Press any key after installing Ollama to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    # Check again
    $ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $ollamaInstalled) {
        Write-Host "Ollama still not found. Please restart your terminal after installation." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Ollama is installed" -ForegroundColor Green
$ollamaVersion = ollama --version
Write-Host "  Version: $ollamaVersion" -ForegroundColor Gray
Write-Host ""

# Step 2: Check if Ollama is running
Write-Host "[2/4] Checking Ollama service..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✓ Ollama service is running" -ForegroundColor Green
} catch {
    Write-Host "Ollama service not running. Starting it..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "✓ Ollama service started" -ForegroundColor Green
}
Write-Host ""

# Step 3: Pull the optimal model
Write-Host "[3/4] Downloading AI model (this may take 5-10 minutes)..." -ForegroundColor Yellow
Write-Host "  Model: qwen2.5:7b-instruct (4.7GB)" -ForegroundColor Gray
Write-Host "  This is the recommended model for best quality/performance balance" -ForegroundColor Gray
Write-Host ""

$modelExists = ollama list | Select-String "qwen2.5:7b-instruct"
if ($modelExists) {
    Write-Host "✓ Model already installed" -ForegroundColor Green
} else {
    Write-Host "Downloading model... (this will take several minutes)" -ForegroundColor Cyan
    ollama pull qwen2.5:7b-instruct
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Model downloaded successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to download model" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 4: Verify installation
Write-Host "[4/4] Verifying installation..." -ForegroundColor Yellow
$models = ollama list
Write-Host "Installed models:" -ForegroundColor Gray
Write-Host $models -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run dev --workspace=@c1sc/desktop" -ForegroundColor White
Write-Host "2. The application will start automatically" -ForegroundColor White
Write-Host "3. Grant microphone permissions when prompted" -ForegroundColor White
Write-Host ""
Write-Host "Optional: Install faster Whisper model for transcription" -ForegroundColor Gray
Write-Host "  The Whisper model will download automatically on first use" -ForegroundColor Gray
Write-Host ""
