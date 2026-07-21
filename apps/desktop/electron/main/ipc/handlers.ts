import {
	Assessment,
	AssessmentRequest,
	CoCandidateContext,
	CoCandidateResponse,
	InterlocutorContext,
	InterlocutorResponse,
	Part2ImageGenerationProgress,
	Part2ImageGenerationRequest,
	Part2ImageGenerationResponse,
	Session,
	SessionConfig,
	TranscribeRequest,
	TranscribeResponse,
	TTSRequest,
	TTSResponse,
	Turn,
} from '@shared/index';
import axios from 'axios';
import { ipcMain } from 'electron';
import { AIServiceManager } from '../services/ai-service-manager';
import { AudioManager } from '../services/audio-manager';
import { DatabaseManager } from '../services/database-manager';

interface Services {
	aiService: AIServiceManager;
	database: DatabaseManager;
	audio: AudioManager;
}

async function checkOllamaDirectly(): Promise<{
	installed: boolean;
	running: boolean;
	version?: string;
	models: string[];
}> {
	try {
		const [versionResponse, tagsResponse] = await Promise.all([
			axios.get('http://127.0.0.1:11434/api/version', { timeout: 5000 }),
			axios.get('http://127.0.0.1:11434/api/tags', { timeout: 5000 }),
		]);

		return {
			installed: true,
			running: true,
			version: versionResponse.data?.version,
			models: (tagsResponse.data?.models || [])
				.map((model: { name?: string }) => model.name)
				.filter((name: string | undefined): name is string => Boolean(name)),
		};
	} catch {
		return { installed: false, running: false, models: [] };
	}
}

export function registerIPCHandlers(services: Services): void {
	const { aiService, database, audio } = services;

	// =========================================================================
	// Session Management
	// =========================================================================

	ipcMain.handle(
		'session:create',
		async (_, config: SessionConfig): Promise<Session> => {
			const session: Omit<Session, 'id'> = {
				profileId: 'default', // TODO: Support multiple profiles
				mode: config.mode,
				config,
				startedAt: new Date().toISOString(),
				status: 'created',
			};

			return await database.createSession(session);
		},
	);

	ipcMain.handle(
		'session:start',
		async (_, { sessionId }: { sessionId: string }): Promise<void> => {
			await database.updateSession(sessionId, {
				status: 'active',
			});
		},
	);

	ipcMain.handle(
		'session:complete',
		async (_, { sessionId }: { sessionId: string }): Promise<void> => {
			await database.updateSession(sessionId, {
				status: 'completed',
				endedAt: new Date().toISOString(),
			});
		},
	);

	ipcMain.handle(
		'session:cancel',
		async (_, { sessionId }: { sessionId: string }): Promise<void> => {
			await database.updateSession(sessionId, {
				status: 'cancelled',
				endedAt: new Date().toISOString(),
			});
		},
	);

	ipcMain.handle(
		'session:get',
		async (
			_,
			{ sessionId }: { sessionId: string },
		): Promise<Session | null> => {
			return await database.getSession(sessionId);
		},
	);

	ipcMain.handle(
		'session:list',
		async (
			_,
			{ profileId, limit }: { profileId: string; limit?: number },
		): Promise<Session[]> => {
			return await database.listSessions(profileId, limit);
		},
	);

	// =========================================================================
	// Audio Operations
	// =========================================================================

	ipcMain.handle(
		'audio:save-recording',
		async (
			_,
			{ sessionId, audioData }: { sessionId: string; audioData: Uint8Array },
		): Promise<{ path: string }> => {
			const buffer = Buffer.from(audioData);
			const relativePath = await audio.saveRecording(sessionId, buffer, 'webm');
			return { path: relativePath };
		},
	);

	ipcMain.handle(
		'audio:transcribe',
		async (_, request: TranscribeRequest): Promise<TranscribeResponse> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			// Convert relative path to absolute
			const absolutePath = audio.getFullPath(request.audioPath);

			const response = await client.post<TranscribeResponse>(
				'/audio/transcribe',
				{
					...request,
					audioPath: absolutePath,
				},
			);

			return response.data;
		},
	);

	ipcMain.handle(
		'audio:analyze',
		async (_, { audioPath }: { audioPath: string }): Promise<any> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			const absolutePath = audio.getFullPath(audioPath);

			const response = await client.post('/audio/analyze', {
				audioPath: absolutePath,
			});

			return response.data;
		},
	);

	// =========================================================================
	// AI Operations
	// =========================================================================

	ipcMain.handle(
		'ai:interlocutor-respond',
		async (_, context: InterlocutorContext): Promise<InterlocutorResponse> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			const response = await client.post<InterlocutorResponse>(
				'/exam/interlocutor/respond',
				context,
			);

			return response.data;
		},
	);

	ipcMain.handle(
		'ai:co-candidate-respond',
		async (_, context: CoCandidateContext): Promise<CoCandidateResponse> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			const response = await client.post<CoCandidateResponse>(
				'/exam/co-candidate/respond',
				context,
			);

			return response.data;
		},
	);

	ipcMain.handle(
		'ai:generate-assessment',
		async (_, request: AssessmentRequest): Promise<Assessment> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			// Update session status
			await database.updateSession(request.sessionId, {
				status: 'processing',
			});

			try {
				const response = await client.post<Assessment>(
					'/assessment/generate',
					request,
					{
						timeout: 180000, // 3 minutes for assessment
					},
				);

				// Save assessment to database
				await database.saveAssessment(response.data);

				// Update session with results
				await database.updateSession(request.sessionId, {
					status: 'completed',
					estimatedLevel: response.data.estimatedOverallLevel,
				});

				return response.data;
			} catch (error) {
				await database.updateSession(request.sessionId, {
					status: 'failed',
				});
				throw error;
			}
		},
	);

	ipcMain.handle(
		'ai:tts-generate',
		async (_, request: TTSRequest): Promise<TTSResponse> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			const response = await client.post<TTSResponse>('/tts/speak', request);

			return response.data;
		},
	);

	ipcMain.handle(
		'ai:generate-part2-images',
		async (
			_,
			request: Part2ImageGenerationRequest,
		): Promise<Part2ImageGenerationResponse> => {
			const client = aiService.getClient();
			if (!client) {
				throw new Error('AI service not available');
			}

			const response = await client.post<Part2ImageGenerationResponse>(
				'/images/part2/generate',
				request,
				{ timeout: 130000 },
			);

			return response.data;
		},
	);

	ipcMain.handle(
		'ai:get-part2-image-progress',
		async (): Promise<Part2ImageGenerationProgress> => {
			const client = aiService.getClient();
			if (!client) {
				return {
					available: false,
					progress: 0,
					etaSeconds: null,
					stage: 'AI service unavailable',
				};
			}

			const response = await client.get<Part2ImageGenerationProgress>(
				'/images/part2/progress',
				{ timeout: 5000 },
			);

			return response.data;
		},
	);

	ipcMain.handle('ai:list-image-models', async (): Promise<string[]> => {
		const client = aiService.getClient();
		if (!client) {
			return [];
		}

		const response = await client.get<{ models: string[] }>(
			'/images/models',
			{ timeout: 5000 },
		);

		return response.data.models;
	});

	ipcMain.handle(
		'audio:get-file',
		async (_, { filePath }: { filePath: string }): Promise<Uint8Array> => {
			const fs = await import('fs/promises');
			const buffer = await fs.readFile(filePath);
			return new Uint8Array(buffer);
		},
	);

	// =========================================================================
	// Database Operations
	// =========================================================================

	ipcMain.handle('db:save-turn', async (_, turn: Turn): Promise<void> => {
		await database.saveTurn(turn);
	});

	ipcMain.handle(
		'db:get-turns',
		async (_, { sessionId }: { sessionId: string }): Promise<Turn[]> => {
			return await database.getTurns(sessionId);
		},
	);

	ipcMain.handle(
		'db:get-assessment',
		async (
			_,
			{ sessionId }: { sessionId: string },
		): Promise<Assessment | null> => {
			return await database.getAssessment(sessionId);
		},
	);

	// =========================================================================
	// System Operations
	// =========================================================================

	ipcMain.handle(
		'system:check-health',
		async (): Promise<{ healthy: boolean; details: any }> => {
			const aiHealthy = await aiService.checkHealth();

			return {
				healthy: aiHealthy,
				details: {
					aiService: aiHealthy,
					aiServicePort: aiService.getPort(),
					database: !!database.getDb(),
				},
			};
		},
	);

	ipcMain.handle(
		'system:check-ollama',
		async (): Promise<{
			installed: boolean;
			running: boolean;
			version?: string;
			models: string[];
		}> => {
			const client = aiService.getClient();
			if (!client) {
				return checkOllamaDirectly();
			}

			try {
				const response = await client.get('/system/ollama-status');
				const data = response.data;
				// Map backend response to frontend expected format
				return {
					installed: data.available || false,
					running: data.available || false,
					version: data.version,
					models: data.models || [],
				};
			} catch {
				return checkOllamaDirectly();
			}
		},
	);

	ipcMain.handle(
		'models:list',
		async (_, { type }: { type?: string }): Promise<any[]> => {
			const client = aiService.getClient();
			if (!client) {
				return [];
			}

			try {
				const response = await client.get('/models', { params: { type } });
				return response.data;
			} catch {
				return [];
			}
		},
	);

	ipcMain.handle(
		'models:test',
		async (
			_,
			{ type, name }: { type: string; name: string },
		): Promise<{ success: boolean; message: string }> => {
			const client = aiService.getClient();
			if (!client) {
				return { success: false, message: 'AI service not available' };
			}

			try {
				const response = await client.post('/models/test', { type, name });
				return response.data;
			} catch (error: any) {
				return {
					success: false,
					message: error.response?.data?.message || error.message,
				};
			}
		},
	);

	console.log('[IPC] All handlers registered');
}
