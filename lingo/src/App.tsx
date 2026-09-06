import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useApp } from './context/AppContext'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import CoursesPage from './pages/CoursesPage'
import LessonPage from './pages/LessonPage'
import PracticePage from './pages/PracticePage'
import ProgressPage from './pages/ProgressPage'
import PathPage from './pages/PathPage'
import CommunityPage from './pages/CommunityPage'
import AchievementsPage from './pages/AchievementsPage'

function Protected({ children }: { children: ReactNode }) {
  const { currentUser } = useApp()
  return currentUser ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <HomePage />
            </Protected>
          }
        />
        <Route
          path="/courses"
          element={
            <Protected>
              <CoursesPage />
            </Protected>
          }
        />
        <Route
          path="/courses/:courseId/:lessonId"
          element={
            <Protected>
              <LessonPage />
            </Protected>
          }
        />
        <Route
          path="/practice"
          element={
            <Protected>
              <PracticePage />
            </Protected>
          }
        />
        <Route
          path="/progress"
          element={
            <Protected>
              <ProgressPage />
            </Protected>
          }
        />
        <Route
          path="/path"
          element={
            <Protected>
              <PathPage />
            </Protected>
          }
        />
        <Route
          path="/community"
          element={
            <Protected>
              <CommunityPage />
            </Protected>
          }
        />
        <Route
          path="/achievements"
          element={
            <Protected>
              <AchievementsPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
