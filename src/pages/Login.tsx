import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { client } from '../lib/supabase'
import { Alert, AsyncForm, Brand, Spinner } from '../components/ui'

export function Login() {
  const { session, loading } = useAuth()
  const [recovery, setRecovery] = useState(false)
  const [sent, setSent] = useState(false)
  if (loading) return <Spinner />
  if (session) return <Navigate to="/" replace />
  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <p className="eyebrow">QUÉ BUENO TENERTE AQUÍ</p>
        <h1>{recovery ? 'Recupera tu acceso' : 'Hola, bienvenido.'}</h1>
        <p className="muted">
          {recovery
            ? 'Te enviaremos un enlace para cambiar tu contraseña.'
            : 'Ingresa a tu espacio de inventario y ventas.'}
        </p>
        {sent ? (
          <Alert success>
            Si el correo está registrado, recibirás un enlace. Revisa también la carpeta de spam.
          </Alert>
        ) : (
          <AsyncForm
            submit={recovery ? 'Enviar enlace' : 'Entrar a mi espacio'}
            onSubmit={async (form) => {
              const email = String(form.get('email')).trim()
              if (recovery) {
                const { error } = await client().auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/restablecer`,
                })
                if (error) throw error
                setSent(true)
              } else {
                const { error } = await client().auth.signInWithPassword({
                  email,
                  password: String(form.get('password')),
                })
                if (error) throw error
              }
            }}
          >
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                required
              />
            </label>
            {!recovery && (
              <label>
                Contraseña
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  placeholder="Tu contraseña"
                />
              </label>
            )}
          </AsyncForm>
        )}
        <button
          className="text-button"
          onClick={() => {
            setRecovery(!recovery)
            setSent(false)
          }}
        >
          {recovery ? (
            <>
              <ArrowLeft size={15} /> Volver al inicio de sesión
            </>
          ) : (
            'Olvidé mi contraseña'
          )}
        </button>
        <div className="setup-foot">
          <ShieldCheck size={16} /> Acceso exclusivo al equipo de BABY RONNYS
        </div>
      </div>
    </main>
  )
}
export function ResetPassword() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <h1>Una nueva contraseña</h1>
        {session ? (
          <AsyncForm
            submit="Actualizar contraseña"
            onSubmit={async (form) => {
              const password = String(form.get('password'))
              if (password !== form.get('confirm')) throw new Error('Las contraseñas no coinciden.')
              const { error } = await client().auth.updateUser({ password })
              if (error) throw error
              navigate('/', { replace: true })
            }}
          >
            <label>
              Nueva contraseña
              <input
                type="password"
                name="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                type="password"
                name="confirm"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            <p className="tiny">Usa al menos 12 caracteres.</p>
          </AsyncForm>
        ) : (
          <Alert>
            El enlace no es válido o caducó. Solicita uno nuevo desde el inicio de sesión.
          </Alert>
        )}
        <a href="/ingresar" className="text-button">
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
