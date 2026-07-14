import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Eye, Trash2, Loader2 } from 'lucide-react';
import type { Session } from '@shared/index';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const loadedSessions = await window.electronAPI.session.list({ profileId: '', limit: 100 });
      // Sort by date descending
      loadedSessions.sort((a: any, b: any) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const colors = {
      completed: 'bg-success/10 text-success',
      in_progress: 'bg-warning/10 text-warning',
      cancelled: 'bg-muted text-muted-foreground',
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground';
  }

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Session History</h1>
        <p className="text-muted-foreground">
          Review your past practice sessions and assessments
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">No sessions yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Start your first practice session to see your progress here
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Start Practice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {session.mode === 'full_mock' ? 'Full Mock Exam' : 'Part Practice'}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded uppercase ${getStatusBadge(
                        session.status
                      )}`}
                    >
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(session.startedAt).toLocaleDateString()}
                    </span>
                    {session.endedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(
                          (new Date(session.endedAt).getTime() -
                            new Date(session.startedAt).getTime()) /
                            1000
                        )}
                      </span>
                    )}
                  </div>

                  {session.config.parts && (
                    <div className="text-sm text-muted-foreground">
                      Parts: {session.config.parts.join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {session.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/results/${session.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Results
                    </button>
                  )}
                  <button
                    className="p-2 border border-border rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
