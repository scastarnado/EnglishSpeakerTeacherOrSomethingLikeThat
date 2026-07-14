import type { SessionConfig } from '@shared/index';
import { AlertCircle, CheckCircle, Clock, Mic, Play } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [isTrainingMode, setIsTrainingMode] = useState(true); // true = Training, false = Exam

  // Check system health on mount
  useState(() => {
    checkSystemHealth();
  });

  async function checkSystemHealth() {
    try {
      const health = await window.electronAPI.system.checkHealth();
      setSystemHealthy(health.healthy);
    } catch {
      setSystemHealthy(false);
    }
  }

  async function startPart1Practice() {
    setIsCreating(true);
    try {
      const config: SessionConfig = {
        mode: isTrainingMode ? 'intensive_correction' : 'part_practice',
        targetLevel: 'C1',
        feedbackMode: isTrainingMode ? 'immediate' : 'end_only',
        parts: [1],
        llmModel: 'qwen2.5:7b-instruct',
        whisperModel: 'small.en',
        ttsVoice: 'british_male',
        audioRetentionPolicy: '7_days',
        enablePronunciationAnalysis: true,
      };

      const session = await window.electronAPI.session.create(config);
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to start session. Please check system health.');
    } finally {
      setIsCreating(false);
    }
  }

  async function startFullMockExam() {
    setIsCreating(true);
    try {
      const config: SessionConfig = {
        mode: isTrainingMode ? 'conversation' : 'full_mock',
        targetLevel: 'C1',
        feedbackMode: isTrainingMode ? 'immediate' : 'end_only',
        llmModel: 'qwen2.5:7b-instruct',
        whisperModel: 'small.en',
        ttsVoice: 'british_male',
        audioRetentionPolicy: '7_days',
        enablePronunciationAnalysis: true,
      };

      const session = await window.electronAPI.session.create(config);
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to start session. Please check system health.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to C1 Speaking Coach</h1>
        <p className="text-lg text-muted-foreground">
          Practice your C1 Advanced speaking skills with AI-powered examination
          simulation.
        </p>
      </div>

      {/* System Status */}
      <div className="mb-8 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          {systemHealthy === null ? (
            <>
              <Clock className="w-5 h-5 text-muted-foreground animate-spin" />
              <span>Checking system status...</span>
            </>
          ) : systemHealthy ? (
            <>
              <CheckCircle className="w-5 h-5 text-success" />
              <span>System ready</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-error" />
              <span className="text-error">
                System not ready. Please check Settings → Models
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="mb-8 p-6 rounded-lg border-2 border-primary/20 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Session Mode</h3>
            <p className="text-sm text-muted-foreground">
              {isTrainingMode
                ? 'Training Mode: Get immediate feedback and advice during practice'
                : 'Exam Mode: Official Cambridge C1 examination simulation (feedback at end only)'}
            </p>
          </div>
          <button
            onClick={() => setIsTrainingMode(!isTrainingMode)}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isTrainingMode ? 'bg-success' : 'bg-primary'
              }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isTrainingMode ? 'translate-x-1' : 'translate-x-9'
                }`}
            />
          </button>
        </div>
        <div className="flex items-start gap-4 text-sm">
          <div className={`flex-1 p-3 rounded-md ${isTrainingMode ? 'bg-success/10 border border-success/30' : 'bg-muted'}`}>
            <p className="font-semibold mb-1">🎓 Training Mode</p>
            <p className="text-muted-foreground text-xs">
              AI gives feedback, corrections, and suggestions after each response
            </p>
          </div>
          <div className={`flex-1 p-3 rounded-md ${!isTrainingMode ? 'bg-primary/10 border border-primary/30' : 'bg-muted'}`}>
            <p className="font-semibold mb-1">📝 Exam Mode</p>
            <p className="text-muted-foreground text-xs">
              Authentic exam experience with official examiner behavior
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Part 1 Practice */}
        <div className="p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Part 1 Practice</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isTrainingMode
                  ? 'Personal interview with immediate feedback and coaching after each response.'
                  : 'Official Part 1 interview simulation. Personal questions about your life and interests.'}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />3 minutes
                </span>
                <span>• Interview</span>
                {isTrainingMode && <span className="text-success font-medium">• With Feedback</span>}
              </div>
              <button
                onClick={startPart1Practice}
                disabled={!systemHealthy || isCreating}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Starting...' : 'Start Part 1'}
              </button>
            </div>
          </div>
        </div>

        {/* Full Mock Exam */}
        <div className="p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{isTrainingMode ? 'Full Practice Session' : 'Full Mock Examination'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isTrainingMode
                  ? 'Complete speaking practice with all four parts. Get feedback and tips throughout.'
                  : 'Authentic C1 examination simulation with all four parts. Official examiner behavior.'}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  15 minutes
                </span>
                <span>• All 4 parts</span>
                {isTrainingMode && <span className="text-success font-medium">• With Feedback</span>}
              </div>
              <button
                onClick={startFullMockExam}
                disabled={!systemHealthy || isCreating}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Starting...' : (isTrainingMode ? 'Start Practice' : 'Start Full Exam')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">Dual Mode Training</h3>
            <p className="text-sm text-muted-foreground">
              Switch between training mode with immediate feedback and authentic exam mode with official examiner behavior.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">AI Interlocutor & Examiner</h3>
            <p className="text-sm text-muted-foreground">
              Natural conversation with an AI that adapts between helpful coach and strict Cambridge examiner.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">Evidence-Based Feedback</h3>
            <p className="text-sm text-muted-foreground">
              Detailed assessment with transcript citations, corrections, and specific examples from your responses.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">Speech Recognition & Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Automatic transcription, pronunciation analysis, and fluency metrics using Whisper AI.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">100% Local & Private</h3>
            <p className="text-sm text-muted-foreground">
              All processing happens on your device. No data uploaded to cloud. Complete privacy.
            </p>
          </div>
        </div>
      </div>

      {/* System Requirements Notice */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50 text-sm">
        <p className="font-semibold mb-1">First time using C1 Speaking Coach?</p>
        <p className="text-muted-foreground">
          Make sure you have installed Ollama and downloaded a language model. Visit
          Settings → Models for configuration help.
        </p>
      </div>
    </div>
  );
}
