import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  Download,
  Home,
  LogOut,
  Menu,
  Radio,
  RefreshCw,
  ScanBarcode,
  ShieldCheck,
  Users,
  WifiOff,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useData } from '../data/DataContext'
import { supabase } from '../lib/supabase'
import { Alert, Brand, Spinner } from './ui'

const nav = [
  { to: '/', label: 'Mi resumen', icon: Home },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/lives', label: 'Ventas Live', icon: Radio },
  { to: '/movimientos', label: 'Movimientos', icon: ClipboardList },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/etiquetas', label: 'Etiquetas', icon: ScanBarcode },
]
type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
export function Layout() {
  const { profile } = useAuth()
  const { data, error, loading, refresh } = useData()
  const [menu, setMenu] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [install, setInstall] = useState<InstallPrompt | null>(null)
  const [signOutError, setSignOutError] = useState('')
  const location = useLocation()
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const prompt = (event: Event) => {
      event.preventDefault()
      setInstall(event as InstallPrompt)
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('beforeinstallprompt', prompt)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('beforeinstallprompt', prompt)
    }
  }, [])
  const title =
    nav.find((n) => n.to === location.pathname)?.label ??
    (location.pathname.startsWith('/lives/') ? 'Detalle del Live' : 'Equipo')
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      {menu && (
        <button
          aria-label="Cerrar menú"
          className="sidebar-overlay"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Cerrar menú"
            onClick={() => setMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="nav-label">MI ESPACIO DE TRABAJO</p>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              end={to === '/'}
              to={to}
              onClick={() => setMenu(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {label}
              {to === '/lives' && data && data.lives.some((l) => l.status === 'open') && (
                <span className="nav-dot" />
              )}
            </NavLink>
          ))}
          {profile?.role === 'admin' && (
            <NavLink
              to="/equipo"
              onClick={() => setMenu(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={20} />
              Equipo
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <span>✳</span>
            <strong>Un pasito a la vez.</strong>
            <p>Todo lo que necesitas para seguir creciendo.</p>
          </div>
          {install && (
            <button
              className="button secondary full"
              onClick={async () => {
                await install.prompt()
                await install.userChoice
                setInstall(null)
              }}
            >
              <Download size={16} /> Instalar aplicación
            </button>
          )}
          <div className="user-card">
            <span className="avatar">{profile?.display_name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{profile?.display_name}</strong>
              <small>{profile?.role === 'admin' ? 'Administrador' : 'Encargada'}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={async () => {
                const result = await supabase!.auth.signOut()
                if (result.error) setSignOutError(result.error.message)
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Abrir menú"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>Mi espacio</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className={`connection ${online ? '' : 'off'}`}>
              <i />
              {online ? 'En línea' : 'Sin conexión'}
            </span>
            <button
              className="icon-button"
              aria-label="Actualizar datos"
              onClick={() => {
                void refresh()
              }}
            >
              <RefreshCw size={17} />
            </button>
            <span className="top-avatar">{profile?.display_name.charAt(0).toUpperCase()}</span>
          </div>
        </header>
        <main id="main" className="main" key={profile?.id}>
          {!online && (
            <Alert>
              <WifiOff size={16} /> Sin conexión. Los datos visibles pueden estar desactualizados.
              Reconecta para registrar cambios.
            </Alert>
          )}
          {signOutError && <Alert>{signOutError}</Alert>}
          {error && (
            <Alert>
              {error}{' '}
              <button
                className="text-button"
                onClick={() => {
                  void refresh()
                }}
              >
                Reintentar
              </button>
            </Alert>
          )}
          {loading ? (
            <Spinner />
          ) : data ? (
            <Outlet />
          ) : (
            <div className="panel">
              <h2>No se pudieron cargar los datos</h2>
              <p>Comprueba que ejecutaste las migraciones y que tu usuario esté activo.</p>
              <button
                className="button"
                onClick={() => {
                  void refresh()
                }}
              >
                Reintentar conexión
              </button>
            </div>
          )}
        </main>
        <footer className="footer">
          <span>
            BABY RONNYS <span className="footer-dot">·</span> Hecho con cariño para tu negocio
          </span>
          <span>
            <ShieldCheck size={13} /> Stock protegido por transacciones
          </span>
        </footer>
      </div>
    </div>
  )
}
