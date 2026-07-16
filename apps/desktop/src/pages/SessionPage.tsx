import type { CoCandidateResponse, InterlocutorResponse, Session, Turn } from '@shared/index';
import {
  CheckCircle2,
  Clock,
  Expand,
  Keyboard,
  Loader2,
  Mic,
  MessageSquare,
  RotateCcw,
  Square,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import {
  getDiscussionTaskSetForSession,
  getPart2TaskForSession,
  type DiscussionTaskSet,
  type SpeakingTaskLite,
} from '../data/speakingTasks';
import { usePreferences } from '../lib/preferences';

type ExamStep = {
  id: string;
  part: 1 | 2 | 3 | 4;
  state:
    | 'introduction'
    | 'part1_interview'
    | 'part2_instructions'
    | 'part2_long_turn'
    | 'part2_follow_up'
    | 'part3_instructions'
    | 'part3_collaborative'
    | 'part3_decision'
    | 'part4_discussion';
  title: string;
  subtitle: string;
  timerLabel: string;
  targetSeconds: number;
  examinerPurpose: string;
  userActionLabel: string;
  task?: SpeakingTaskLite;
  needsCoCandidate?: boolean;
  skipExaminerPrompt?: boolean;
};

type PartSummaryState = {
  part: 1 | 2 | 3 | 4;
  nextStepIndex: number | null;
};

const PART1_STEPS: ExamStep[] = [
  {
    id: 'p1-intro',
    part: 1,
    state: 'introduction',
    title: 'Part 1 Interview',
    subtitle: 'Personal questions about you, your life and interests',
    timerLabel: '2 min',
    targetSeconds: 120,
    examinerPurpose: 'Open the test and ask the first personal question.',
    userActionLabel: 'Answer the examiner',
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `p1-q${index + 1}`,
    part: 1 as const,
    state: 'part1_interview' as const,
    title: 'Part 1 Interview',
    subtitle: 'Answer naturally, with enough detail to show C1 range',
    timerLabel: '2 min',
    targetSeconds: 120,
    examinerPurpose: 'Acknowledge briefly and ask the next Part 1 question.',
    userActionLabel: 'Answer the question',
  })),
];

function buildPart2Steps(part2Task: SpeakingTaskLite): ExamStep[] {
  return [
    {
    id: 'p2-instructions',
    part: 2,
    state: 'part2_instructions',
    title: 'Part 2 Long Turn',
    subtitle: 'Compare, speculate and evaluate from a visual prompt',
    timerLabel: '1 min long turn',
    targetSeconds: 60,
    examinerPurpose: 'Give official Part 2 instructions: three pictures, choose two, speak for about one minute.',
    userActionLabel: 'Give your long turn',
    task: part2Task,
    },
    {
    id: 'p2-follow-up',
    part: 2,
    state: 'part2_follow_up',
    title: 'Part 2 Follow-up',
    subtitle: 'Answer one short follow-up question',
    timerLabel: '30 sec',
    targetSeconds: 30,
    examinerPurpose: 'Ask the Part 2 follow-up question only.',
    userActionLabel: 'Answer briefly',
    task: part2Task,
    },
  ];
}

function buildPart3Steps(discussionSet: DiscussionTaskSet): ExamStep[] {
  return [
    {
      id: 'p3-instructions',
      part: 3,
      state: 'part3_instructions',
      title: 'Part 3 Collaborative Task',
      subtitle: 'Discuss options with another candidate and work toward a decision',
      timerLabel: '2 min discussion',
      targetSeconds: 120,
      examinerPurpose: 'Give official Part 3 instructions and present the options for the two-minute discussion phase.',
      userActionLabel: 'Start the discussion',
      task: discussionSet.part3,
      needsCoCandidate: true,
    },
    {
      id: 'p3-discussion-1',
      part: 3,
      state: 'part3_collaborative',
      title: 'Part 3 Collaborative Task',
      subtitle: 'Continue comparing the options with your partner',
      timerLabel: 'discussion round',
      targetSeconds: 45,
      examinerPurpose: 'Let candidates continue the collaborative discussion without examiner intervention.',
      userActionLabel: 'Respond to your partner',
      task: discussionSet.part3,
      needsCoCandidate: true,
      skipExaminerPrompt: true,
    },
    {
      id: 'p3-discussion-2',
      part: 3,
      state: 'part3_collaborative',
      title: 'Part 3 Collaborative Task',
      subtitle: 'Develop the discussion before reaching a decision',
      timerLabel: 'discussion round',
      targetSeconds: 45,
      examinerPurpose: 'Let candidates explore another option or point of agreement before the decision phase.',
      userActionLabel: 'Keep the discussion going',
      task: discussionSet.part3,
      needsCoCandidate: true,
      skipExaminerPrompt: true,
    },
    {
      id: 'p3-decision',
      part: 3,
      state: 'part3_decision',
      title: 'Part 3 Decision',
      subtitle: 'Reach a reasoned decision with your partner',
      timerLabel: '1 min',
      targetSeconds: 60,
      examinerPurpose: 'Ask candidates to decide which two options are most important.',
      userActionLabel: 'Make a decision',
      task: discussionSet.part3,
      needsCoCandidate: true,
    },
  ];
}

function buildPart4Steps(discussionSet: DiscussionTaskSet): ExamStep[] {
  return discussionSet.part4.questions.map((question, index) => ({
    id: `p4-q${index + 1}`,
    part: 4 as const,
    state: 'part4_discussion' as const,
    title: 'Part 4 Discussion',
    subtitle: 'Develop abstract answers and justify your opinions',
    timerLabel: 'examiner-led',
    targetSeconds: 75,
    examinerPurpose: `Ask this Part 4 question: "${question}"`,
    userActionLabel: 'Answer with reasons',
    task: { ...discussionSet.part4, questions: [question] },
  }));
}

function buildFullExamSteps(part2Task: SpeakingTaskLite, discussionSet: DiscussionTaskSet): ExamStep[] {
  return [
    ...PART1_STEPS,
    ...buildPart2Steps(part2Task),
    ...buildPart3Steps(discussionSet),
    ...buildPart4Steps(discussionSet),
  ];
}

function buildExamPlan(sessionData: Session): ExamStep[] {
  const part2Task = getPart2TaskForSession(sessionData.id);
  const discussionSet = getDiscussionTaskSetForSession(sessionData.id);
  const parts = sessionData.config.parts;

  if (!parts || parts.length === 0) {
    return buildFullExamSteps(part2Task, discussionSet);
  }

  const selectedSteps = parts.flatMap((part) => {
    if (part === 1) return PART1_STEPS;
    if (part === 2) return buildPart2Steps(part2Task);
    if (part === 3) return buildPart3Steps(discussionSet);
    if (part === 4) return buildPart4Steps(discussionSet);
    return [];
  });

  return selectedSteps.length ? selectedSteps : buildFullExamSteps(part2Task, discussionSet);
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { preferences } = usePreferences();

  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [lastAudioPath, setLastAudioPath] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ id: string; url: string; altText: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('Loading session...');
  const [partSummary, setPartSummary] = useState<PartSummaryState | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isGettingPromptRef = useRef(false);

  const examPlan = useMemo(() => {
    if (!session) return PART1_STEPS;
    return buildExamPlan(session);
  }, [session]);

  const currentStep = examPlan[Math.min(currentStepIndex, examPlan.length - 1)];
  const currentPart = currentStep.part;
  const isTrainingMode =
    session?.mode === 'conversation' || session?.mode === 'intensive_correction';
  const isExamMode = !!session && !isTrainingMode;
  const progressPercent = Math.round(((currentStepIndex + 1) / examPlan.length) * 100);
  const hardStopSeconds =
    isExamMode && (currentStep.part === 2 || currentStep.state === 'part3_decision') ? currentStep.targetSeconds : null;

  useEffect(() => {
    if (sessionId && !isLoadingSession && !session) {
      loadSession();
    }

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionStartTime) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    if (!recordingStartedAt) return;

    const interval = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt) / 1000));
    }, 250);

    return () => clearInterval(interval);
  }, [recordingStartedAt]);

  useEffect(() => {
    if (!isRecording || hardStopSeconds === null) return;
    if (recordingSeconds >= hardStopSeconds) {
      stopRecording();
    }
  }, [isRecording, recordingSeconds, hardStopSeconds]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (isRecording) {
          stopRecording();
        } else if (!isProcessing && !examinerSpeaking) {
          startRecording();
        }
      }
      if (!isExamMode && event.key.toLowerCase() === 'r' && !isRecording && !isProcessing && lastAudioPath) {
        void replayLastPrompt();
      }
      if (event.key === 'Escape') {
        setSelectedImage(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isProcessing, examinerSpeaking, lastAudioPath, isExamMode]);

  async function loadSession() {
    if (isLoadingSession) return;

    setIsLoadingSession(true);
    try {
      setStatusMessage('Loading session...');
      const loadedSession = await window.electronAPI.session.get({ sessionId: sessionId! });
      if (loadedSession) {
        setSession(loadedSession);
        setSessionStartTime(Date.now());
        setStatusMessage('Starting session...');
        await window.electronAPI.session.start({ sessionId: sessionId! });
        const loadedPlan = buildExamPlan(loadedSession);
        await playExaminerStep(loadedPlan[0], loadedSession, 0);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      notify({
        type: 'error',
        title: 'Session failed to load',
        message: 'Go back to Home and try starting again.',
      });
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function playExaminerStep(
    step: ExamStep,
    sessionData: Session = session!,
    stepIndex = currentStepIndex,
  ) {
    if (!sessionData || isGettingPromptRef.current) return;

    const sessionIsTrainingMode =
      sessionData.mode === 'conversation' || sessionData.mode === 'intensive_correction';
    isGettingPromptRef.current = true;
    setExaminerSpeaking(true);
    setIsProcessing(true);
    setStatusMessage('Examiner is preparing a prompt...');

    try {
      const previousTurns: Turn[] = await window.electronAPI.db.getTurns({ sessionId: sessionData.id });
      const response: InterlocutorResponse = await window.electronAPI.ai.interlocutorRespond({
        sessionId: sessionData.id,
        mode: sessionData.mode,
        examPart: step.part,
        examState: step.state,
        timeRemainingSeconds: step.targetSeconds,
        questionHistory: previousTurns
          .filter((turn) => turn.speaker === 'examiner')
          .map((turn) => turn.transcript),
        conversationHistory: previousTurns.map((turn) => ({
          speaker: turn.speaker,
          transcript: turn.transcript,
        })) as any,
        currentTask: step.task
          ? ({ ...step.task, llm_model: sessionData.config.llmModel, examinerPurpose: step.examinerPurpose } as any)
          : ({ llm_model: sessionData.config.llmModel, examinerPurpose: step.examinerPurpose } as any),
        allowedActions: ['give_instructions', 'ask_question', 'brief_acknowledgement', 'transition'],
        forbiddenActions:
          sessionIsTrainingMode
            ? ['correct_language', 'give_score', 'give_feedback', 'coach_candidate', 'over_explain']
            : ['correct_language', 'give_score', 'give_feedback', 'coach_candidate'],
      });

      setCurrentPrompt(response.spokenText);
      setStatusMessage('Generating examiner audio...');

      const ttsResult = await window.electronAPI.ai.ttsGenerate({
        text: response.spokenText,
        voice: sessionData.config.ttsVoice,
        speed: 1.0,
      });
      setLastAudioPath(ttsResult.audioPath);

      const examinerTurn: Turn = {
        id: crypto.randomUUID(),
        sessionId: sessionData.id,
        partNumber: step.part,
        sequenceNumber: previousTurns.length,
        speaker: 'examiner',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: ttsResult.durationSeconds,
        transcript: response.spokenText,
        wordCount: response.spokenText.split(/\s+/).filter(Boolean).length,
      };

      await window.electronAPI.db.saveTurn(examinerTurn);
      setTurns((prev) => [...prev, examinerTurn]);
      setStatusMessage('Examiner is speaking...');
      await playAudio(ttsResult.audioPath);

      if (stepIndex !== currentStepIndex) {
        setCurrentStepIndex(stepIndex);
      }
    } catch (error: any) {
      console.error('Failed to get examiner prompt:', error);
      const fallback = getFallbackPrompt(step);
      setCurrentPrompt(fallback);
      notify({
        type: 'error',
        title: 'Prompt generation failed',
        message: error?.message || 'Using a fallback prompt so you can continue.',
      });
    } finally {
      setExaminerSpeaking(false);
      setIsProcessing(false);
      setStatusMessage('Ready for your answer.');
      isGettingPromptRef.current = false;
    }
  }

  async function playCoCandidateTurn(step: ExamStep) {
    if (!session || !step.task) return;

    setIsProcessing(true);
    setStatusMessage('Partner is preparing a response...');
    try {
      const previousTurns: Turn[] = await window.electronAPI.db.getTurns({ sessionId: session.id });
      const response: CoCandidateResponse = await window.electronAPI.ai.coCandidateRespond({
        sessionId: session.id,
        examPart: step.part,
        examState: step.state,
        conversationHistory: previousTurns.map((turn) => ({
          speaker: turn.speaker,
          transcript: turn.transcript,
        })) as any,
        currentTask: step.task as any,
        profile: {
          name: 'Alex',
          estimatedLevel: 'C1',
          confidence: 'medium',
          talkativeness: 'balanced',
          disagreementFrequency: 'medium',
          speakingStyle: 'reflective',
        },
        discussionOptions: step.task.discussionOptions,
      });

      const ttsResult = await window.electronAPI.ai.ttsGenerate({
        text: response.spokenText,
        voice: session.config.ttsVoice,
        speed: 1.0,
      });
      setLastAudioPath(ttsResult.audioPath);

      const coCandidateTurn: Turn = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        partNumber: step.part,
        sequenceNumber: previousTurns.length,
        speaker: 'co_candidate',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: ttsResult.durationSeconds,
        transcript: response.spokenText,
        wordCount: response.spokenText.split(/\s+/).filter(Boolean).length,
      };

      await window.electronAPI.db.saveTurn(coCandidateTurn);
      setTurns((prev) => [...prev, coCandidateTurn]);
      setCurrentPrompt(response.spokenText);
      setStatusMessage('Partner is speaking...');
      await playAudio(ttsResult.audioPath);
    } catch (error) {
      console.error('Failed to get co-candidate response:', error);
      notify({
        type: 'error',
        title: 'Partner response failed',
        message: 'The examiner will continue with the next prompt.',
      });
    } finally {
      setIsProcessing(false);
      setStatusMessage('Ready for your answer.');
    }
  }

  async function playAudio(audioPath: string): Promise<void> {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audioData = await window.electronAPI.audio.getFile(audioPath);
    if (audioData.length === 0) throw new Error('Audio file is empty');

    const audioBlob = new Blob([audioData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        resolve();
      };
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        reject(error);
      };
      audio.play().catch((error) => {
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        reject(error);
      });
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        await processRecording();
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordingStartedAt(Date.now());
      setStatusMessage('Recording your answer...');
    } catch (error) {
      console.error('Failed to start recording:', error);
      notify({
        type: 'error',
        title: 'Microphone unavailable',
        message: 'Allow microphone access and try again.',
      });
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStartedAt(null);
      setStatusMessage('Saving recording...');
    }
  }

  async function processRecording() {
    if (!session) {
      notify({
        type: 'error',
        title: 'Session error',
        message: 'Refresh the page and try again.',
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Transcribing your answer...');

    try {
      const stepAtRecording = currentStep;
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(audioBuffer);
      const { path: audioPath } = await window.electronAPI.audio.saveRecording(
        session.id,
        audioData,
      );

      const transcription = await window.electronAPI.audio.transcribe({
        audioPath,
        modelSize: session.config.whisperModel as any,
        language: 'en',
        includeWordTimestamps: true,
      });

      const savedTurns: Turn[] = await window.electronAPI.db.getTurns({ sessionId: session.id });
      setStatusMessage('Saving transcript...');
      const userTurn: Turn = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        partNumber: stepAtRecording.part,
        sequenceNumber: savedTurns.length,
        speaker: 'user',
        startedAt: new Date(Date.now() - transcription.durationSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: transcription.durationSeconds,
        transcript: transcription.transcript,
        asrConfidence: transcription.confidence,
        audioPath,
        wordCount: transcription.transcript.split(/\s+/).filter(Boolean).length,
      };

      await window.electronAPI.db.saveTurn(userTurn);
      setTurns((prev) => [...prev, userTurn]);
      setIsProcessing(false);
      notify({
        type: 'success',
        title: 'Answer saved',
        message: `${userTurn.wordCount} words transcribed.`,
      });

      if (stepAtRecording.needsCoCandidate) {
        await playCoCandidateTurn(stepAtRecording);
      }

      await advanceAfterUserTurn();
    } catch (error: any) {
      console.error('Failed to process recording:', error);
      notify({
        type: 'error',
        title: 'Could not process answer',
        message: error?.message || 'Please try recording again.',
      });
    } finally {
      setIsProcessing(false);
      setStatusMessage('Ready for your answer.');
    }
  }

  async function advanceAfterUserTurn() {
    if (!session) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= examPlan.length) {
      setPartSummary({ part: currentPart, nextStepIndex: null });
      return;
    }

    const nextStep = examPlan[nextIndex];
    if (nextStep.part !== currentPart) {
      setPartSummary({ part: currentPart, nextStepIndex: nextIndex });
      setStatusMessage(`Part ${currentPart} complete. Review the task resources before continuing.`);
      return;
    }

    setCurrentStepIndex(nextIndex);
    if (nextStep.skipExaminerPrompt) {
      setStatusMessage('Continue the discussion with your partner.');
      return;
    }
    await playExaminerStep(nextStep, session, nextIndex);
  }

  async function continueAfterPartSummary() {
    if (!session || !partSummary) return;

    const nextStepIndex = partSummary.nextStepIndex;
    setPartSummary(null);
    if (nextStepIndex === null) {
      await finishSession();
      return;
    }

    const nextStep = examPlan[nextStepIndex];
    setCurrentStepIndex(nextStepIndex);
    if (nextStep.skipExaminerPrompt) {
      setStatusMessage('Continue the discussion with your partner.');
      return;
    }
    await playExaminerStep(nextStep, session, nextStepIndex);
  }

  async function finishSession() {
    if (!session || isComplete) return;

    setIsComplete(true);
    setStatusMessage('Completing session...');
    await window.electronAPI.session.complete({ sessionId: session.id });
    navigate(`/results/${session.id}`);
  }

  async function endSession() {
    if (!session) return;
    if (!window.confirm('End this session and go to results?')) return;
    await window.electronAPI.session.complete({ sessionId: session.id });
    navigate(`/results/${session.id}`);
  }

  function getPartSteps(part: 1 | 2 | 3 | 4) {
    return examPlan.filter((step) => step.part === part);
  }

  function getPrimaryTaskForPart(part: 1 | 2 | 3 | 4) {
    return getPartSteps(part).find((step) => step.task)?.task;
  }

  function getPartExaminerPrompts(part: 1 | 2 | 3 | 4) {
    return turns.filter((turn) => turn.partNumber === part && turn.speaker === 'examiner');
  }

  function renderPartSummary(part: 1 | 2 | 3 | 4) {
    const stepsForPart = getPartSteps(part);
    const task = getPrimaryTaskForPart(part);
    const examinerPrompts = getPartExaminerPrompts(part);
    const part4Questions = stepsForPart
      .flatMap((step) => step.task?.questions ?? [])
      .filter((question, index, questions) => questions.indexOf(question) === index);

    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Completed part</p>
          <h2 className="mt-1 text-xl font-bold">Part {part} Resource Review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These are the questions, topics and visual resources used in this part.
          </p>
        </div>

        {task && (
          <section className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {part === 3 ? 'Main topic' : 'Task'}
            </p>
            <h3 className="mt-1 font-semibold">{task.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{task.instructions}</p>
            {task.topicTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {task.topicTags.map((tag) => (
                  <span key={tag} className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {part === 2 && task?.imageAssets && (
          <section>
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Images shown</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {task.imageAssets.map((image) => (
                <figure key={image.id} className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="relative aspect-[4/3]">
                    <img src={image.url} alt={image.altText} className="h-full w-full object-cover" />
                    <figcaption className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs font-bold">
                      {image.id}
                    </figcaption>
                  </div>
                  <p className="p-3 text-xs text-muted-foreground">{image.altText}</p>
                </figure>
              ))}
            </div>
          </section>
        )}

        {part === 3 && task?.discussionOptions && (
          <section>
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Discussion options</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {task.discussionOptions.map((option) => (
                <div key={option.id} className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-semibold">{option.text}</p>
                  {option.description && <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {((task?.questions.length ?? 0) > 0 || part4Questions.length > 0) && (
          <section>
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              {part === 4 ? 'Discussion questions' : 'Question focus'}
            </p>
            <div className="space-y-2">
              {(part === 4 ? part4Questions : task?.questions ?? []).map((question) => (
                <div key={question} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {question}
                </div>
              ))}
            </div>
          </section>
        )}

        {examinerPrompts.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Examiner prompts used</p>
            <div className="max-h-48 space-y-2 overflow-auto pr-2">
              {examinerPrompts.map((turn, index) => (
                <div key={turn.id} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                  <span className="font-semibold">Prompt {index + 1}: </span>
                  {turn.transcript}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  async function replayLastPrompt() {
    if (!lastAudioPath || isRecording || isProcessing) return;
    try {
      setExaminerSpeaking(true);
      setStatusMessage('Replaying latest prompt...');
      await playAudio(lastAudioPath);
    } catch (error) {
      console.error('Failed to replay prompt:', error);
      notify({
        type: 'error',
        title: 'Replay failed',
        message: 'The saved audio could not be played.',
      });
    } finally {
      setExaminerSpeaking(false);
      setStatusMessage('Ready for your answer.');
    }
  }

  function getFallbackPrompt(step: ExamStep): string {
    if (step.part === 2 && step.task) {
      return `Now, in this part of the test, I am going to give you three photographs. Please talk about two of them. ${step.task.instructions}`;
    }
    if (step.part === 3 && step.task) {
      return `${step.task.instructions} Here are the options: ${step.task.discussionOptions?.map((option) => option.text).join(', ')}.`;
    }
    if (step.part === 4 && step.task) {
      return step.task.questions[0];
    }
    return 'Could you tell me a little about yourself?';
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded bg-primary/10 px-2 py-1 font-semibold text-primary">
                {isTrainingMode ? 'Practice mode' : 'Exam mode'}
              </span>
              <span>{currentStep.timerLabel}</span>
            </div>
            <h1 className="text-2xl font-bold">{currentStep.title}</h1>
            <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-2xl font-bold">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground">Elapsed</div>
            </div>
            {!isExamMode && (
              <button
                onClick={replayLastPrompt}
                disabled={!lastAudioPath || isRecording || isProcessing}
                className="rounded-md border border-border px-4 py-2 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Replay
                </span>
              </button>
            )}
            <button
              onClick={endSession}
              className="rounded-md border border-border px-4 py-2 transition-colors hover:bg-accent"
            >
              End Session
            </button>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {isProcessing || examinerSpeaking ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : isRecording ? (
            <Mic className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
          <span>{statusMessage}</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-border bg-muted/30 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-5 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((part) => {
              const partActive = currentStep.part === part;
              const partIncluded = examPlan.some((step) => step.part === part);
              return (
                <div
                  key={part}
                  className={`rounded-md border px-3 py-2 text-center text-sm ${
                    partActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : partIncluded
                        ? 'border-border bg-card'
                        : 'border-border bg-muted text-muted-foreground opacity-60'
                  }`}
                >
                  Part {part}
                </div>
              );
            })}
          </div>

          {currentStep.task && (
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Task</p>
                <h2 className="mt-1 font-semibold">{currentStep.task.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{currentStep.task.instructions}</p>
              {currentStep.task.discussionOptions && (
                <div className="space-y-2">
                  {currentStep.task.discussionOptions.map((option) => (
                    <div key={option.id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                      {option.text}
                    </div>
                  ))}
                </div>
              )}
              {currentStep.part === 2 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {currentStep.task.imageAssets?.map((image) => (
                      <button
                        key={image.id}
                        onClick={() => !isExamMode && setSelectedImage(image)}
                        className={`overflow-hidden rounded-md border border-border bg-background text-left transition-colors ${
                          isExamMode ? 'cursor-default' : 'hover:border-primary'
                        }`}
                      >
                        <div className="relative aspect-[4/3]">
                          <img
                            src={image.url}
                            alt={image.altText}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                          <figcaption className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs font-bold">
                            {image.id}
                          </figcaption>
                          {!isExamMode && (
                            <span className="absolute bottom-2 right-2 rounded bg-background/90 p-1">
                              <Expand className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Talk about two pictures only. Do not describe all three.
                  </p>
                </div>
              )}
            </div>
          )}

          {preferences.showPracticeTips && (
          <div className="mt-5 rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              Exam rhythm
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Answer once per prompt, then let the examiner move the test forward.</p>
              <p className="flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Space starts/stops recording{isExamMode ? '.' : '. R replays the latest prompt.'}
              </p>
              {isTrainingMode ? (
                <p>Practice mode keeps the interlocutor realistic and gives learning-focused feedback afterward.</p>
              ) : (
                <p>Exam mode withholds corrections and scoring until the results page.</p>
              )}
            </div>
          </div>
          )}
        </aside>

        <main className="min-h-0 overflow-auto p-6">
          {currentPrompt && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 p-5">
              <div className="flex items-start gap-4">
                <MessageSquare className="mt-1 h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-semibold text-primary">
                    {turns.at(-1)?.speaker === 'co_candidate' ? 'Co-candidate' : 'Examiner'}
                  </p>
                  <p className="text-lg leading-relaxed">{currentPrompt}</p>
                </div>
              </div>
            </div>
          )}

          {isExamMode ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="font-semibold">Exam in progress</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Transcripts are hidden in Exam Mode. You will review everything on the results page.
              </p>
            </div>
          ) : (
          <div className="space-y-4">
            {turns.slice(-10).map((turn) => (
              <div
                key={turn.id}
                className={`rounded-lg p-4 ${
                  turn.speaker === 'user'
                    ? 'ml-10 bg-accent/60'
                    : turn.speaker === 'co_candidate'
                      ? 'mr-10 border border-border bg-card'
                      : 'mr-10 bg-muted/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {turn.speaker === 'co_candidate' ? 'partner' : turn.speaker}
                  </div>
                  <div className="flex-1">
                    <p>{turn.transcript}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Part {turn.partNumber} - {turn.durationSeconds.toFixed(1)}s
                      {turn.asrConfidence && ` - Confidence: ${(turn.asrConfidence * 100).toFixed(0)}%`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}
        </main>
      </div>

      <div className="border-t border-border bg-card p-5">
        {isRecording && (
          <div className="mx-auto mb-4 max-w-xl">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Speaking time</span>
              <span className={hardStopSeconds !== null && recordingSeconds >= hardStopSeconds ? 'text-warning' : 'text-muted-foreground'}>
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                {' / '}
                {Math.floor(currentStep.targetSeconds / 60)}:{(currentStep.targetSeconds % 60).toString().padStart(2, '0')}
                {hardStopSeconds !== null && ' hard stop'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div
                className={`h-full transition-all ${hardStopSeconds !== null && recordingSeconds >= hardStopSeconds ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${Math.min((recordingSeconds / currentStep.targetSeconds) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-5">
          {!partSummary && !isRecording && !isProcessing && !examinerSpeaking && (
            <button
              onClick={startRecording}
              className="flex items-center gap-3 rounded-lg bg-primary px-7 py-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mic className="h-6 w-6" />
              {currentStep.userActionLabel}
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-3 rounded-lg bg-destructive px-7 py-4 font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              <Square className="h-6 w-6 fill-current" />
              Stop Recording
            </button>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 text-destructive">
              <div className="recording-pulse h-3 w-3 rounded-full bg-destructive" />
              <span className="font-semibold">Recording</span>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Session complete</span>
            </div>
          )}

          {currentStep.needsCoCandidate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Partner response follows your turn
            </div>
          )}
        </div>
      </div>
      {partSummary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold">Part {partSummary.part} complete</p>
                <p className="text-xs text-muted-foreground">Review the resources before moving on.</p>
              </div>
              <button
                onClick={continueAfterPartSummary}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {partSummary.nextStepIndex === null
                  ? 'View results'
                  : `Continue to Part ${examPlan[partSummary.nextStepIndex]?.part ?? ''}`}
              </button>
            </div>
            <div className="overflow-auto p-5">{renderPartSummary(partSummary.part)}</div>
          </div>
        </div>
      )}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
          <div className="max-h-full max-w-5xl overflow-hidden rounded-lg bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Picture {selectedImage.id}</p>
                <p className="text-xs text-muted-foreground">{selectedImage.altText}</p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="rounded-md p-2 transition-colors hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={selectedImage.url}
              alt={selectedImage.altText}
              decoding="async"
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
