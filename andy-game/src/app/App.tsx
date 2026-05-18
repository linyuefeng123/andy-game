import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/global.css';

const WelcomePage = lazy(() => import('../pages/WelcomePage'));
const LobbyPage = lazy(() => import('../pages/LobbyPage'));
const ElevatorPage = lazy(() => import('../pages/ElevatorPage'));
const FloorPage = lazy(() => import('../pages/FloorPage'));
const AchievementsPage = lazy(() => import('../pages/AchievementsPage'));
const FloorMapPage = lazy(() => import('../pages/FloorMapPage'));
const AndyPage = lazy(() => import('../pages/AndyPage'));
const ShopPage = lazy(() => import('../pages/ShopPage'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #1a1a3e 0%, #2d2d6e 100%)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(255,217,61,0.3)',
        borderTopColor: '#ffd93d',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const playerName = useGameStore((s) => s.playerName);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                playerName ? <Navigate to="/lobby" replace /> : <WelcomePage />
              }
            />
            <Route
              path="/lobby"
              element={playerName ? <LobbyPage /> : <Navigate to="/" replace />}
            />
            <Route path="/elevator" element={<ElevatorPage />} />
            <Route path="/floor/:floorId" element={<FloorPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/map" element={<FloorMapPage />} />
            <Route path="/andy" element={<AndyPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
