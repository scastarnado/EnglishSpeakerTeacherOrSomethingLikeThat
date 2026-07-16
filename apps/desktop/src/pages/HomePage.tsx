import type { SessionConfig } from '@shared/index';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Images,
  MessageSquare,
  Mic,
  Play,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { usePreferences } from '../lib/preferences';

type PracticePart = {
  part: 1 | 2 | 3 | 4;
  title: string;
  duration: string;
  format: string;
  Icon: LucideIcon;
  practiceDescription: string;
  examDescription: string;
};

const PRACTICE_PARTS: PracticePart[] = [
  {
    part: 1,
    title: 'Part 1 Interview',
    duration: '2 minutes',
    format: 'Personal questions',
    Icon: Mic,
    practiceDescription: 'Focused rehearsal with realistic personal questions and detailed feedback afterward.',
    examDescription: 'Strict Part 1 interview simulation with personal questions and neutral examiner behavior.',
  },
  {
    part: 2,
    title: 'Part 2 Long Turn',
    duration: '1 minute + follow-up',
    format: 'Three pictures',
    Icon: Images,
    practiceDescription: 'Practise comparing two pictures, speculating, and sustaining a one-minute answer.',
    examDescription: 'Exam-style long turn with three visual prompts and a short follow-up question.',
  },
  {
    part: 3,
    title: 'Part 3 Collaborative Task',
    duration: '3 minutes',
    format: 'Partner discussion',
    Icon: Users,
    practiceDescription: 'Work with an AI partner to compare options, invite opinions, and reach a decision.',
    examDescription: 'Strict collaborative task with discussion and decision phases.',
  },
  {
    part: 4,
    title: 'Part 4 Discussion',
    duration: '5 minutes',
    format: 'Abstract questions',
    Icon: MessageSquare,
    practiceDescription: 'Develop longer opinions with reasons, examples, and more abstract C1 language.',
    examDescription: 'Exam-style discussion questions connected to the Part 3 topic.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { notify, dismiss } = useToast();
  const { preferences } = usePreferences();
  const [creatingLabel, setCreatingLabel] = useState<string | null>(null);
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [isTrainingMode, setIsTrainingMode] = useState(() => {
    return localStorage.getItem('c1sc.sessionMode') !== 'exam';
  });
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string; mode: string; startedAt: string; status: string; config: SessionConfig }>>([]);

  useEffect(() => {
    checkSystemHealth();
    loadRecentSessions();
  }, []);

  useEffect(() => {
    localStorage.setItem('c1sc.sessionMode', isTrainingMode ? 'practice' : 'exam');
  }, [isTrainingMode]);

  async function checkSystemHealth() {
    try {
      const health = await window.electronAPI.system.checkHealth();
      setSystemHealthy(health.healthy);
      if (!health.healthy) {
        notify({
          type: 'error',
          title: 'System not ready',
          message: 'Check Settings for model and service status.',
        });
      }
    } catch {
      setSystemHealthy(false);
      notify({
        type: 'error',
        title: 'Health check failed',
        message: 'The local AI service did not respond.',
      });
    }
  }

  async function loadRecentSessions() {
    try {
      const sessions = await window.electronAPI.session.list({ profileId: 'default', limit: 5 });
      setRecentSessions(sessions);
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    }
  }

  async function startPartPractice(part: 1 | 2 | 3 | 4) {
    const label = `Part ${part}`;
    setCreatingLabel(label);
    const toastId = notify({
      type: 'loading',
      title: `Preparing ${label}`,
      message: 'Creating your session and loading the examiner.',
    });
    try {
      const config: SessionConfig = {
        mode: isTrainingMode ? 'intensive_correction' : 'part_practice',
        targetLevel: 'C1',
        feedbackMode: isTrainingMode ? 'immediate' : 'end_only',
        parts: [part],
        llmModel: preferences.llmModel,
        whisperModel: preferences.whisperModel,
        ttsVoice: preferences.ttsVoice,
        audioRetentionPolicy: '7_days',
        enablePronunciationAnalysis: true,
      };

      const session = await window.electronAPI.session.create(config);
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      notify({
        type: 'error',
        title: 'Could not start session',
        message: 'Please check system health in Settings.',
      });
    } finally {
      setCreatingLabel(null);
      dismiss(toastId);
    }
  }

  async function startFullMockExam() {
    const label = isTrainingMode ? 'Full practice' : 'Full exam';
    setCreatingLabel(label);
    const toastId = notify({
      type: 'loading',
      title: `Preparing ${label}`,
      message: 'Creating your session and warming up the first prompt.',
    });
    try {
      const config: SessionConfig = {
        mode: isTrainingMode ? 'conversation' : 'full_mock',
        targetLevel: 'C1',
        feedbackMode: isTrainingMode ? 'immediate' : 'end_only',
        llmModel: preferences.llmModel,
        whisperModel: preferences.whisperModel,
        ttsVoice: preferences.ttsVoice,
        audioRetentionPolicy: '7_days',
        enablePronunciationAnalysis: true,
      };

      const session = await window.electronAPI.session.create(config);
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      notify({
        type: 'error',
        title: 'Could not start session',
        message: 'Please check system health in Settings.',
      });
    } finally {
      setCreatingLabel(null);
      dismiss(toastId);
    }
  }

  const isCreating = creatingLabel !== null;

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
      <div className="mb-8 rounded-lg border-2 border-primary/20 bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Session Mode</h3>
            <p className="text-sm text-muted-foreground">
              {isTrainingMode
                ? 'Practice Mode: rehearse the C1 Advanced format with exam-style prompts and learning-focused feedback afterward.'
                : 'Exam Mode: strict C1 Advanced speaking simulation with no corrections until the results page.'}
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
            <p className="mb-1 flex items-center gap-2 font-semibold">
              <GraduationCap className="h-4 w-4" />
              Practice Mode
            </p>
            <p className="text-muted-foreground text-xs">
              Uses the same exam parts with realistic interlocutor prompts and more learning-focused results.
            </p>
          </div>
          <div className={`flex-1 p-3 rounded-md ${!isTrainingMode ? 'bg-primary/10 border border-primary/30' : 'bg-muted'}`}>
            <p className="mb-1 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Exam Mode
            </p>
            <p className="text-muted-foreground text-xs">
              Follows examiner timing, neutral prompts, partner interaction, and end-only assessment.
            </p>
          </div>
        </div>
      </div>

      {/* Individual Part Practice */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Practice One Part</h2>
          <p className="text-sm text-muted-foreground">
            Drill a specific speaking paper task without sitting the whole exam.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRACTICE_PARTS.map((item) => {
            const Icon = item.Icon;
            return (
              <div key={item.part} className="p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isTrainingMode ? item.practiceDescription : item.examDescription}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {item.duration}
                      </span>
                      <span>• {item.format}</span>
                      {isTrainingMode && <span className="text-success font-medium">• Feedback afterward</span>}
                    </div>
                    <button
                      onClick={() => startPartPractice(item.part)}
                      disabled={!systemHealthy || isCreating}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingLabel === `Part ${item.part}` ? 'Starting this part...' : `Start Part ${item.part}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue */}
      {recentSessions.length > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Continue Recent Work</h2>
              <p className="text-sm text-muted-foreground">
                Pick up your latest practice or review its feedback.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSessions.slice(0, 3).map((session) => {
                const partLabel = session.config.parts?.length
                  ? `Part ${session.config.parts.join(', ')}`
                  : 'Full exam';
                return (
                  <button
                    key={session.id}
                    onClick={() => navigate(session.status === 'completed' ? `/results/${session.id}` : `/session/${session.id}`)}
                    className="rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="block font-medium">{partLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString()} - {session.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Mock Exam */}
      <div className="grid grid-cols-1 mb-8">
        <div className="p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{isTrainingMode ? 'Full Practice Session' : 'Full Mock Examination'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isTrainingMode
                  ? 'All four C1 Advanced speaking parts with exam-style transitions, long turn practice, partner discussion, and abstract questions.'
                  : 'Full C1 Advanced speaking mock: Part 1 interview, Part 2 long turn, Part 3 collaborative task, and Part 4 discussion.'}
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
                {creatingLabel === (isTrainingMode ? 'Full practice' : 'Full exam')
                  ? 'Starting full session...'
                  : (isTrainingMode ? 'Start Practice' : 'Start Full Exam')}
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
