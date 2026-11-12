import { ArrowRight, Check, Database, KeyRound, ShieldCheck, Sprout } from 'lucide-react'
import { Brand } from '../components/ui'

export function Setup() {
  return (
    <main className="setup">
      <section className="setup-story">
        <Brand />
        <div className="setup-copy">
          <span className="pill">
            <Sprout size={15} /> HECHO PARA CRECER CONTIGO
          </span>
          <h1>
            Cada par tiene
            <br />
            una historia.
            <br />
            <em>Tenla en orden.</em>
          </h1>
          <p>Un espacio para cuidar tu inventario, acompañar tus Lives y ver crecer BABY RONNYS.</p>
          <div className="setup-features">
            <span>
              <Check size={17} /> Inventario por talla y color
            </span>
            <span>
              <Check size={17} /> Ventas y comprobantes juntos
            </span>
            <span>
              <Check size={17} /> Stock protegido en cada cierre
            </span>
          </div>
        </div>
        <small>Pequeños pasos. Grandes sueños.</small>
        <div className="decor-circle one" />
        <div className="decor-circle two" />
      </section>
      <section className="setup-panel">
        <div className="setup-card">
          <span className="square-icon">
            <Database size={25} />
          </span>
          <p className="eyebrow">BIENVENIDO A TU NUEVO ESPACIO</p>
          <h2>Conectemos tu negocio</h2>
          <p className="muted">
            La aplicación está preparada. Conecta tu proyecto de Supabase para comenzar con datos
            reales.
          </p>
          <ol className="setup-steps">
            <li>
              <span>01</span>
              <div>
                <strong>Prepara la base de datos</strong>
                <p>
                  Crea un proyecto gratuito de Supabase y ejecuta las dos migraciones de la carpeta{' '}
                  <code>supabase/migrations</code>.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Agrega tus claves públicas</strong>
                <p>
                  Copia <code>.env.example</code> a <code>.env</code> y completa la URL y la clave
                  pública de tu proyecto.
                </p>
                <code className="code-block">
                  VITE_SUPABASE_URL
                  <br />
                  VITE_SUPABASE_ANON_KEY
                </code>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Crea tu primer administrador</strong>
                <p>
                  Crea el usuario en Supabase Auth y activa su perfil siguiendo el README. Luego
                  reinicia el servidor.
                </p>
              </div>
            </li>
          </ol>
          <a
            className="button full"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Abrir Supabase <ArrowRight size={18} />
          </a>
          <div className="setup-foot">
            <ShieldCheck size={15} />
            <span>Las claves privadas nunca van en el navegador.</span>
          </div>
          <p className="tiny">
            <KeyRound size={13} /> La configuración completa está en el README del proyecto.
          </p>
        </div>
      </section>
    </main>
  )
}
