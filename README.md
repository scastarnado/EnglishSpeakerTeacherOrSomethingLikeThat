# C1 Speaking Coach

A local-first desktop application for practicing the C1 Advanced English Speaking examination with AI-powered interlocutors, co-candidates, and assessors.

## ⚠️ Disclaimer

**This is an independent practice tool and is not affiliated with, endorsed by, or connected to Cambridge University Press & Assessment.** This application does not provide official Cambridge assessment or certification. It is designed solely as a practice aid for learners preparing for C1-level speaking examinations.

## Features

- **Complete C1 Speaking Exam Simulation**: All four parts with realistic timing and structure
- **AI Interlocutor**: Natural examiner behavior powered by local language models
- **AI Co-Candidate**: Collaborative discussion partner for Parts 3 and 4
- **Evidence-Based Assessment**: Detailed feedback with transcript citations and acoustic analysis
- **100% Local**: No cloud APIs, subscriptions, or data upload required
- **Offline Operation**: Works without internet after model setup
- **Privacy-First**: All recordings and data stay on your device
- **Progress Tracking**: Identify recurring mistakes and track improvement over time
- **Personalized Exercises**: Targeted practice based on your actual weaknesses

## System Requirements

### Minimum (Low-Resource Profile)

- **OS**: Windows 10/11 (64-bit), Linux (planned), macOS (planned)
- **CPU**: 4-core modern processor
- **RAM**: 8 GB (16 GB recommended)
- **Storage**: 10 GB free space
- **GPU**: Not required (CPU-only mode supported)

### Recommended (Balanced Profile)

- **RAM**: 16-32 GB
- **GPU**: NVIDIA GPU with 6+ GB VRAM or equivalent AMD GPU
- **Storage**: 20 GB free space

### High-Quality Profile

- **RAM**: 32+ GB
- **GPU**: NVIDIA GPU with 12+ GB VRAM
- **Storage**: 30 GB free space

## Installation

### Prerequisites

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Pull a language model**:

   ```bash
   # Recommended balanced model
   ollama pull qwen2.5:7b-instruct

   # Or for low-resource systems
   ollama pull qwen2.5:3b-instruct

   # Or for high-quality systems
   ollama pull qwen2.5:14b-instruct
   ```

3. **Install Python 3.10+**: Download from [python.org](https://python.org)

### Application Setup

1. **Download and extract** the latest release
2. **Run the installer** (Windows) or execute the portable version
3. **Follow the setup wizard**:
   - Select microphone
   - Test audio recording
   - Configure AI models
   - Choose resource profile
   - Set privacy preferences

## Quick Start

### Your First Practice Session

1. Launch **C1 Speaking Coach**
2. Click **"Start Part 1 Practice"**
3. Allow microphone access when prompted
4. Listen to the examiner's questions
5. Speak your answers naturally
6. Review your detailed assessment after the session

### Full Mock Examination

1. Choose **"Full Mock Exam"** from the home screen
2. Allocate 15-20 minutes of uninterrupted time
3. Complete all four parts:
   - Part 1: Interview (3 minutes)
   - Part 2: Long turn with visual prompts (4 minutes)
   - Part 3: Collaborative task (4 minutes)
   - Part 4: Discussion (5 minutes)
4. Receive comprehensive feedback with evidence

## Development

### Setup Development Environment

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd apps/ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Initialize database
npm run db:migrate

# Seed initial content
npm run db:seed
```

### Run in Development Mode

```bash
# Terminal 1: Start the AI service
npm run dev:service

# Terminal 2: Start the Electron app
npm run dev
```

### Run Tests

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Python backend tests
cd apps/ai-service
pytest
```

### Build for Production

```bash
# Build for Windows
npm run build:win

# Build for Linux (planned)
npm run build:linux

# Build for macOS (planned)
npm run build:mac
```

## Architecture

C1 Speaking Coach uses a local architecture with three main components:

1. **Desktop Application** (Electron + React + TypeScript)
   - User interface
   - Session management
   - Audio recording
   - Results visualization

2. **AI Service** (Python + FastAPI)
   - Speech-to-text (Whisper)
   - LLM inference (Ollama)
   - Text-to-speech (local TTS)
   - Audio analysis
   - Assessment generation

3. **Local Database** (SQLite)
   - Session history
   - Transcripts
   - Assessments
   - Progress tracking
   - User preferences

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed technical documentation.

## Privacy & Data

### What Data is Stored

- Audio recordings (optional, configurable retention)
- Session transcripts
- Assessment results
- Progress metrics
- User preferences

### Where Data is Stored

- All data is stored locally on your device
- Default location: `%APPDATA%/c1-speaking-coach/` (Windows)
- No data is uploaded to external servers

### Data Control

- Export your data at any time (JSON, PDF, CSV)
- Delete all data from Settings → Privacy
- Configure audio retention: never, 7 days, 30 days, or indefinitely
- Recordings can be automatically deleted after assessment

## Models

### Language Models (Ollama)

- **Qwen 2.5 7B Instruct** (Recommended): Best balance of quality and speed
- **Qwen 2.5 3B Instruct**: For low-resource systems
- **Qwen 2.5 14B Instruct**: Maximum quality for powerful systems
- Custom models: Configure any Ollama-compatible model

### Speech Recognition (Whisper)

- **small.en**: Fast, suitable for most users
- **medium.en**: Balanced accuracy
- **large-v3**: Highest accuracy, requires more resources

### Text-to-Speech

- **Kokoro TTS**: Natural British English voices
- **System TTS**: Fallback option using OS voices

### Model Management

- Download and configure models from Settings → Models
- Switch models between sessions
- View model requirements and performance
- Test models before practice sessions

## Known Limitations

1. **Pronunciation Assessment**: Limited compared to human examiners. The system provides conservative feedback based on acoustic analysis but cannot match expert phonetic evaluation.

2. **Transcription Accuracy**: Speech recognition may occasionally misunderstand words, especially with:
   - Strong accents
   - Background noise
   - Technical vocabulary
   - Rapid speech

3. **AI Interlocutor**: While designed to simulate examiner behavior, the AI may occasionally:
   - Ask slightly unnatural follow-ups
   - Miss subtle interaction cues
   - Generate responses outside strict examination protocol

4. **Assessment Validity**: Scores are estimates for practice purposes only and do not represent official Cambridge assessment.

5. **Resource Requirements**: Large models require significant RAM and processing power. Performance varies based on hardware.

## Troubleshooting

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for detailed solutions.

### Common Issues

**"Ollama connection failed"**

- Ensure Ollama is running: `ollama serve`
- Check Ollama version: `ollama --version`
- Verify model is installed: `ollama list`

**"Microphone not detected"**

- Grant microphone permissions in system settings
- Check microphone is not in use by another application
- Try a different microphone or USB port

**"Speech recognition timeout"**

- Whisper model may be too large for your system
- Switch to a smaller model in Settings → Models
- Ensure sufficient RAM is available

**"Out of memory"**

- Close other applications
- Switch to smaller models
- Reduce audio quality settings

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.

Third-party licenses are documented in [THIRD_PARTY_LICENSES.md](./docs/THIRD_PARTY_LICENSES.md).

## Roadmap

### Version 1.0 (Current Focus)

- [x] Part 1 practice
- [ ] Complete Parts 2-4 implementation
- [ ] Full mock examination mode
- [ ] Evidence-based assessment
- [ ] Audio analysis and pronunciation feedback
- [ ] Windows installer

### Version 1.1 (Planned)

- [ ] Progress tracking dashboard
- [ ] Recurring mistake identification
- [ ] Personalized exercise generation
- [ ] Conversation practice mode
- [ ] Intensive correction mode

### Version 1.2 (Planned)

- [ ] Linux support
- [ ] macOS support
- [ ] Advanced audio analysis
- [ ] Custom task creation
- [ ] Task pack import/export

### Future Considerations

- [ ] Additional language examinations (IELTS, TOEFL, etc.)
- [ ] Multi-language support for interface
- [ ] Advanced analytics and insights
- [ ] Collaborative practice with other learners

## Support

- **Documentation**: See [docs/](./docs/) folder
- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Community support via GitHub Discussions

## Acknowledgments

- **Ollama**: Local LLM runtime
- **Whisper**: Speech recognition
- **Kokoro TTS**: Text-to-speech synthesis
- **Cambridge Assessment English**: Examination format reference (not affiliated)

---

**Made for learners who value privacy, local control, and serious C1 speaking practice.**
