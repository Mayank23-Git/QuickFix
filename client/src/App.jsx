import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { SignupPage } from './pages/SignupPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DoubtBoardPage } from './pages/DoubtBoardPage.jsx';
import { PostDoubtPage } from './pages/PostDoubtPage.jsx';
import { DoubtDetailsPage } from './pages/DoubtDetailsPage.jsx';
import { StudentProfilePage } from './pages/StudentProfilePage.jsx';
import { EditProfilePage } from './pages/EditProfilePage.jsx';
import { MySessionsPage } from './pages/MySessionsPage.jsx';
import { ActiveSessionPage } from './pages/ActiveSessionPage.jsx';
import { LeaderboardPage } from './pages/LeaderboardPage.jsx';
import { FindPeersPage } from './pages/FindPeersPage.jsx';
import { AchievementsPage } from './pages/AchievementsPage.jsx';
import { VerifyCredentialPage } from './pages/VerifyCredentialPage.jsx';
import { AdminAchievementsPage } from './pages/AdminAchievementsPage.jsx';
import { SkillGrowthPage } from './pages/SkillGrowthPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <Routes>
            {/* Public pages */}
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <SignupPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/doubts" element={<DoubtBoardPage />} />
            <Route path="/doubts/:id" element={<DoubtDetailsPage />} />
            <Route path="/peers" element={<FindPeersPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile/:id" element={<StudentProfilePage />} />
            <Route path="/verify" element={<VerifyCredentialPage />} />
            <Route path="/verify/:credentialId" element={<VerifyCredentialPage />} />

            {/* Protected student workspace pages */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skill-growth"
              element={
                <ProtectedRoute>
                  <SkillGrowthPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminAchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doubts/new"
              element={
                <ProtectedRoute>
                  <PostDoubtPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doubts/:id/edit"
              element={
                <ProtectedRoute>
                  <PostDoubtPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <MySessionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:id"
              element={
                <ProtectedRoute>
                  <ActiveSessionPage />
                </ProtectedRoute>
              }
            />

              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
