import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { PreferencesProvider } from './lib/preferences';

const HomePage = lazy(() => import('./pages/HomePage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <ToastProvider>
          <Router>
            <Layout>
              <Suspense fallback={<div className="grid h-full place-items-center text-muted-foreground">Loading...</div>}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/session/:sessionId" element={<SessionPage />} />
                  <Route path="/results/:sessionId" element={<ResultsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
        </ToastProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

export default App;
