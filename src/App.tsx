import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/Toast';
import { PageSkeleton } from './components/Skeleton';
import { OfflineBanner } from './components/OfflineBanner';

// Each page is its own chunk: My Maps never downloads the editor, the landing page never
// downloads React Flow. The landing page itself is tiny and ships with the entry so the first
// visit needs no extra round trip.
import Landing from './pages/Landing';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <AuthProvider>
      <OfflineBanner />
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<Dashboard />} />
            <Route path="/d/:id" element={<EditorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}
