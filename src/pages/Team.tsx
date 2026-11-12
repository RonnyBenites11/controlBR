import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { allRows, rpc } from '../lib/supabase'
import { errorMessage } from '../lib/domain'
import type { Profile } from '../lib/types'
import { Alert, AsyncForm, Badge, Empty, Modal, PageHeader, Spinner } from '../components/ui'

export function Team() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Profile | null>(null)
  const load = useCallback(
    () =>
      allRows<Profile>('profiles')
        .then((rows) => {
          setUsers(rows)
          setError('')
        })
        .catch((cause: unknown) => {
          setError(errorMessage(cause))
        })
        .finally(() => {
          setLoading(false)
        }),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRACIÓN"
        title="Crecer en equipo"
        description="Administra los accesos de quienes cuidan tu negocio."
        action={
          <button
            className="button secondary"
            onClick={() => {
              void load()
            }}
          >
            <RefreshCw size={16} /> Actualizar
          </button>
        }
      />
      <div className="info-banner">
        <Users size={20} />
        <span>
          Para agregar una persona, crea su usuario en Supabase → Authentication → Users. Luego
          activa su perfil aquí. No hay registro público.
        </span>
      </div>
      {error && <Alert>{error}</Alert>}
      <section className="panel">
        {loading ? (
          <Spinner />
        ) : users.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol</th>
                  <th>Acceso</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.display_name}</strong>
                      <small className="monospace">{u.id}</small>
                    </td>
                    <td>{u.role === 'admin' ? 'Administrador' : 'Encargada'}</td>
                    <td>
                      <Badge tone={u.active ? 'green' : 'amber'}>
                        {u.active ? 'Activo' : 'Pendiente / desactivado'}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={u.id === profile?.id}
                        onClick={() => setEditing(u)}
                      >
                        {u.id === profile?.id ? 'Tu cuenta' : 'Editar acceso'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No se encontraron perfiles" />
        )}
      </section>
      <section className="panel permissions">
        <h2>Un permiso para cada responsabilidad</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Operación</th>
                <th>Administrador</th>
                <th>Encargada</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Consultar inventario y reportes', 'Sí', 'Sí'],
                ['Crear Lives, vender y cerrar', 'Sí', 'Sí'],
                ['Adjuntar comprobantes privados', 'Sí', 'Sí'],
                ['Registrar modelos y producción', 'Sí', 'No'],
                ['Ajustar stock y gestionar accesos', 'Sí', 'No'],
              ].map(([a, b, c]) => (
                <tr key={a}>
                  <td>{a}</td>
                  <td>{b}</td>
                  <td>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {editing && (
        <Modal title="Editar acceso" onClose={() => setEditing(null)}>
          <AsyncForm
            onCancel={() => setEditing(null)}
            onSubmit={async (form) => {
              await rpc('manage_profile', {
                p_id: editing.id,
                p_name: form.get('name'),
                p_role: form.get('role'),
                p_active: form.get('active') === 'on',
              })
              await load()
              setEditing(null)
            }}
          >
            <label>
              Nombre
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={editing.display_name}
              />
            </label>
            <label>
              Rol
              <select name="role" defaultValue={editing.role}>
                <option value="staff">Encargada</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label className="check-label">
              <input name="active" type="checkbox" defaultChecked={editing.active} /> Permitir
              acceso a la aplicación
            </label>
            <p className="tiny">
              Los permisos se verifican también en la base de datos. Un usuario desactivado pierde
              acceso a las operaciones aunque conserve una sesión.
            </p>
          </AsyncForm>
        </Modal>
      )}
    </>
  )
}
