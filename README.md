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

This section explains how to install the app from zero. It is written for someone who has never installed a development project before.

There are two ways to use C1 Speaking Coach:

1. **Normal user installation**: install the ready-made Windows app and open it from the Desktop.
2. **Developer/source installation**: download the source code, install the tools, run it, and build your own Windows installer.

If you only want to use the program, follow **Option A**. If you want to change the code or build the installer yourself, follow **Option B**.

### What This App Needs

C1 Speaking Coach is a desktop app. It also uses local AI, which means the AI runs on your own computer instead of being sent to a cloud service.

Before you start, make sure you have:

- A Windows 10 or Windows 11 computer, 64-bit.
- At least 8 GB RAM. 16 GB is better.
- At least 10 GB free storage. 20 GB is better.
- A working microphone.
- An internet connection for the first setup.
- A little patience: the AI model download is several GB and can take a while.

### Option A: Install the Ready-Made Windows App

This is the easiest path.

#### Step 1: Download Ollama

Ollama is the small program that runs the local language model. The language model is the "brain" the app talks to.

1. Open this link in your browser: [https://ollama.com/download](https://ollama.com/download)
2. Download **Ollama for Windows**.
3. Open the downloaded installer. It is usually called `OllamaSetup.exe`.
4. Follow the installer steps.
5. When it finishes, Ollama should run in the background.

#### Step 2: Check That Ollama Works

1. Click the Windows **Start** button.
2. Type `PowerShell`.
3. Open **Windows PowerShell**.
4. Type this command and press Enter:

   ```powershell
   ollama --version
   ```

If you see a version number, Ollama is installed.

If Windows says it cannot find `ollama`, close PowerShell, open it again, and try the command one more time. If it still does not work, restart the computer.

#### Step 3: Download the AI Model

In the same PowerShell window, run:

```powershell
ollama pull qwen2.5:7b-instruct
```

This downloads the recommended model. It is large, so it may take several minutes.

If your computer is older or has only 8 GB RAM, use the smaller model instead:

```powershell
ollama pull qwen2.5:3b-instruct
```

If your computer is powerful and has lots of memory, you can use the bigger model:

```powershell
ollama pull qwen2.5:14b-instruct
```

To check which models are installed, run:

```powershell
ollama list
```

#### Step 4: Install C1 Speaking Coach

If you received a release folder from this project, open:

```text
apps\desktop\release\1.0.0
```

Then double-click:

```text
C1 Speaking Coach Setup 1.0.0.exe
```

Follow the installer:

1. Choose where to install the app.
2. Leave **Create desktop shortcut** enabled.
3. Finish the installation.

When the installer finishes, Windows should place a shortcut named **C1 Speaking Coach** on your Desktop and in the Start Menu.

#### Step 5: Open the App

1. Go to your Desktop.
2. Double-click **C1 Speaking Coach**.
3. If Windows asks for microphone permission, choose **Allow**.
4. Start with a short Part 1 practice session.

After the first setup, you do not need the internet to use the app, as long as Ollama and the model are already installed.

### Option B: Install From Source Code and Build the Desktop App

Use this path if you downloaded the source code from GitHub or want to build your own installer.

#### Step 1: Install Git

Git downloads the project code.

1. Open [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download **Git for Windows**.
3. Run the installer.
4. The default choices are fine. Keep clicking **Next**, then **Install**.
5. After it finishes, open PowerShell and check it:

   ```powershell
   git --version
   ```

#### Step 2: Install Node.js

Node.js runs the desktop app build tools. npm comes with Node.js.

1. Open [https://nodejs.org/en/download](https://nodejs.org/en/download)
2. Download the **LTS** version for Windows.
3. Run the installer.
4. Keep the default options.
5. After it finishes, close PowerShell and open it again.
6. Check Node.js and npm:

   ```powershell
   node --version
   npm --version
   ```

This project needs Node.js 18 or newer and npm 9 or newer.

#### Step 3: Install Python

Python runs the local AI service during development and helps build the bundled AI service.

1. Open [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Download Python 3.10 or newer.
3. Run the installer.
4. Important: tick the checkbox that says **Add python.exe to PATH**.
5. Click **Install Now**.
6. After it finishes, close PowerShell and open it again.
7. Check Python:

   ```powershell
   python --version
   pip --version
   ```

#### Step 4: Install Ollama and Download a Model

Follow the same Ollama setup from **Option A**:

1. Download Ollama from [https://ollama.com/download](https://ollama.com/download)
2. Install it.
3. Open PowerShell.
4. Run:

   ```powershell
   ollama pull qwen2.5:7b-instruct
   ```

#### Step 5: Download the Project Code

Choose a folder where you want to keep the project. For example, `Documents`.

In PowerShell:

```powershell
cd $HOME\Documents
git clone https://github.com/yourusername/c1-speaking-coach.git
cd c1-speaking-coach
```

If you downloaded the project as a ZIP file instead:

1. Right-click the ZIP file.
2. Choose **Extract All**.
3. Open the extracted folder.
4. Right-click inside the folder and choose **Open in Terminal** or **Open PowerShell window here**.

You should now be inside the project folder, the folder that contains `package.json` and `README.md`.

#### Step 6: Install JavaScript Dependencies

From the project folder, run:

```powershell
npm install
```

This creates the `node_modules` folder. It may take a few minutes.

#### Step 7: Create the Python Virtual Environment

A virtual environment is a small private Python box for this project. It keeps this app's Python packages separate from the rest of your computer.

From the project folder, run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r apps\ai-service\requirements.txt
```

If PowerShell says scripts are blocked, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate the virtual environment again:

```powershell
.\.venv\Scripts\Activate.ps1
```

You will know it worked when the line in PowerShell starts with `(.venv)`.

#### Step 8: Start the App in Development Mode

Make sure you are still in the project folder and the virtual environment is active.

Run:

```powershell
npm run dev
```

This starts two things:

- The Python AI service.
- The Electron desktop app.

When the app opens, allow microphone access if Windows asks.

You can also use the helper script:

```powershell
.\start.ps1
```

#### Step 9: Build Your Own Windows Installer

Only do this after the app works in development mode.

First, build the Python AI service into an executable:

```powershell
.\.venv\Scripts\Activate.ps1
pip install pyinstaller
cd apps\ai-service
pyinstaller ai-service.spec
cd ..\..
```

Then build the desktop app installer:

```powershell
npm run build:win
```

When the build finishes, the installer should appear here:

```text
apps\desktop\release\1.0.0\C1 Speaking Coach Setup 1.0.0.exe
```

Double-click that file to install the app. Keep **Create desktop shortcut** enabled. After installation, double-click the **C1 Speaking Coach** shortcut on your Desktop.

### Easy Setup Script

This repository also includes a helper script:

```powershell
.\setup.ps1
```

It checks Ollama, helps start Ollama, and downloads the recommended model. It does not replace the full setup above, but it can make the Ollama part easier.

### Installation Checklist

Before using the app, check that all of these are true:

- `ollama --version` works.
- `ollama list` shows at least one model, preferably `qwen2.5:7b-instruct`.
- The app installer has been run.
- A **C1 Speaking Coach** shortcut exists on the Desktop or in the Start Menu.
- Your microphone is connected and allowed in Windows privacy settings.

### Windows Microphone Permission

If the app cannot hear you:

1. Open Windows **Settings**.
2. Go to **Privacy & security**.
3. Open **Microphone**.
4. Turn on **Microphone access**.
5. Turn on **Let desktop apps access your microphone**.
6. Close and reopen C1 Speaking Coach.

### Uninstalling

To remove the app:

1. Open Windows **Settings**.
2. Go to **Apps**.
3. Find **C1 Speaking Coach**.
4. Click **Uninstall**.

To remove the downloaded Ollama model and free disk space:

```powershell
ollama rm qwen2.5:7b-instruct
```

If you installed a different model, replace the model name with the one shown by:

```powershell
ollama list
```

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
