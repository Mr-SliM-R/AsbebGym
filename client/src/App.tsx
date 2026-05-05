import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./auth";
import { ChallengesPage } from "./pages/ChallengesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BusinessPage } from "./pages/BusinessPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseLibraryPage } from "./pages/ExerciseLibraryPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LegalPage } from "./pages/LegalPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { WorkoutTrackerPage } from "./pages/WorkoutTrackerPage";

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppShell />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="/exercises" element={<ExerciseLibraryPage />} />
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="/tracker" element={<WorkoutTrackerPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/business" element={<BusinessPage />} />
        <Route path="/legal" element={<LegalPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}
