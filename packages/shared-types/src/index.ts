import { z } from 'zod';

// ============================================================================
// Examination State Types
// ============================================================================

export const ExamStateSchema = z.enum([
	'preparation',
	'microphone_check',
	'introduction',
	'part1_interview',
	'part1_complete',
	'part2_instructions',
	'part2_preparation',
	'part2_long_turn',
	'part2_follow_up',
	'part2_complete',
	'part3_instructions',
	'part3_collaborative',
	'part3_decision',
	'part3_complete',
	'part4_discussion',
	'exam_complete',
	'processing_assessment',
	'assessment_complete',
	'cancelled',
	'error',
]);

export type ExamState = z.infer<typeof ExamStateSchema>;

export const SessionModeSchema = z.enum([
	'full_mock',
	'part_practice',
	'conversation',
	'intensive_correction',
	'custom',
]);

export type SessionMode = z.infer<typeof SessionModeSchema>;

export const SessionStatusSchema = z.enum([
	'created',
	'active',
	'processing',
	'completed',
	'cancelled',
	'failed',
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SpeakerSchema = z.enum(['examiner', 'user', 'co_candidate']);

export type Speaker = z.infer<typeof SpeakerSchema>;

// ============================================================================
// Session Types
// ============================================================================

export const SessionConfigSchema = z.object({
	mode: SessionModeSchema,
	targetLevel: z.enum(['B2', 'C1', 'C2']).default('C1'),
	feedbackMode: z
		.enum(['none', 'end_only', 'immediate', 'on_request'])
		.default('end_only'),
	parts: z.array(z.number().min(1).max(4)).optional(),
	llmModel: z.string(),
	whisperModel: z.string(),
	ttsVoice: z.string(),
	audioRetentionPolicy: z
		.enum(['never', '7_days', '30_days', 'indefinite'])
		.default('7_days'),
	enablePronunciationAnalysis: z.boolean().default(true),
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>;

export const SessionSchema = z.object({
	id: z.string().uuid(),
	profileId: z.string().uuid(),
	mode: SessionModeSchema,
	config: SessionConfigSchema,
	startedAt: z.string().datetime(),
	endedAt: z.string().datetime().optional(),
	status: SessionStatusSchema,
	totalDurationSeconds: z.number().optional(),
	estimatedLevel: z.string().optional(),
	currentState: ExamStateSchema.optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// ============================================================================
// Turn Types
// ============================================================================

export const TurnSchema = z.object({
	id: z.string().uuid(),
	sessionId: z.string().uuid(),
	partNumber: z.number().min(1).max(4).optional(),
	sequenceNumber: z.number().min(0),
	speaker: SpeakerSchema,
	startedAt: z.string().datetime(),
	endedAt: z.string().datetime(),
	durationSeconds: z.number(),
	transcript: z.string(),
	editedTranscript: z.string().optional(),
	asrConfidence: z.number().min(0).max(1).optional(),
	audioPath: z.string().optional(),
	wordCount: z.number(),
});

export type Turn = z.infer<typeof TurnSchema>;

export const TranscriptWordSchema = z.object({
	id: z.string().uuid(),
	turnId: z.string().uuid(),
	sequence: z.number(),
	word: z.string(),
	startTime: z.number(),
	endTime: z.number(),
	confidence: z.number().min(0).max(1).optional(),
});

export type TranscriptWord = z.infer<typeof TranscriptWordSchema>;

// ============================================================================
// AI Role Types
// ============================================================================

export const InterlocutorActionSchema = z.enum([
	'ask_question',
	'brief_acknowledgement',
	'transition',
	'conclude',
	'give_instructions',
]);

export type InterlocutorAction = z.infer<typeof InterlocutorActionSchema>;

export const InterlocutorResponseSchema = z.object({
	action: InterlocutorActionSchema,
	spokenText: z.string(),
	topic: z.string().optional(),
	questionType: z.string().optional(),
	nextExpectedSpeaker: SpeakerSchema,
	shouldStartTimer: z.boolean(),
	metadata: z.record(z.any()).optional(),
});

export type InterlocutorResponse = z.infer<typeof InterlocutorResponseSchema>;

export const InteractionFunctionSchema = z.enum([
	'agree',
	'disagree',
	'partial_agreement',
	'build_on',
	'invite_opinion',
	'clarify',
	'suggest',
	'propose_decision',
]);

export type InteractionFunction = z.infer<typeof InteractionFunctionSchema>;

export const CoCandidateResponseSchema = z.object({
	spokenText: z.string(),
	interactionFunction: InteractionFunctionSchema,
	mentionedOptions: z.array(z.string()).optional(),
	shouldYieldTurn: z.boolean(),
});

export type CoCandidateResponse = z.infer<typeof CoCandidateResponseSchema>;

export const CoCandidateProfileSchema = z.object({
	name: z.string(),
	estimatedLevel: z.enum(['B2', 'C1', 'C2']),
	confidence: z.enum(['low', 'medium', 'high']),
	talkativeness: z.enum(['reserved', 'balanced', 'talkative']),
	disagreementFrequency: z.enum(['low', 'medium', 'high']),
	speakingStyle: z.enum(['direct', 'reflective', 'enthusiastic']),
});

export type CoCandidateProfile = z.infer<typeof CoCandidateProfileSchema>;

// ============================================================================
// Assessment Types
// ============================================================================

export const CriterionScoreSchema = z.object({
	score: z.number().min(0).max(5),
	confidence: z.number().min(0).max(1),
	summary: z.string(),
	evidenceTurnIds: z.array(z.string()),
	limitations: z.array(z.string()).optional(),
});

export type CriterionScore = z.infer<typeof CriterionScoreSchema>;

export const AssessmentScoresSchema = z.object({
	grammaticalResource: CriterionScoreSchema,
	lexicalResource: CriterionScoreSchema,
	discourseManagement: CriterionScoreSchema,
	pronunciation: CriterionScoreSchema,
	interactiveCommunication: CriterionScoreSchema,
	globalAchievement: CriterionScoreSchema,
});

export type AssessmentScores = z.infer<typeof AssessmentScoresSchema>;

export const StrengthSchema = z.object({
	category: z.string(),
	description: z.string(),
	evidenceTurnIds: z.array(z.string()),
});

export type Strength = z.infer<typeof StrengthSchema>;

export const CorrectionCategorySchema = z.enum([
	'grammar',
	'vocabulary',
	'collocation',
	'register',
	'discourse',
	'pronunciation',
	'interaction',
]);

export type CorrectionCategory = z.infer<typeof CorrectionCategorySchema>;

export const CorrectionSeveritySchema = z.enum(['minor', 'moderate', 'major']);

export type CorrectionSeverity = z.infer<typeof CorrectionSeveritySchema>;

export const CorrectionSchema = z.object({
	turnId: z.string(),
	originalExcerpt: z.string(),
	correctedExcerpt: z.string(),
	naturalC1Alternative: z.string(),
	category: CorrectionCategorySchema,
	ruleOrExplanation: z.string(),
	severity: CorrectionSeveritySchema,
	confidence: z.number().min(0).max(1),
});

export type Correction = z.infer<typeof CorrectionSchema>;

export const FluencyMetricsSchema = z.object({
	wordsPerMinute: z.number(),
	silenceRatio: z.number().min(0).max(1),
	longPauseCount: z.number(),
	fillerCount: z.number(),
	repetitionCount: z.number(),
	selfCorrectionCount: z.number(),
	interpretation: z.string(),
});

export type FluencyMetrics = z.infer<typeof FluencyMetricsSchema>;

export const InteractionAnalysisSchema = z.object({
	initiatedIdeas: z.number(),
	respondedToPartnerIdeas: z.number(),
	invitedPartner: z.number(),
	agreements: z.number(),
	disagreements: z.number(),
	clarificationRequests: z.number(),
	decisionContributions: z.number(),
	summary: z.string(),
});

export type InteractionAnalysis = z.infer<typeof InteractionAnalysisSchema>;

export const PriorityImprovementSchema = z.object({
	priority: z.number(),
	area: z.string(),
	reason: z.string(),
	recommendedExerciseType: z.string(),
});

export type PriorityImprovement = z.infer<typeof PriorityImprovementSchema>;

export const AssessmentSchema = z.object({
	id: z.string().uuid(),
	sessionId: z.string().uuid(),
	createdAt: z.string().datetime(),
	assessmentVersion: z.string(),
	estimatedOverallLevel: z.enum([
		'B2_low',
		'B2_mid',
		'B2_high',
		'C1_borderline',
		'C1_secure',
		'C2_approaching',
	]),
	overallSummary: z.string(),
	scores: AssessmentScoresSchema,
	strengths: z.array(StrengthSchema),
	corrections: z.array(CorrectionSchema),
	fluency: FluencyMetricsSchema,
	interactionAnalysis: InteractionAnalysisSchema.optional(),
	priorityImprovements: z.array(PriorityImprovementSchema),
	generatedPracticeTasks: z.array(z.any()).optional(),
	assessmentLimitations: z.array(z.string()),
});

export type Assessment = z.infer<typeof AssessmentSchema>;

// ============================================================================
// Audio Analysis Types
// ============================================================================

export const VoiceSegmentSchema = z.object({
	startTime: z.number(),
	endTime: z.number(),
	confidence: z.number().min(0).max(1),
});

export type VoiceSegment = z.infer<typeof VoiceSegmentSchema>;

export const PauseMetricsSchema = z.object({
	totalPauses: z.number(),
	longPauses: z.number(),
	averagePauseDuration: z.number(),
	longestPauseDuration: z.number(),
	pauseLocations: z.array(z.number()),
});

export type PauseMetrics = z.infer<typeof PauseMetricsSchema>;

export const PitchAnalysisSchema = z.object({
	meanPitch: z.number(),
	minPitch: z.number(),
	maxPitch: z.number(),
	pitchRange: z.number(),
	pitchVariation: z.number(),
});

export type PitchAnalysis = z.infer<typeof PitchAnalysisSchema>;

export const AudioMetricsSchema = z.object({
	totalDurationSeconds: z.number(),
	speechDurationSeconds: z.number(),
	silenceDurationSeconds: z.number(),
	speechToSilenceRatio: z.number(),
	voiceSegments: z.array(VoiceSegmentSchema),
	pauseMetrics: PauseMetricsSchema,
	pitchAnalysis: PitchAnalysisSchema.optional(),
	intensityMean: z.number().optional(),
	intensityRange: z.number().optional(),
});

export type AudioMetrics = z.infer<typeof AudioMetricsSchema>;

// ============================================================================
// Task Bank Types
// ============================================================================

export const TaskImageSchema = z.object({
	id: z.string(),
	url: z.string(),
	altText: z.string(),
	licence: z.string().optional(),
});

export type TaskImage = z.infer<typeof TaskImageSchema>;

export const DiscussionOptionSchema = z.object({
	id: z.string(),
	text: z.string(),
	description: z.string().optional(),
});

export type DiscussionOption = z.infer<typeof DiscussionOptionSchema>;

export const TaskDifficultySchema = z.enum(['B2', 'C1', 'C1_plus']);

export type TaskDifficulty = z.infer<typeof TaskDifficultySchema>;

export const SpeakingTaskSchema = z.object({
	id: z.string().uuid(),
	version: z.number(),
	part: z.number().min(1).max(4),
	title: z.string(),
	topicTags: z.array(z.string()),
	difficulty: TaskDifficultySchema,
	instructions: z.string(),
	questions: z.array(z.string()),
	followUpQuestions: z.array(z.string()).optional(),
	imageAssets: z.array(TaskImageSchema).optional(),
	discussionOptions: z.array(DiscussionOptionSchema).optional(),
	targetFunctions: z.array(z.string()),
	createdBy: z.enum(['curated', 'generated', 'user']),
	createdAt: z.string().datetime(),
	licence: z.string().optional(),
	isActive: z.boolean().default(true),
});

export type SpeakingTask = z.infer<typeof SpeakingTaskSchema>;

// ============================================================================
// AI Service API Types
// ============================================================================

export const TranscribeRequestSchema = z.object({
	audioPath: z.string(),
	modelSize: z.enum(['tiny', 'base', 'small', 'medium', 'large', 'large-v3']),
	language: z.string().default('en'),
	includeWordTimestamps: z.boolean().default(true),
});

export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;

export const TranscribeResponseSchema = z.object({
	transcript: z.string(),
	confidence: z.number().min(0).max(1),
	durationSeconds: z.number(),
	words: z.array(TranscriptWordSchema).optional(),
	detectedLanguage: z.string().optional(),
});

export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

export const TTSRequestSchema = z.object({
	text: z.string(),
	voice: z.string(),
	speed: z.number().min(0.5).max(2.0).default(1.0),
	cacheKey: z.string().optional(),
});

export type TTSRequest = z.infer<typeof TTSRequestSchema>;

export const TTSResponseSchema = z.object({
	audioPath: z.string(),
	durationSeconds: z.number(),
	fromCache: z.boolean(),
});

export type TTSResponse = z.infer<typeof TTSResponseSchema>;

export const GeneratedImageAssetSchema = z.object({
	id: z.string(),
	url: z.string(),
	altText: z.string(),
	licence: z.string().optional(),
	prompt: z.string().optional(),
});

export type GeneratedImageAsset = z.infer<typeof GeneratedImageAssetSchema>;

export const Part2ImageGenerationRequestSchema = z.object({
	sessionId: z.string().uuid(),
	taskId: z.string(),
	taskTitle: z.string(),
	instructions: z.string(),
	questions: z.array(z.string()),
	topicTags: z.array(z.string()),
	imageDescriptions: z.array(z.string()).optional(),
	imageModel: z.string().optional(),
	count: z.number().min(1).max(3).default(3),
});

export type Part2ImageGenerationRequest = z.infer<
	typeof Part2ImageGenerationRequestSchema
>;

export const Part2ImageGenerationResponseSchema = z.object({
	images: z.array(GeneratedImageAssetSchema),
	fromCache: z.boolean(),
	provider: z.string(),
	fallbackReason: z.string().optional(),
});

export type Part2ImageGenerationResponse = z.infer<
	typeof Part2ImageGenerationResponseSchema
>;

export const Part2ImageGenerationProgressSchema = z.object({
	available: z.boolean(),
	progress: z.number().min(0).max(1),
	etaSeconds: z.number().nullable(),
	currentImageIndex: z.number().nullable().optional(),
	totalImages: z.number().nullable().optional(),
	stage: z.string(),
});

export type Part2ImageGenerationProgress = z.infer<
	typeof Part2ImageGenerationProgressSchema
>;

export const InterlocutorContextSchema = z.object({
	sessionId: z.string().uuid(),
	mode: SessionModeSchema,
	examPart: z.number().min(1).max(4),
	examState: ExamStateSchema,
	timeRemainingSeconds: z.number().optional(),
	questionHistory: z.array(z.string()),
	conversationHistory: z.array(TurnSchema),
	currentTask: SpeakingTaskSchema.optional(),
	allowedActions: z.array(InterlocutorActionSchema),
	forbiddenActions: z.array(z.string()),
});

export type InterlocutorContext = z.infer<typeof InterlocutorContextSchema>;

export const CoCandidateContextSchema = z.object({
	sessionId: z.string().uuid(),
	examPart: z.number().min(1).max(4),
	examState: ExamStateSchema,
	conversationHistory: z.array(TurnSchema),
	currentTask: SpeakingTaskSchema.optional(),
	profile: CoCandidateProfileSchema,
	discussionOptions: z.array(DiscussionOptionSchema).optional(),
});

export type CoCandidateContext = z.infer<typeof CoCandidateContextSchema>;

export const AssessmentRequestSchema = z.object({
	sessionId: z.string().uuid(),
	session: SessionSchema,
	turns: z.array(TurnSchema),
	audioMetrics: AudioMetricsSchema.optional(),
	previousMistakes: z.array(z.any()).optional(),
	options: z.object({
		correctionLevel: z
			.enum(['essential', 'balanced', 'exhaustive'])
			.default('balanced'),
		targetLevel: z.enum(['B2', 'C1', 'C2']).default('C1'),
		includeExerciseGeneration: z.boolean().default(true),
	}),
});

export type AssessmentRequest = z.infer<typeof AssessmentRequestSchema>;

// ============================================================================
// Model Management Types
// ============================================================================

export const ModelTypeSchema = z.enum(['llm', 'whisper', 'tts']);

export type ModelType = z.infer<typeof ModelTypeSchema>;

export const ModelInfoSchema = z.object({
	name: z.string(),
	type: ModelTypeSchema,
	size: z.string().optional(),
	parameters: z.string().optional(),
	installed: z.boolean(),
	recommended: z.boolean().optional(),
	requiresGPU: z.boolean(),
	minimumRAM: z.number().optional(),
	description: z.string().optional(),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export const SystemCapabilitiesSchema = z.object({
	os: z.string(),
	cpu: z.string(),
	totalRAM: z.number(),
	availableRAM: z.number(),
	gpu: z.string().optional(),
	gpuMemory: z.number().optional(),
	ollamaInstalled: z.boolean(),
	ollamaVersion: z.string().optional(),
	ollamaModels: z.array(z.string()),
	recommendedProfile: z.enum(['low_resource', 'balanced', 'high_quality']),
});

export type SystemCapabilities = z.infer<typeof SystemCapabilitiesSchema>;

// ============================================================================
// User Preferences Types
// ============================================================================

export const PrivacySettingsSchema = z.object({
	audioRetention: z.enum(['never', '7_days', '30_days', 'indefinite']),
	deleteAudioAfterAssessment: z.boolean().default(false),
	enableAnalytics: z.boolean().default(false),
	enableCrashReporting: z.boolean().default(false),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

export const AccessibilitySettingsSchema = z.object({
	enableExtendedTimers: z.boolean().default(false),
	timerExtensionPercent: z.number().min(0).max(100).default(50),
	enablePauseDuringExam: z.boolean().default(false),
	fontSize: z
		.enum(['small', 'medium', 'large', 'extra-large'])
		.default('medium'),
	highContrast: z.boolean().default(false),
	reducedMotion: z.boolean().default(false),
	enableCaptions: z.boolean().default(false),
});

export type AccessibilitySettings = z.infer<typeof AccessibilitySettingsSchema>;

export const UserSettingsSchema = z.object({
	theme: z.enum(['light', 'dark', 'system']).default('system'),
	language: z.string().default('en'),
	selectedMicrophone: z.string().optional(),
	defaultLLMModel: z.string().optional(),
	defaultWhisperModel: z.string().optional(),
	defaultTTSVoice: z.string().optional(),
	privacy: PrivacySettingsSchema,
	accessibility: AccessibilitySettingsSchema,
	notifications: z.object({
		enableSoundEffects: z.boolean().default(true),
		enableSessionReminders: z.boolean().default(true),
	}),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const ErrorCodeSchema = z.enum([
	'MICROPHONE_PERMISSION_DENIED',
	'MICROPHONE_NOT_FOUND',
	'OLLAMA_CONNECTION_FAILED',
	'OLLAMA_MODEL_NOT_FOUND',
	'OLLAMA_GENERATION_FAILED',
	'OLLAMA_TIMEOUT',
	'WHISPER_TRANSCRIPTION_FAILED',
	'TTS_GENERATION_FAILED',
	'AI_SERVICE_UNAVAILABLE',
	'AI_SERVICE_CRASHED',
	'DATABASE_ERROR',
	'INVALID_OUTPUT_SCHEMA',
	'AUDIO_RECORDING_FAILED',
	'AUDIO_PLAYBACK_FAILED',
	'SESSION_STATE_ERROR',
	'ASSESSMENT_GENERATION_FAILED',
	'INSUFFICIENT_DISK_SPACE',
	'UNKNOWN_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const AppErrorSchema = z.object({
	code: ErrorCodeSchema,
	message: z.string(),
	details: z.string().optional(),
	recoverable: z.boolean(),
	userAction: z.string().optional(),
	technicalDetails: z.record(z.any()).optional(),
});

export type AppError = z.infer<typeof AppErrorSchema>;

// ============================================================================
// IPC Channel Types
// ============================================================================

export type IPCChannels = {
	// Session management
	'session:create': { request: SessionConfig; response: Session };
	'session:start': { request: { sessionId: string }; response: void };
	'session:pause': { request: { sessionId: string }; response: void };
	'session:resume': { request: { sessionId: string }; response: void };
	'session:complete': { request: { sessionId: string }; response: void };
	'session:cancel': { request: { sessionId: string }; response: void };
	'session:get': { request: { sessionId: string }; response: Session };
	'session:list': {
		request: { profileId: string; limit?: number };
		response: Session[];
	};

	// Audio
	'audio:save-recording': {
		request: { sessionId: string; audioBlob: Blob };
		response: { path: string };
	};
	'audio:transcribe': {
		request: TranscribeRequest;
		response: TranscribeResponse;
	};
	'audio:analyze': { request: { audioPath: string }; response: AudioMetrics };
	'audio:play': { request: { audioPath: string }; response: void };
	'audio:stop': { request: void; response: void };

	// AI
	'ai:interlocutor-respond': {
		request: InterlocutorContext;
		response: InterlocutorResponse;
	};
	'ai:co-candidate-respond': {
		request: CoCandidateContext;
		response: CoCandidateResponse;
	};
	'ai:generate-assessment': {
		request: AssessmentRequest;
		response: Assessment;
	};
	'ai:tts-generate': { request: TTSRequest; response: TTSResponse };
	'ai:generate-part2-images': {
		request: Part2ImageGenerationRequest;
		response: Part2ImageGenerationResponse;
	};
	'ai:get-part2-image-progress': {
		request: void;
		response: Part2ImageGenerationProgress;
	};
	'ai:list-image-models': {
		request: void;
		response: string[];
	};

	// Database
	'db:save-turn': { request: Turn; response: void };
	'db:get-turns': { request: { sessionId: string }; response: Turn[] };
	'db:save-assessment': { request: Assessment; response: void };
	'db:get-assessment': {
		request: { sessionId: string };
		response: Assessment | null;
	};

	// System
	'system:check-health': {
		request: void;
		response: { healthy: boolean; details: any };
	};
	'system:get-capabilities': { request: void; response: SystemCapabilities };
	'system:check-ollama': {
		request: void;
		response: { available: boolean; version?: string; models: string[] };
	};
	'system:list-microphones': { request: void; response: MediaDeviceInfo[] };

	// Settings
	'settings:get': { request: void; response: UserSettings };
	'settings:update': { request: Partial<UserSettings>; response: UserSettings };

	// Models
	'models:list': { request: { type?: ModelType }; response: ModelInfo[] };
	'models:test': {
		request: { type: ModelType; name: string };
		response: { success: boolean; message: string };
	};
};
