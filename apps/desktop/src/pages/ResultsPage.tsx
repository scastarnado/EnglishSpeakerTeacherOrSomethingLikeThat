import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Trophy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Session, Assessment, Turn } from '@shared/index';

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true,
    strengths: true,
    corrections: false,
  });

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  async function loadResults() {
    try {
      // Load session
      const loadedSession = await window.electronAPI.session.get({ sessionId: sessionId! });
      setSession(loadedSession);

      // Load turns
      const loadedTurns = await window.electronAPI.db.getTurns({ sessionId: sessionId! });
      setTurns(loadedTurns);

      // Check if assessment exists
      let loadedAssessment = await window.electronAPI.db.getAssessment({ sessionId: sessionId! });

      if (!loadedAssessment && loadedSession) {
        // Generate assessment
        await generateAssessment(loadedSession, loadedTurns);
      } else {
        setAssessment(loadedAssessment);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  }

  async function generateAssessment(sessionData: Session, turnsData: Turn[]) {
    setIsGenerating(true);

    try {
      const generated = await window.electronAPI.ai.generateAssessment({
        sessionId: sessionData.id,
        session: sessionData,
        turns: turnsData,
        audioMetrics: undefined,
        options: {
          correctionLevel: 'balanced',
          targetLevel: 'C1',
          includeExerciseGeneration: false,
        },
      });

      setAssessment(generated);
    } catch (error) {
      console.error('Failed to generate assessment:', error);
      alert('Assessment generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function getScoreColor(score: number): string {
    if (score >= 4.5) return 'text-success';
    if (score >= 3.5) return 'text-warning';
    return 'text-error';
  }

  function getScoreDescription(score: number): string {
    if (score >= 4.5) return 'Strong';
    if (score >= 3.5) return 'Satisfactory';
    if (score >= 2.5) return 'Developing';
    return 'Needs Work';
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-lg font-semibold">Generating your assessment...</p>
        <p className="text-sm text-muted-foreground">This may take 1-2 minutes</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Assessment unavailable</p>
          <button
            onClick={() => session && generateAssessment(session, turns)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Assessment Results</h1>
        </div>
        <p className="text-muted-foreground">Practice session from {new Date(session.startedAt).toLocaleDateString()}</p>
      </div>

      {/* Overall Level */}
      <div className="mb-8 p-6 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary mb-2">ESTIMATED LEVEL</p>
          <p className="text-5xl font-bold mb-4">{assessment.estimatedOverallLevel.replace('_', ' ')}</p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {assessment.overallSummary}
          </p>
        </div>
      </div>

      {/* Scores */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('scores')}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <h2 className="text-xl font-semibold">Criterion Scores</h2>
          {expandedSections.scores ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSections.scores && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(assessment.scores).map(([key, criterion]) => (
              <div key={key} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold capitalize">{key.replace('_', ' ')}</h3>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(criterion.score)}`}>
                      {criterion.score.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getScoreDescription(criterion.score)}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{criterion.summary}</p>
                {criterion.limitations && criterion.limitations.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-warning/10 text-xs text-warning">
                    Note: {criterion.limitations.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strengths */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('strengths')}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <h2 className="text-xl font-semibold">Strengths</h2>
          {expandedSections.strengths ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSections.strengths && (
          <div className="mt-4 space-y-3">
            {assessment.strengths.map((strength, index) => (
              <div key={index} className="p-4 rounded-lg border border-success/20 bg-success/5">
                <h3 className="font-semibold text-success mb-1">{strength.category}</h3>
                <p className="text-sm">{strength.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Corrections */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('corrections')}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <h2 className="text-xl font-semibold">Corrections</h2>
          {expandedSections.corrections ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSections.corrections && (
          <div className="mt-4 space-y-3">
            {assessment.corrections.map((correction, index) => (
              <div key={index} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-error/10 text-error">
                    {correction.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{correction.severity}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-error">Original: </span>
                    <span className="line-through">{correction.originalExcerpt}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-success">Corrected: </span>
                    <span>{correction.correctedExcerpt}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/50 text-xs">
                    <strong>Explanation:</strong> {correction.ruleOrExplanation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fluency Metrics */}
      <div className="mb-6 p-6 rounded-lg border border-border bg-card">
        <h2 className="text-xl font-semibold mb-4">Fluency Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold">{assessment.fluency.wordsPerMinute.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Words per minute</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{assessment.fluency.longPauseCount}</div>
            <div className="text-xs text-muted-foreground">Long pauses</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{assessment.fluency.fillerCount}</div>
            <div className="text-xs text-muted-foreground">Fillers</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{assessment.fluency.selfCorrectionCount}</div>
            <div className="text-xs text-muted-foreground">Self-corrections</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{assessment.fluency.interpretation}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Practice Again
        </button>
        <button
          onClick={() => navigate('/history')}
          className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          View History
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
        <p className="font-semibold text-warning mb-1">Practice Assessment Only</p>
        <p className="text-muted-foreground">
          This is an AI-generated practice assessment and does not represent official Cambridge
          scoring. Use it as a learning tool to identify areas for improvement.
        </p>
      </div>
    </div>
  );
}
