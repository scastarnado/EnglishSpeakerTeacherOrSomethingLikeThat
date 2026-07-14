# C1 Speaking Coach - Quick Start Guide

## Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **Python 3.10-3.13** - Download from [python.org](https://www.python.org/)
3. **Ollama** - Download from [ollama.ai/download](https://ollama.ai/download)

## Installation

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd EnglishSpeakerTeacherOrSomethingLikeThat

# Install Node.js dependencies
npm install

# Install Python dependencies for AI service
cd apps/ai-service
pip install -r requirements.txt
cd ../..
```

### 2. Download AI Models

```bash
# Download a language model (choose one):
ollama pull qwen2.5:7b-instruct   # Recommended - 4.7GB
# OR
ollama pull llama3.1:8b-instruct  # Alternative - 4.7GB
# OR
ollama pull mistral:7b-instruct   # Faster, less capable - 4.1GB

# Whisper models download automatically on first use
```

### 3. Start Development

```bash
# Start the application in development mode
npm run dev --workspace=@c1sc/desktop
```

The application will:

1. Start the Python AI service automatically (localhost:8000)
2. Launch the Electron desktop application
3. Check system health and model availability

## First Run

1. **System Check**: The home screen will verify Ollama is running
2. **Microphone**: Grant microphone permissions when prompted
3. **Start Practice**: Choose "Part 1 Practice" for a quick 3-minute session
4. **Recording**: Click "Start Speaking" to answer questions
5. **Assessment**: Complete the session to receive AI feedback

## Troubleshooting

### Ollama Not Running

```bash
# Check if Ollama is installed
ollama --version

# Start Ollama (it usually runs automatically)
ollama serve
```

### Python Issues

If you see Python dependency errors:

```bash
cd apps/ai-service
pip install --upgrade pip
pip install -r requirements.txt
```

### Microphone Not Working

- **Windows**: Settings → Privacy → Microphone → Allow desktop apps
- Check browser/Electron has microphone permission
- Test in Settings → Microphone Check

### Build Issues

If you encounter build errors:

```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm rebuild
```

## Project Structure

```
EnglishSpeakerTeacherOrSomethingLikeThat/
├── apps/
│   ├── desktop/              # Electron + React application
│   │   ├── electron/         # Electron main and preload
│   │   └── src/              # React frontend
│   └── ai-service/           # Python FastAPI service
│       └── app/              # AI agents and services
├── packages/
│   └── shared-types/         # Shared TypeScript types
└── docs/                     # Documentation
```

## Development Commands

```bash
# Start development mode
npm run dev --workspace=@c1sc/desktop

# Build for production
npm run build --workspace=@c1sc/desktop

# Type checking
npm run tsc --workspace=@c1sc/desktop

# Lint code
npm run lint --workspace=@c1sc/desktop

# Run tests (when implemented)
npm test
```

## Usage Tips

### Part 1 Practice (Recommended for First Try)

- 5-6 personal questions
- 3 minutes total
- Good for testing microphone and system
- Immediate feedback

### Full Mock Exam

- All 4 parts of C1 Advanced
- 15 minutes total
- Complete assessment with detailed feedback
- Save for serious practice sessions

### Assessment Criteria

Your speaking is evaluated on:

- **Grammatical Resource**: Accuracy and range
- **Lexical Resource**: Vocabulary sophistication
- **Discourse Management**: Organization and coherence
- **Pronunciation**: Clarity and intonation
- **Interactive Communication**: Engagement and turn-taking
- **Global Achievement**: Overall impression

## Privacy & Data

- **100% Local**: All processing on your device
- **No Cloud**: No data uploaded anywhere
- **No Tracking**: No analytics or telemetry
- **Data Location**:
  - Recordings: `%APPDATA%/c1-speaking-coach/audio/`
  - Database: `%APPDATA%/c1-speaking-coach/database.db`
  - Logs: `%APPDATA%/c1-speaking-coach/logs/`

## System Requirements

### Minimum

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 10 GB free
- **GPU**: Not required

### Recommended

- **CPU**: 6+ cores
- **RAM**: 16 GB
- **Storage**: 20 GB free (for multiple models)
- **GPU**: NVIDIA with 6GB+ VRAM (for faster LLM)

### High-Performance

- **CPU**: 8+ cores
- **RAM**: 32 GB
- **GPU**: NVIDIA with 12GB+ VRAM
- Faster model responses and better quality

## Known Limitations

1. **TTS Voice**: Currently using placeholder TTS - real voice synthesis needs integration
2. **Part 2 Images**: Image display not fully implemented
3. **Co-Candidate**: Part 3 collaborative task needs peer AI agent
4. **Exercise Generation**: Post-assessment practice exercises not implemented
5. **Pronunciation**: Basic analysis only - advanced pitch/phoneme analysis needs integration

## Getting Help

1. Check [README.md](README.md) for full documentation
2. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
3. Check Settings → System Status for diagnostics
4. Review logs in `%APPDATA%/c1-speaking-coach/logs/`

## Next Steps

After your first session:

1. Review your assessment in Results
2. Read corrections and explanations carefully
3. Practice problematic areas
4. Try different parts to vary practice
5. Use full mock exam to simulate real conditions

## Disclaimer

This is an **independent practice tool** for self-study. It is **not affiliated with Cambridge University Press & Assessment**. The AI-generated assessments are for learning purposes only and do not represent official Cambridge scoring. Always practice with official materials and consider professional tutoring for exam preparation.
