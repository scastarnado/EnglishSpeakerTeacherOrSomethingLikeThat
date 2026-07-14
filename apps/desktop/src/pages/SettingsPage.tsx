import { useState, useEffect } from 'react';
import { Check, X, Loader2, Download, AlertCircle, ExternalLink } from 'lucide-react';

interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  models?: string[];
}

export default function SettingsPage() {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [selectedLLM, setSelectedLLM] = useState('qwen2.5:7b-instruct');
  const [selectedWhisper, setSelectedWhisper] = useState('small.en');
  const [selectedVoice, setSelectedVoice] = useState('british_male');

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  async function checkOllamaStatus() {
    setIsChecking(true);
    try {
      const status = await window.electronAPI.system.checkOllama();
      setOllamaStatus(status);
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
      setOllamaStatus({ installed: false, running: false });
    } finally {
      setIsChecking(false);
    }
  }

  function openOllamaDownload() {
    window.open('https://ollama.ai/download', '_blank');
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your C1 Speaking Coach application
        </p>
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
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
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
              value={selectedWhisper}
              onChange={(e) => setSelectedWhisper(e.target.value)}
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
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
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
      <div className="p-4 rounded-lg bg-muted/50 text-sm">
        <p className="font-semibold mb-1">C1 Speaking Coach v1.0.0</p>
        <p className="text-muted-foreground">
          An independent practice tool for C1 Advanced speaking examination. Not
          affiliated with Cambridge University Press & Assessment.
        </p>
      </div>
    </div>
  );
}
