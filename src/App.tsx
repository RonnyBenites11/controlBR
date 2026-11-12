import { Component, lazy, Suspense } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/AuthContext'
import { DataProvider } from './data/DataProvider'
import { configured, supabase } from './lib/supabase'
import { Alert, Brand, Empty, Spinner } from './components/ui'
import { Layout } from './components/Layout'
import { Setup } from './pages/Setup'
import { Login, ResetPassword } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
const Inventory = lazy(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })))
const Lives = lazy(() => import('./pages/Lives').then((m) => ({ default: m.Lives })))
const LiveDetail = lazy(() => import('./pages/LiveDetail').then((m) => ({ default: m.LiveDetail })))
const Movements = lazy(() => import('./pages/Movements').then((m) => ({ default: m.Movements })))
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const Labels = lazy(() => import('./pages/Labels').then((m) => ({ default: m.Labels })))
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })))

function Protected() {
  const { session, profile, loading, error, reload } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/ingresar" replace />
  if (!profile?.active)
    return (
      <main className="login-page">
        <div className="login-card">
          <Brand />
          <h1>Tu acceso está pendiente</h1>
          <p className="muted">
            Pide al administrador que active tu perfil. Si eres el primer usuario, sigue el paso de
            activación del README.
          </p>
          {error && <Alert>{error}</Alert>}
          <div className="button-row">
            <button
              className="button"
              onClick={() => {
                void reload()
              }}
            >
              Revisar acceso
            </button>
            <button
              className="button secondary"
              onClick={() => {
                void supabase!.auth.signOut()
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    )
  return (
    <DataProvider key={session.user.id}>
      <Outlet />
    </DataProvider>
  )
}
function AdminOnly() {
  const { profile } = useAuth()
  return profile?.role === 'admin' ? <Team /> : <Navigate to="/" replace />
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de aplicación', error.message, info.componentStack)
  }
  render() {
    return this.state.failed ? (
      <main className="login-page">
        <div className="login-card">
          <h1>Algo no se pudo cargar</h1>
          <p>
            Recarga la aplicación. Si tenías una operación pendiente, revisa el historial antes de
            repetirla.
          </p>
          <button className="button" onClick={() => window.location.reload()}>
            Recargar aplicación
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  if (!configured) return <Setup />
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/ingresar" element={<Login />} />
              <Route path="/restablecer" element={<ResetPassword />} />
              <Route element={<Protected />}>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="inventario" element={<Inventory />} />
                  <Route path="lives" element={<Lives />} />
                  <Route path="lives/:id" element={<LiveDetail />} />
                  <Route path="movimientos" element={<Movements />} />
                  <Route path="reportes" element={<Reports />} />
                  <Route path="etiquetas" element={<Labels />} />
                  <Route path="equipo" element={<AdminOnly />} />
                  <Route
                    path="*"
                    element={
                      <Empty title="Esta página no existe">
                        <a href="/">Volver al resumen</a>
                      </Empty>
                    }
                  />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
