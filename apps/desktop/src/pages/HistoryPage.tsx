import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Eye, Loader2, Search } from 'lucide-react';
import type { Session } from '@shared/index';
import { useToast } from '../components/ToastProvider';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      notify({
        type: 'error',
        title: 'History failed to load',
        message: 'Try again after restarting the app.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      const partLabel = session.config.parts?.join(', ') || 'full exam';
      const searchable = `${session.mode} ${session.status} ${partLabel} ${new Date(session.startedAt).toLocaleDateString()}`.toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, sessions, statusFilter]);

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

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by mode, status, date, or part"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
          <option value="cancelled">Cancelled</option>
        </select>
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
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          No sessions match your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
