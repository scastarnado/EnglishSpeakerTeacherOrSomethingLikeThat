# Quick Setup Guide for C1 Speaking Coach

## Prerequisites Installation (5-10 minutes)

### 1. Install Ollama (2 minutes)
- Download from: https://ollama.ai/download
- Run the installer (OllamaSetup.exe)
- Ollama starts automatically after installation
- Verify: Open a new terminal and run `ollama --version`

### 2. Download AI Model (5-10 minutes, ~4.7GB)
```powershell
# This downloads the optimal model for quality/performance
ollama pull qwen2.5:7b-instruct
```

Alternative models if you have limited resources:
```powershell
# Faster but lower quality (3.8GB)
ollama pull mistral:7b-instruct

# Much faster but basic quality (2.7GB)  
ollama pull qwen2.5:3b-instruct
```

### 3. Verify Ollama is Running
```powershell
# Check service
Invoke-WebRequest -Uri "http://localhost:11434" -Method GET

# List installed models
ollama list
```

## Start the Application

### Development Mode
```powershell
# From project root
npm run dev --workspace=@c1sc/desktop
```

The application will:
1. Start the Python AI service automatically (localhost:8000)
2. Launch the Electron desktop app
3. Check system health

### First Run
1. **Grant Permissions**: Allow microphone access when prompted
2. **Check Status**: Home screen shows system health (green = ready)
3. **Start Practice**: Click "Start Part 1" for a 3-minute practice session

## Troubleshooting

### Ollama Not Running
```powershell
# Start Ollama service
ollama serve
```

### Python Dependencies Missing
```powershell
cd apps\ai-service
pip install -r requirements.txt
```

### Model Download Interrupted
```powershell
# Resume download
ollama pull qwen2.5:7b-instruct
```

## System Requirements Check

**Minimum** (qwen2.5:7b-instruct):
- RAM: 8GB (6GB free)
- CPU: 4 cores
- Storage: 10GB free

**Recommended**:
- RAM: 16GB
- CPU: 6+ cores
- Storage: 20GB free

**For Faster Performance** (optional):
- NVIDIA GPU with 6GB+ VRAM
- Install CUDA toolkit
- Ollama will automatically use GPU

## Ready to Use!

Once Ollama shows in `ollama list`, run:
```powershell
npm run dev --workspace=@c1sc/desktop
```

Your C1 Speaking Coach will be ready to practice!
