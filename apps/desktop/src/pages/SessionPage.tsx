import type { InterlocutorResponse, Session, Turn } from '@shared/index';
import { Loader2, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isGettingQuestionRef = useRef(false);

  // Load session on mount
  useEffect(() => {
    if (sessionId && !isLoadingSession && !session) {
      loadSession();
    }

    // Cleanup: stop any playing audio on unmount
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [sessionId]);

  async function loadSession() {
    if (isLoadingSession) {
      console.log('Load session already in progress, skipping...');
      return;
    }

    setIsLoadingSession(true);
    try {
      const loadedSession = await window.electronAPI.session.get({ sessionId: sessionId! });
      if (loadedSession) {
        setSession(loadedSession);
        await window.electronAPI.session.start({ sessionId: sessionId! });
        // Start with examiner's first question
        await getExaminerQuestion(loadedSession);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function getExaminerQuestion(sessionData?: Session) {
    const currentSession = sessionData || session;
    if (!currentSession) {
      console.error('Cannot get examiner question: session not loaded');
      return;
    }

    // Prevent duplicate calls using ref (synchronous check)
    if (isGettingQuestionRef.current) {
      console.log('getExaminerQuestion already in progress, skipping...');
      return;
    }

    isGettingQuestionRef.current = true;
    console.log('=== STARTING getExaminerQuestion ===');
    setExaminerSpeaking(true);
    setIsProcessing(true);

    try {
      console.log('Getting examiner question...');

      // Get all previous turns
      const previousTurns = await window.electronAPI.db.getTurns({ sessionId: currentSession.id });

      // Determine if this is the first interaction (introduction)
      const examinerTurns = previousTurns.filter((t: any) => t.speaker === 'examiner');
      const isFirstInteraction = examinerTurns.length === 0;

      console.log('Is first interaction:', isFirstInteraction);

      // Request examiner response
      console.log('Calling interlocutorRespond...');
      const response: InterlocutorResponse = await window.electronAPI.ai.interlocutorRespond({
        sessionId: currentSession.id,
        mode: currentSession.mode,
        examPart: isFirstInteraction ? 0 : (currentSession.config.parts?.[0] || 1),
        examState: isFirstInteraction ? 'introduction' : 'part1_interview',
        timeRemainingSeconds: 180,
        questionHistory: [],
        conversationHistory: previousTurns.map((t: any) => ({
          speaker: t.speaker,
          transcript: t.transcript,
        })),
        currentTask: undefined,
        allowedActions: isFirstInteraction
          ? ['give_instructions', 'ask_question']
          : ['ask_question', 'brief_acknowledgement'],
        forbiddenActions: ['correct_language', 'give_score'],
      });

      console.log('Examiner response received:', response.spokenText);
      setCurrentQuestion(response.spokenText);

      // Generate TTS audio
      console.log('=== Calling TTS Generate ===');
      console.log('TTS Config:', { text: response.spokenText.substring(0, 50), voice: currentSession.config.ttsVoice, speed: 1.0 });
      const ttsResult = await window.electronAPI.ai.ttsGenerate({
        text: response.spokenText,
        voice: currentSession.config.ttsVoice,
        speed: 1.0,
      });

      console.log('=== TTS Result Received ===');
      console.log('TTS generated path:', ttsResult.audioPath);
      console.log('TTS duration:', ttsResult.durationSeconds);
      console.log('From cache:', ttsResult.fromCache);

      // Save examiner turn
      const examinerTurn: Turn = {
        id: crypto.randomUUID(),
        sessionId: currentSession.id,
        partNumber: 1,
        sequenceNumber: previousTurns.length,
        speaker: 'examiner',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: ttsResult.durationSeconds,
        transcript: response.spokenText,
        wordCount: response.spokenText.split(' ').length,
      };

      await window.electronAPI.db.saveTurn(examinerTurn);
      setTurns((prev) => [...prev, examinerTurn]);

      // Play audio
      console.log('Playing audio...');
      await playAudio(ttsResult.audioPath);
      console.log('Audio playback complete');
    } catch (error: any) {
      console.error('Failed to get examiner question:', error);
      setCurrentQuestion('Could you tell me about your studies?'); // Fallback
      alert(`Failed to get examiner question: ${error?.message || 'Unknown error'}`);
    } finally {
      setExaminerSpeaking(false);
      setIsProcessing(false);
      isGettingQuestionRef.current = false; // Reset ref to allow next call
    }
  }

  async function playAudio(audioPath: string): Promise<void> {
    try {
      console.log('[Audio] Getting audio file from path:', audioPath);

      // Stop any currently playing audio first
      if (audioPlayerRef.current) {
        console.log('[Audio] Stopping previous audio playback');
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      // Get audio file from main process
      const audioData = await window.electronAPI.audio.getFile(audioPath);
      console.log('[Audio] Received audio data, size:', audioData.length, 'bytes');

      if (audioData.length === 0) {
        throw new Error('Audio file is empty');
      }

      // Create blob from audio data
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[Audio] Created blob URL:', audioUrl);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('[Audio] Playback ended');
          URL.revokeObjectURL(audioUrl);
          audioPlayerRef.current = null;
          resolve();
        };
        audio.onerror = (error) => {
          console.error('[Audio] Playback error:', error);
          URL.revokeObjectURL(audioUrl);
          audioPlayerRef.current = null;
          reject(error);
        };
        audio.play()
          .then(() => console.log('[Audio] Playback started'))
          .catch((err) => {
            console.error('[Audio] Play() failed:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error('[Audio] Failed to play audio:', error);
      throw error;
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function processRecording() {
    if (!session) {
      console.error('Cannot process recording: session not loaded');
      alert('Session error. Please refresh the page.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(audioBuffer);

      console.log('Processing recording:', {
        sessionId: session.id,
        audioSize: audioData.length
      });

      // Save audio file
      const { path: audioPath } = await window.electronAPI.audio.saveRecording(
        session.id,
        audioData
      );

      console.log('Audio saved to:', audioPath);

      // Transcribe
      const transcription = await window.electronAPI.audio.transcribe({
        audioPath,
        modelSize: session.config.whisperModel as any,
        language: 'en',
        includeWordTimestamps: true,
      });

      console.log('Transcription complete:', transcription.transcript);

      // Save user turn
      const userTurn: Turn = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        partNumber: 1,
        sequenceNumber: turns.length,
        speaker: 'user',
        startedAt: new Date(Date.now() - transcription.durationSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: transcription.durationSeconds,
        transcript: transcription.transcript,
        asrConfidence: transcription.confidence,
        audioPath,
        wordCount: transcription.transcript.split(' ').length,
      };

      await window.electronAPI.db.saveTurn(userTurn);
      setTurns((prev) => [...prev, userTurn]);

      console.log('User turn saved, getting next question...');

      // Get next examiner response
      await getExaminerQuestion();
    } catch (error: any) {
      console.error('Failed to process recording:', error);
      alert(`Failed to process your response: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function endSession() {
    if (!session) return;

    try {
      await window.electronAPI.session.complete({ sessionId: session.id });
      navigate(`/results/${session.id}`);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Part 1 Interview</h1>
            <p className="text-sm text-muted-foreground">Personal questions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">3:00</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
            <button
              onClick={endSession}
              className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Current Question */}
        {currentQuestion && (
          <div className="mb-6 p-6 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary mb-1">Examiner</p>
                <p className="text-lg">{currentQuestion}</p>
              </div>
            </div>
          </div>
        )}

        {/* Conversation History */}
        <div className="space-y-4">
          {turns.slice(-6).map((turn) => (
            <div
              key={turn.id}
              className={`p-4 rounded-lg ${turn.speaker === 'user'
                ? 'bg-accent/50 ml-12'
                : 'bg-muted/50 mr-12'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  {turn.speaker}
                </div>
                <div className="flex-1">
                  <p>{turn.transcript}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {turn.durationSeconds.toFixed(1)}s
                    {turn.asrConfidence && ` • Confidence: ${(turn.asrConfidence * 100).toFixed(0)}%`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>
              {examinerSpeaking ? 'Examiner is thinking...' : 'Transcribing your response...'}
            </span>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="p-6 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-6">
          {!isRecording && !isProcessing && !examinerSpeaking && (
            <button
              onClick={startRecording}
              className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Mic className="w-6 h-6" />
              <span className="text-lg font-semibold">Start Speaking</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-3 px-8 py-4 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              <Square className="w-6 h-6 fill-current" />
              <span className="text-lg font-semibold">Stop Recording</span>
            </button>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 text-destructive">
              <div className="w-3 h-3 rounded-full bg-destructive recording-pulse"></div>
              <span className="font-semibold">Recording...</span>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {isRecording
            ? 'Speak naturally. Click "Stop Recording" when you finish.'
            : 'Click "Start Speaking" to answer the question.'}
        </div>
      </div>
    </div>
  );
}
