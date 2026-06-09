import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ThemesPage from './pages/ThemesPage'
import CardsPage from './pages/CardsPage'
import ReviewPage from './pages/ReviewPage'

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage signInWithGoogle={signInWithGoogle} user={user} loading={loading} />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Layout user={user} signOut={signOut}>
                <Routes>
                  <Route path="/" element={<DashboardPage user={user} />} />
                  <Route path="/themes" element={<ThemesPage user={user} />} />
                  <Route path="/cards" element={<CardsPage user={user} />} />
                  <Route path="/review" element={<ReviewPage user={user} />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
