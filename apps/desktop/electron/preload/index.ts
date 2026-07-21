import type { IPCChannels } from '@shared/index';
import { contextBridge, ipcRenderer } from 'electron';

// Create type-safe IPC API
const api = {
	// Session management
	session: {
		create: (config: IPCChannels['session:create']['request']) =>
			ipcRenderer.invoke('session:create', config),
		start: (request: IPCChannels['session:start']['request']) =>
			ipcRenderer.invoke('session:start', request),
		pause: (request: IPCChannels['session:pause']['request']) =>
			ipcRenderer.invoke('session:pause', request),
		resume: (request: IPCChannels['session:resume']['request']) =>
			ipcRenderer.invoke('session:resume', request),
		complete: (request: IPCChannels['session:complete']['request']) =>
			ipcRenderer.invoke('session:complete', request),
		cancel: (request: IPCChannels['session:cancel']['request']) =>
			ipcRenderer.invoke('session:cancel', request),
		get: (request: IPCChannels['session:get']['request']) =>
			ipcRenderer.invoke('session:get', request),
		list: (request: IPCChannels['session:list']['request']) =>
			ipcRenderer.invoke('session:list', request),
	},

	// Audio operations
	audio: {
		saveRecording: (sessionId: string, audioData: Uint8Array) =>
			ipcRenderer.invoke('audio:save-recording', { sessionId, audioData }),
		transcribe: (request: IPCChannels['audio:transcribe']['request']) =>
			ipcRenderer.invoke('audio:transcribe', request),
		analyze: (request: IPCChannels['audio:analyze']['request']) =>
			ipcRenderer.invoke('audio:analyze', request),
		getFile: (filePath: string) =>
			ipcRenderer.invoke('audio:get-file', { filePath }),
	},

	// AI operations
	ai: {
		interlocutorRespond: (
			context: IPCChannels['ai:interlocutor-respond']['request'],
		) => ipcRenderer.invoke('ai:interlocutor-respond', context),
		coCandidateRespond: (
			context: IPCChannels['ai:co-candidate-respond']['request'],
		) => ipcRenderer.invoke('ai:co-candidate-respond', context),
		generateAssessment: (
			request: IPCChannels['ai:generate-assessment']['request'],
		) => ipcRenderer.invoke('ai:generate-assessment', request),
		ttsGenerate: (request: IPCChannels['ai:tts-generate']['request']) =>
			ipcRenderer.invoke('ai:tts-generate', request),
		generatePart2Images: (
			request: IPCChannels['ai:generate-part2-images']['request'],
		) => ipcRenderer.invoke('ai:generate-part2-images', request),
		getPart2ImageProgress: () =>
			ipcRenderer.invoke('ai:get-part2-image-progress'),
		listImageModels: () =>
			ipcRenderer.invoke('ai:list-image-models'),
	},

	// Database operations
	db: {
		saveTurn: (turn: IPCChannels['db:save-turn']['request']) =>
			ipcRenderer.invoke('db:save-turn', turn),
		getTurns: (request: IPCChannels['db:get-turns']['request']) =>
			ipcRenderer.invoke('db:get-turns', request),
		saveAssessment: (
			assessment: IPCChannels['db:save-assessment']['request'],
		) => ipcRenderer.invoke('db:save-assessment', assessment),
		getAssessment: (request: IPCChannels['db:get-assessment']['request']) =>
			ipcRenderer.invoke('db:get-assessment', request),
	},

	// System operations
	system: {
		checkHealth: () => ipcRenderer.invoke('system:check-health'),
		getCapabilities: () => ipcRenderer.invoke('system:get-capabilities'),
		checkOllama: () => ipcRenderer.invoke('system:check-ollama'),
		listMicrophones: () => ipcRenderer.invoke('system:list-microphones'),
	},

	// Settings operations
	settings: {
		get: () => ipcRenderer.invoke('settings:get'),
		update: (settings: IPCChannels['settings:update']['request']) =>
			ipcRenderer.invoke('settings:update', settings),
	},

	// Model operations
	models: {
		list: (request: IPCChannels['models:list']['request']) =>
			ipcRenderer.invoke('models:list', request),
		test: (request: IPCChannels['models:test']['request']) =>
			ipcRenderer.invoke('models:test', request),
	},
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', api);

// Type definitions for TypeScript
export type ElectronAPI = typeof api;
