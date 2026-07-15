import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Trophy, AlertCircle, ChevronDown, ChevronUp, Copy, RotateCcw } from 'lucide-react';
import type { Session, Assessment, Turn } from '@shared/index';

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewQueue, setReviewQueue] = useState(loadWeaknessTracker);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true,
    dashboard: true,
    comparisons: false,
    reviewQueue: true,
    strengths: true,
    corrections: false,
  });

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  useEffect(() => {
    if (assessment) {
      updateWeaknessTracker(assessment);
    }
  }, [assessment]);

  const c1Dashboard = useMemo(() => buildC1Dashboard(turns, assessment), [turns, assessment]);
  const answerComparisons = useMemo(() => buildAnswerComparisons(turns), [turns]);

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

  async function retakeSameSetup() {
    if (!session) return;
    try {
      const newSession = await window.electronAPI.session.create(session.config);
      navigate(`/session/${newSession.id}`);
    } catch (error) {
      console.error('Failed to retake session:', error);
      alert('Could not start a new session with the same setup.');
    }
  }

  async function copyTranscript() {
    const transcript = turns
      .map((turn) => `${turn.speaker.toUpperCase()} [Part ${turn.partNumber ?? '-'}]: ${turn.transcript}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(transcript);
      alert('Transcript copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy transcript:', error);
      alert('Could not copy transcript.');
    }
  }

  function updateWeaknessTracker(currentAssessment: Assessment) {
    const processedKey = 'c1sc.processedAssessments';
    const processedAssessments = loadProcessedAssessments(processedKey);
    if (processedAssessments.includes(currentAssessment.id)) {
      setReviewQueue(loadWeaknessTracker());
      return;
    }

    const existing = loadWeaknessTracker();
    const updates = [
      ...currentAssessment.corrections.map((correction) => ({
        area: correction.category,
        reason: correction.ruleOrExplanation,
      })),
      ...currentAssessment.priorityImprovements.map((item) => ({
        area: item.area,
        reason: item.reason,
      })),
    ];

    const next = [...existing];
    for (const update of updates) {
      const key = `${update.area}:${update.reason}`.slice(0, 160);
      const found = next.find((item) => item.key === key);
      if (found) {
        found.count += 1;
        found.lastSeen = new Date().toISOString();
      } else {
        next.push({
          key,
          area: update.area,
          reason: update.reason,
          count: 1,
          lastSeen: new Date().toISOString(),
        });
      }
    }

    const sorted = next.sort((a, b) => b.count - a.count).slice(0, 30);
    localStorage.setItem('c1sc.weaknessTracker', JSON.stringify(sorted));
    localStorage.setItem(
      processedKey,
      JSON.stringify([...processedAssessments, currentAssessment.id].slice(-200)),
    );
    setReviewQueue(sorted);
  }

  function loadProcessedAssessments(storageKey: string): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function loadWeaknessTracker(): Array<{ key: string; area: string; reason: string; count: number; lastSeen: string }> {
    try {
      return JSON.parse(localStorage.getItem('c1sc.weaknessTracker') || '[]');
    } catch {
      return [];
    }
  }

  function buildC1Dashboard(currentTurns: Turn[], currentAssessment: Assessment | null) {
    const userTurns = currentTurns.filter((turn) => turn.speaker === 'user');
    const words = userTurns.flatMap((turn) => turn.transcript.toLowerCase().match(/\b[a-z']+\b/g) || []);
    const stopWords = new Set(['the', 'and', 'to', 'a', 'of', 'in', 'it', 'is', 'i', 'you', 'that', 'for', 'with', 'on', 'this', 'they', 'are', 'was', 'but', 'so', 'because']);
    const wordCounts = words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .reduce<Record<string, number>>((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
    const overusedWords = Object.entries(wordCounts)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const discourseMarkers = ['however', 'whereas', 'although', 'nevertheless', 'therefore', 'moreover', 'consequently', 'on the other hand', 'for instance'];
    const markerHits = discourseMarkers.filter((marker) => userTurns.some((turn) => turn.transcript.toLowerCase().includes(marker)));
    const answerLengthByPart = [1, 2, 3, 4].map((part) => {
      const partTurns = userTurns.filter((turn) => turn.partNumber === part);
      const totalWords = partTurns.reduce((sum, turn) => sum + turn.wordCount, 0);
      return { part, turns: partTurns.length, totalWords, averageWords: partTurns.length ? Math.round(totalWords / partTurns.length) : 0 };
    });
    const fillerPattern = words.filter((word) => ['um', 'uh', 'like', 'basically', 'actually'].includes(word)).length;

    return {
      c1RangeUsed: markerHits.length
        ? markerHits.join(', ')
        : 'Few explicit C1 discourse markers detected in the transcript.',
      missedOpportunities:
        markerHits.length < 3
          ? 'Use more contrast, concession and consequence language: although, whereas, nevertheless, consequently.'
          : 'Good variety of linking language. Keep developing examples and nuance.',
      weakDiscoursePatterns:
        userTurns.some((turn) => turn.wordCount < 20)
          ? 'Some answers are short; extend with reason + example + consequence.'
          : 'Answer length is generally adequate; focus on sharper organisation.',
      overusedWords,
      fillerPattern,
      answerLengthByPart,
      nextDrills: currentAssessment?.priorityImprovements?.length
        ? currentAssessment.priorityImprovements.map((item) => item.recommendedExerciseType || item.area).slice(0, 4)
        : ['Part 2 one-minute comparison', 'Part 4 abstract opinion expansion', 'Discourse marker substitution'],
    };
  }

  function buildAnswerComparisons(currentTurns: Turn[]) {
    return currentTurns
      .filter((turn) => turn.speaker === 'user')
      .slice(0, 6)
      .map((turn) => {
        const cleaned = turn.transcript.replace(/\b(um|uh)\b/gi, '').replace(/\s+/g, ' ').trim();
        return {
          id: turn.id,
          part: turn.partNumber,
          original: turn.transcript,
          natural: cleaned
            ? `A natural C1 version would keep your main idea but organise it more clearly: ${cleaned}`
            : 'No transcript available for this turn.',
          stronger: cleaned
            ? `A stronger C1/C2 answer would add contrast, a concrete example, and a short evaluation of why the point matters.`
            : 'Try recording a fuller answer to generate a stronger comparison.',
          why: 'C1 answers usually show control through structure: clear position, developed reason, specific example, and nuanced conclusion.',
        };
      });
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
          onClick={() => toggleSection('dashboard')}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <h2 className="text-xl font-semibold">C1 Speaking Dashboard</h2>
          {expandedSections.dashboard ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSections.dashboard && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-semibold mb-2">C1 Range Used</h3>
              <p className="text-sm text-muted-foreground">{c1Dashboard.c1RangeUsed}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-semibold mb-2">Missed Opportunities</h3>
              <p className="text-sm text-muted-foreground">{c1Dashboard.missedOpportunities}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-semibold mb-2">Weak Discourse Pattern</h3>
              <p className="text-sm text-muted-foreground">{c1Dashboard.weakDiscoursePatterns}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-semibold mb-2">Overused Words</h3>
              <p className="text-sm text-muted-foreground">
                {c1Dashboard.overusedWords.length
                  ? c1Dashboard.overusedWords.map(([word, count]) => `${word} (${count})`).join(', ')
                  : 'No repeated content words detected strongly enough to flag.'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-semibold mb-2">Answer Length By Part</h3>
              <div className="grid grid-cols-4 gap-2 text-sm">
                {c1Dashboard.answerLengthByPart.map((item) => (
                  <div key={item.part} className="rounded bg-muted/50 p-2 text-center">
                    <div className="font-semibold">Part {item.part}</div>
                    <div className="text-xs text-muted-foreground">{item.averageWords} avg words</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-semibold mb-2">Next Drills</h3>
              <div className="flex flex-wrap gap-2">
                {c1Dashboard.nextDrills.map((drill, index) => (
                  <span key={`${drill}-${index}`} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                    {drill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Answer Comparisons */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('comparisons')}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <h2 className="text-xl font-semibold">Answer Model Comparison</h2>
          {expandedSections.comparisons ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSections.comparisons && (
          <div className="mt-4 space-y-3">
            {answerComparisons.map((item) => (
              <div key={item.id} className="p-4 rounded-lg border border-border bg-card">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Part {item.part}</p>
                <div className="space-y-2 text-sm">
                  <p><strong>Your transcript:</strong> {item.original}</p>
                  <p><strong>Natural C1 direction:</strong> {item.natural}</p>
                  <p><strong>Stronger C1/C2 direction:</strong> {item.stronger}</p>
                  <p className="text-muted-foreground"><strong>Why:</strong> {item.why}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Queue */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('reviewQueue')}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <h2 className="text-xl font-semibold">Personal Review Queue</h2>
          {expandedSections.reviewQueue ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSections.reviewQueue && (
          <div className="mt-4 space-y-3">
            {reviewQueue.length ? reviewQueue.slice(0, 8).map((item) => (
              <div key={item.key} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold capitalize">{item.area}</h3>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <span className="rounded bg-warning/10 px-2 py-1 text-xs text-warning">
                    seen {item.count}x
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-4 rounded-lg border border-border bg-card text-sm text-muted-foreground">
                No recurring weaknesses yet. Complete more sessions to build your review queue.
              </div>
            )}
          </div>
        )}
      </div>

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
      <div className="flex flex-wrap gap-4">
        <button
          onClick={retakeSameSetup}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Retake Same Setup
        </button>
        <button
          onClick={copyTranscript}
          className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <Copy className="h-4 w-4" />
          Copy Transcript
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
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
