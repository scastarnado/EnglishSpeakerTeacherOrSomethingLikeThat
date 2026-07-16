import { useState, useEffect } from 'react';
import { Check, X, Loader2, Download, AlertCircle, ExternalLink, RotateCcw, Palette } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { usePreferences, type AppDensity, type AppTheme } from '../lib/preferences';

interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  models?: string[];
}

export default function SettingsPage() {
  const { notify } = useToast();
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  async function checkOllamaStatus() {
    setIsChecking(true);
    try {
      const status = await window.electronAPI.system.checkOllama();
      setOllamaStatus(status);
      notify({
        type: status.running ? 'success' : 'error',
        title: status.running ? 'System check complete' : 'Ollama not running',
        message: status.running ? 'The local model service is available.' : 'Start Ollama, then retry.',
      });
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
      setOllamaStatus({ installed: false, running: false });
      notify({
        type: 'error',
        title: 'System check failed',
        message: 'Could not contact Ollama.',
      });
    } finally {
      setIsChecking(false);
    }
  }

  function openOllamaDownload() {
    window.open('https://ollama.ai/download', '_blank');
  }

  function handleResetPreferences() {
    resetPreferences();
    notify({
      type: 'success',
      title: 'Preferences reset',
      message: 'Personalization and model defaults were restored.',
    });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your C1 Speaking Coach application
        </p>
      </div>

      {/* Personalization */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
          <Palette className="h-6 w-6 text-primary" />
          Personalization
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="mb-2 block font-semibold">Theme</label>
            <select
              value={preferences.theme}
              onChange={(event) => updatePreferences({ theme: event.target.value as AppTheme })}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="system">Use System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="sage">Sage</option>
              <option value="sunset">Sunset</option>
            </select>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <label className="mb-2 block font-semibold">Interface Density</label>
            <select
              value={preferences.density}
              onChange={(event) => updatePreferences({ density: event.target.value as AppDensity })}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <span>
              <span className="block font-semibold">Reduce Motion</span>
              <span className="text-sm text-muted-foreground">Minimize animations and transitions.</span>
            </span>
            <input
              type="checkbox"
              checked={preferences.reduceMotion}
              onChange={(event) => updatePreferences({ reduceMotion: event.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <span>
              <span className="block font-semibold">Practice Tips</span>
              <span className="text-sm text-muted-foreground">Show coaching reminders during practice mode.</span>
            </span>
            <input
              type="checkbox"
              checked={preferences.showPracticeTips}
              onChange={(event) => updatePreferences({ showPracticeTips: event.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </div>
      </div>

      {/* System Status */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">System Status</h2>
        
        <div className="space-y-3">
          {/* Ollama Status */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isChecking ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : ollamaStatus?.running ? (
                  <Check className="w-5 h-5 text-success" />
                ) : (
                  <X className="w-5 h-5 text-error" />
                )}
                <div>
                  <p className="font-semibold">Ollama Service</p>
                  <p className="text-sm text-muted-foreground">
                    {isChecking
                      ? 'Checking...'
                      : ollamaStatus?.running
                      ? `Running (v${ollamaStatus.version || 'unknown'})`
                      : 'Not running'}
                  </p>
                </div>
              </div>
              {!ollamaStatus?.installed && !isChecking && (
                <button
                  onClick={openOllamaDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <Download className="w-4 h-4" />
                  Download Ollama
                </button>
              )}
              {ollamaStatus?.installed && !ollamaStatus.running && (
                <button
                  onClick={checkOllamaStatus}
                  className="px-4 py-2 border border-border rounded-md hover:bg-accent"
                >
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Models Available */}
          {ollamaStatus?.running && ollamaStatus.models && (
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                {ollamaStatus.models.length > 0 ? (
                  <Check className="w-5 h-5 text-success mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">Installed Models</p>
                  {ollamaStatus.models.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ollamaStatus.models.map((model) => (
                        <span
                          key={model}
                          className="px-2 py-1 text-xs font-mono bg-muted rounded"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      No models installed. Download models using <code className="px-1 py-0.5 bg-muted rounded text-xs">ollama pull qwen2.5:7b-instruct</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {!ollamaStatus?.running && !isChecking && (
          <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-warning shrink-0" />
              <div>
                <p className="font-semibold text-warning mb-1">Ollama Required</p>
                <p className="text-muted-foreground">
                  Ollama must be installed and running to use C1 Speaking Coach. After
                  installing, make sure to download at least one language model.
                </p>
                <button
                  onClick={openOllamaDownload}
                  className="flex items-center gap-2 mt-3 text-primary hover:underline"
                >
                  Installation Guide <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Model Configuration</h2>
        
        <div className="space-y-4">
          {/* LLM Model */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <label className="block font-semibold mb-2">Language Model (LLM)</label>
            <select
              value={preferences.llmModel}
              onChange={(e) => updatePreferences({ llmModel: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              disabled={!ollamaStatus?.running}
            >
              <option value="qwen2.5:7b-instruct">Qwen 2.5 7B Instruct (Recommended)</option>
              <option value="llama3.1:8b-instruct">Llama 3.1 8B Instruct</option>
              <option value="mistral:7b-instruct">Mistral 7B Instruct</option>
            </select>
            <p className="mt-2 text-sm text-muted-foreground">
              Used for examiner and co-candidate AI. Larger models provide better
              conversation quality.
            </p>
          </div>

          {/* Whisper Model */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <label className="block font-semibold mb-2">Speech Recognition Model</label>
            <select
              value={preferences.whisperModel}
              onChange={(e) => updatePreferences({ whisperModel: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="tiny.en">Tiny (Fastest, less accurate)</option>
              <option value="base.en">Base (Fast)</option>
              <option value="small.en">Small (Recommended balance)</option>
              <option value="medium.en">Medium (Slower, more accurate)</option>
            </select>
            <p className="mt-2 text-sm text-muted-foreground">
              Faster-Whisper model for speech-to-text. Downloads automatically on first use.
            </p>
          </div>

          {/* TTS Voice */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <label className="block font-semibold mb-2">Examiner Voice</label>
            <select
              value={preferences.ttsVoice}
              onChange={(e) => updatePreferences({ ttsVoice: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="british_male">British Male</option>
              <option value="british_female">British Female</option>
            </select>
            <p className="mt-2 text-sm text-muted-foreground">
              Text-to-speech voice for examiner responses.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy & Data */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Privacy & Data</h2>
        
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm">All data stored locally on your device</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm">No internet connection required after setup</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm">Audio recordings never uploaded to cloud</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm">No tracking or analytics</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button className="text-sm text-destructive hover:underline">
              Clear All Session Data
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4 text-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold mb-1">C1 Speaking Coach v1.0.0</p>
          <p className="text-muted-foreground">
            An independent practice tool for C1 Advanced speaking examination. Not
            affiliated with Cambridge University Press & Assessment.
          </p>
        </div>
        <button
          onClick={handleResetPreferences}
          className="flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Preferences
        </button>
      </div>
    </div>
  );
}
