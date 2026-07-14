# Development Guide - C1 Speaking Coach

## Implementation Status

### ✅ Completed Components

#### Backend Infrastructure
- **Electron Main Process** (`apps/desktop/electron/main/`)
  - Application lifecycle management
  - Window creation with security policies
  - Service initialization and cleanup
  - IPC handler registration

- **AI Service Manager** (`electron/main/services/ai-service-manager.ts`)
  - Python FastAPI service lifecycle
  - Health monitoring and auto-restart
  - Bearer token authentication
  - Port management

- **Database Manager** (`electron/main/services/database-manager.ts`)
  - SQLite with WAL mode
  - 15-table schema (profiles, sessions, turns, assessments, etc.)
  - Migration system
  - Type-safe queries

- **Audio Manager** (`electron/main/services/audio-manager.ts`)
  - Recording storage in session folders
  - Retention policy enforcement
  - Path management

- **IPC Layer** (`electron/main/ipc/handlers.ts`)
  - Type-safe communication
  - All channels implemented
  - Error handling

#### Python AI Service (`apps/ai-service/`)
- **FastAPI Application** (`app/main.py`)
  - Async lifespan management
  - Bearer token auth
  - Health endpoints
  - Route registration

- **Ollama Client** (`app/llm/ollama_client.py`)
  - HTTP client for local Ollama
  - Structured output with Pydantic validation
  - JSON extraction and retry logic
  - Error handling

- **Transcription Service** (`app/audio/transcription.py`)
  - faster-whisper integration
  - Word-level timestamps
  - Confidence scoring
  - Async execution

- **Audio Analysis** (`app/audio/analysis.py`)
  - Energy-based VAD
  - Pause detection
  - Pitch analysis with librosa
  - Speech metrics calculation

- **AI Agents**
  - **Interlocutor** (`app/exam/interlocutor.py`): Examiner simulation with part-specific behavior
  - **Co-Candidate** (`app/exam/co_candidate.py`): Peer candidate for Part 3
  - **Assessor** (`app/assessment/assessor.py`): Evidence-based assessment generation

- **API Routes**
  - Audio routes (transcribe, analyze)
  - Exam routes (interlocutor, co-candidate)
  - Assessment route (generate)
  - TTS routes (synthesize, voices)

#### Frontend Application (`apps/desktop/src/`)
- **React Setup**
  - Router with react-router-dom
  - TanStack Query for data fetching
  - TypeScript strict mode
  - TailwindCSS styling

- **Pages**
  - **HomePage**: Session creation and system status
  - **SessionPage**: Recording, transcription, AI interaction
  - **ResultsPage**: Assessment display with scores and corrections
  - **HistoryPage**: Session list with filtering
  - **SettingsPage**: Model configuration and system diagnostics

- **Components**
  - Layout with sidebar navigation
  - Recording controls with MediaRecorder API
  - Transcript display
  - Assessment visualizations

#### Shared Types (`packages/shared-types/`)
- Comprehensive type definitions
- Zod schemas for validation
- IPC channel types
- All domain models defined

## 🔨 Needs Implementation

### High Priority

1. **Examination State Machine**
   - Location: Create `apps/desktop/src/lib/exam-state-machine.ts`
   - Purpose: Deterministic control of exam flow through all 20 states
   - Requirements:
     - Implement state transitions for all 4 parts
     - Timer management per state
     - Task selection logic
     - Part 2 image display
     - Part 3 collaborative turn-taking
     - Part 4 follow-up questions

2. **TTS Integration**
   - Current: Placeholder in `apps/ai-service/app/tts/tts_service.py`
   - Options:
     - **Kokoro-ONNX**: Fast, British accent, good quality
     - **Piper**: Very fast, multiple voices
     - **Coqui TTS**: Higher quality, slower
   - Implementation needed:
     - Replace `_synthesize_placeholder` with real synthesis
     - Audio file generation
     - Caching (already implemented)

3. **Task Bank**
   - Location: Create `apps/ai-service/app/tasks/` or separate JSON files
   - Requirements:
     - Minimum 30 Part 1 questions across 5-6 topics
     - 10 Part 2 image pair tasks with actual images
     - 10 Part 3 discussion scenarios
     - 10 Part 4 abstract topics
   - Database seeding script

4. **Audio Playback**
   - Location: `apps/desktop/src/components/AudioPlayer.tsx`
   - Features:
     - Play TTS-generated audio
     - Playback controls
     - Queue management for multi-turn responses

5. **Microphone Test**
   - Location: `apps/desktop/src/pages/MicrophoneTestPage.tsx`
   - Features:
     - Level meter visualization
     - Test recording and playback
     - Device selection
     - Calibration

### Medium Priority

6. **Part 2 Image Display**
   - Location: `apps/desktop/src/components/ImageComparison.tsx`
   - Features:
     - Side-by-side image display
     - Zoom capability
     - Timer overlay
     - Notes section

7. **Part 3 Turn Management**
   - Modify: `apps/desktop/src/pages/SessionPage.tsx`
   - Features:
     - Visual indication of whose turn it is
     - Co-candidate response display
     - Turn-taking prompts
     - Discussion option display

8. **Advanced Pronunciation Analysis**
   - Option 1: Integrate praat-parselmouth (requires compatible Python)
   - Option 2: Use Azure Pronunciation Assessment API (offline limit)
   - Option 3: Custom phoneme-level analysis
   - Features:
     - Stress pattern detection
     - Intonation contours
     - Phoneme-level errors
     - Connected speech features

9. **Exercise Generation**
   - Location: `apps/ai-service/app/exercises/generator.py`
   - Features:
     - Generate targeted exercises from corrections
     - Grammar drills
     - Vocabulary practice
     - Pronunciation exercises
     - Save to database

10. **Progress Dashboard**
    - Location: `apps/desktop/src/pages/DashboardPage.tsx`
    - Features:
      - Score trends over time
      - Recurring mistakes tracking
      - Criterion breakdown charts
      - Study time statistics

### Low Priority

11. **Settings Persistence**
    - Implement user settings storage
    - Model preferences
    - Audio settings
    - UI preferences

12. **Export Functionality**
    - Export assessment as PDF
    - Export transcript with timestamps
    - Data export for external analysis

13. **Testing**
    - Unit tests for state machine
    - Integration tests for IPC
    - E2E tests with Playwright
    - Assessment validation tests

14. **Build & Packaging**
    - Fix electron-builder configuration
    - Code signing
    - Auto-update mechanism
    - Installer creation

15. **Performance Optimization**
    - Lazy loading for pages
    - Audio compression
    - Database indexing
    - Bundle size optimization

## Architecture Decisions

### Why Electron + Python?
- **Electron**: Cross-platform desktop, web technologies, IPC isolation
- **Python**: Rich AI/ML ecosystem (Whisper, librosa), easy LLM integration
- **Separation**: Python crashes don't affect UI, can restart service independently

### Why SQLite?
- **Local-first**: No server setup
- **Simple**: Single file database
- **Fast**: Sufficient for desktop workload
- **Portable**: Easy to backup and transfer

### Why Ollama?
- **Free**: No API costs
- **Offline**: Complete privacy
- **Flexible**: Multiple model choices
- **Active**: Well-maintained, good performance

### Why Structured Output?
- **Reliability**: Guaranteed JSON format
- **Validation**: Pydantic schemas catch errors
- **Retry Logic**: Automatic recovery from malformed output
- **Type Safety**: End-to-end type checking

## Development Workflow

### Adding a New Feature

1. **Define Types** (`packages/shared-types/src/index.ts`)
   ```typescript
   export interface NewFeature {
     id: string;
     // ... fields
   }
   
   export const NewFeatureSchema = z.object({
     id: z.string(),
     // ... validation
   });
   ```

2. **Database Schema** (if needed)
   - Add migration in `database-manager.ts`
   - Create table
   - Add queries

3. **Backend Service** (`apps/ai-service/app/`)
   - Implement Python service
   - Add Pydantic models
   - Create API route
   - Test with curl/Postman

4. **IPC Handler** (`electron/main/ipc/handlers.ts`)
   - Add IPC channel to shared types
   - Implement handler
   - Call backend service

5. **Preload API** (`electron/preload/index.ts`)
   - Expose IPC method
   - Type-safe wrapper

6. **Frontend Component** (`apps/desktop/src/`)
   - Create React component
   - Use electronAPI
   - Handle loading/error states

7. **Test**
   - Manual testing
   - Add unit tests
   - Update documentation

### Debugging Tips

**Python Service**
- Logs: Check terminal output where Electron runs
- Direct testing: `cd apps/ai-service && uvicorn app.main:app --reload`
- API docs: http://localhost:8000/docs

**Electron Main Process**
- Console logs appear in terminal
- Use Chrome DevTools: Help → Toggle Developer Tools (for renderer)
- Check IPC messages with `console.log` in handlers

**React Frontend**
- F12 for DevTools
- React DevTools extension
- Network tab for API calls (won't show IPC)

**Database**
- Location: `%APPDATA%/c1-speaking-coach/database.db`
- Use DB Browser for SQLite
- Check migrations table for schema version

## Code Style

### TypeScript
- Strict mode enabled
- Use interfaces for data, types for unions
- Prefer `const` over `let`
- Use async/await over promises
- Handle errors with try/catch

### Python
- Type hints for all functions
- Pydantic for data validation
- Async for I/O operations
- Docstrings for classes/functions
- Follow PEP 8

### React
- Functional components with hooks
- Custom hooks for shared logic
- Prop types from shared-types
- Meaningful component names
- Separate concerns (UI vs logic)

## Performance Targets

- **Transcription**: < 3 seconds for 30-second audio
- **AI Response**: < 5 seconds (depends on model size)
- **Assessment**: < 30 seconds for full session
- **UI Response**: < 100ms for interactions
- **Memory**: < 1GB Electron, < 2GB Python (without model)
- **Model in Memory**: +4-8GB depending on size

## Security Considerations

1. **Context Isolation**: Enabled, prevents renderer from accessing Node.js
2. **Node Integration**: Disabled in renderer
3. **IPC Validation**: All inputs validated with Zod
4. **Bearer Token**: Random 32-byte token for Python auth
5. **Local Only**: No network access except localhost
6. **No Eval**: Never use eval() or new Function()
7. **CSP**: Content Security Policy restricts script sources

## Future Enhancements

- Multi-user support with profiles
- Cloud sync (optional, encrypted)
- Mobile companion app for practice on-the-go
- Additional exam formats (IELTS, TOEFL)
- Teacher mode for tutors to review student sessions
- Custom task creation interface
- Speech rate visualization
- Vocabulary frequency analysis
- Comparison with Cambridge marking rubrics
- Integration with spaced repetition for vocabulary

## Contributing

When contributing:
1. Read this guide fully
2. Check existing issues/features
3. Create feature branch
4. Write tests
5. Update documentation
6. Submit PR with description

## License

This project is for educational purposes. It is not affiliated with Cambridge University Press & Assessment. All Cambridge-related trademarks belong to their respective owners.
