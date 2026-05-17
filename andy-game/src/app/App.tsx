import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import ErrorBoundary from '../components/ErrorBoundary';
import WelcomePage from '../pages/WelcomePage';
import LobbyPage from '../pages/LobbyPage';
import ElevatorPage from '../pages/ElevatorPage';
import FloorPage from '../pages/FloorPage';
import AchievementsPage from '../pages/AchievementsPage';
import AndyRoomPage from '../pages/AndyRoomPage';
import FloorMapPage from '../pages/FloorMapPage';
import AndyPage from '../pages/AndyPage';
import ShopPage from '../pages/ShopPage';
import '../styles/global.css';

export default function App() {
  const playerName = useGameStore((s) => s.playerName);

  return (
    <ErrorBoundary>
      <BrowserRouter>
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
          <Route path="/room" element={<AndyRoomPage />} />
          <Route path="/map" element={<FloorMapPage />} />
          <Route path="/andy" element={<AndyPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
