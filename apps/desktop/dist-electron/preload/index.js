"use strict";
const electron = require("electron");
const api = {
  // Session management
  session: {
    create: (config) => electron.ipcRenderer.invoke("session:create", config),
    start: (request) => electron.ipcRenderer.invoke("session:start", request),
    pause: (request) => electron.ipcRenderer.invoke("session:pause", request),
    resume: (request) => electron.ipcRenderer.invoke("session:resume", request),
    complete: (request) => electron.ipcRenderer.invoke("session:complete", request),
    cancel: (request) => electron.ipcRenderer.invoke("session:cancel", request),
    get: (request) => electron.ipcRenderer.invoke("session:get", request),
    list: (request) => electron.ipcRenderer.invoke("session:list", request)
  },
  // Audio operations
  audio: {
    saveRecording: (sessionId, audioData) => electron.ipcRenderer.invoke("audio:save-recording", { sessionId, audioData }),
    transcribe: (request) => electron.ipcRenderer.invoke("audio:transcribe", request),
    analyze: (request) => electron.ipcRenderer.invoke("audio:analyze", request),
    getFile: (filePath) => electron.ipcRenderer.invoke("audio:get-file", { filePath })
  },
  // AI operations
  ai: {
    interlocutorRespond: (context) => electron.ipcRenderer.invoke("ai:interlocutor-respond", context),
    coCandidateRespond: (context) => electron.ipcRenderer.invoke("ai:co-candidate-respond", context),
    generateAssessment: (request) => electron.ipcRenderer.invoke("ai:generate-assessment", request),
    ttsGenerate: (request) => electron.ipcRenderer.invoke("ai:tts-generate", request),
    generatePart2Images: (request) => electron.ipcRenderer.invoke("ai:generate-part2-images", request),
    getPart2ImageProgress: () => electron.ipcRenderer.invoke("ai:get-part2-image-progress")
  },
  // Database operations
  db: {
    saveTurn: (turn) => electron.ipcRenderer.invoke("db:save-turn", turn),
    getTurns: (request) => electron.ipcRenderer.invoke("db:get-turns", request),
    saveAssessment: (assessment) => electron.ipcRenderer.invoke("db:save-assessment", assessment),
    getAssessment: (request) => electron.ipcRenderer.invoke("db:get-assessment", request)
  },
  // System operations
  system: {
    checkHealth: () => electron.ipcRenderer.invoke("system:check-health"),
    getCapabilities: () => electron.ipcRenderer.invoke("system:get-capabilities"),
    checkOllama: () => electron.ipcRenderer.invoke("system:check-ollama"),
    listMicrophones: () => electron.ipcRenderer.invoke("system:list-microphones")
  },
  // Settings operations
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    update: (settings) => electron.ipcRenderer.invoke("settings:update", settings)
  },
  // Model operations
  models: {
    list: (request) => electron.ipcRenderer.invoke("models:list", request),
    test: (request) => electron.ipcRenderer.invoke("models:test", request)
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
