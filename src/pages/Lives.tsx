import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Radio, Search } from 'lucide-react'
import { useData } from '../data/DataContext'
import { activeSales, dateTime, money, saleTotal } from '../lib/domain'
import { rpc } from '../lib/supabase'
import { AsyncForm, Badge, Empty, Modal, PageHeader } from '../components/ui'

export function Lives() {
  const { data, run } = useData()
  const [create, setCreate] = useState(false)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  if (!data) return null
  const lives = data.lives
    .filter(
      (l) =>
        (status === 'all' || l.status === status) &&
        l.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return (
    <>
      <PageHeader
        eyebrow="VENTAS LIVE"
        title="En vivo, todo bajo control"
        description="Cada transmisión, sus ventas y sus comprobantes en un mismo lugar."
        action={
          <button className="button" onClick={() => setCreate(true)}>
            <Plus size={17} /> Crear Live
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <div className="tabs">
            {[
              ['all', 'Todos'],
              ['open', 'En curso'],
              ['closed', 'Cerrados'],
              ['cancelled', 'Cancelados'],
            ].map(([key, title]) => (
              <button
                className={status === key ? 'active' : ''}
                onClick={() => setStatus(key)}
                key={key}
              >
                {title}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar Live"
              placeholder="Buscar un Live…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {lives.length ? (
          <div className="live-grid">
            {lives.map((l) => {
              const sales = activeSales(data, l.id)
              return (
                <Link className="live-card" to={`/lives/${l.id}`} key={l.id}>
                  <div className="live-card-top">
                    <span className={`live-icon ${l.status}`}>
                      <Radio size={22} />
                    </span>
                    <Badge tone={l.status === 'open' ? 'green' : ''}>
                      {l.status === 'open'
                        ? 'En curso'
                        : l.status === 'closed'
                          ? 'Cerrado'
                          : 'Cancelado'}
                    </Badge>
                  </div>
                  <h2>{l.name}</h2>
                  <p>{dateTime(l.created_at)}</p>
                  <div className="live-card-total">
                    <div>
                      <strong>{money(sales.reduce((n, s) => n + saleTotal(data, s.id), 0))}</strong>
                      <small>
                        {sales.length} ventas {l.status === 'open' ? '· sin descontar stock' : ''}
                      </small>
                    </div>
                    <ArrowRight size={19} />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <Empty title="Dale inicio a tu próximo Live">
            Crea una transmisión para registrar las ventas de tu equipo.
          </Empty>
        )}
      </section>
      {create && (
        <Modal title="Preparemos un nuevo Live" onClose={() => setCreate(false)}>
          <AsyncForm
            submit="Crear y abrir Live"
            onCancel={() => setCreate(false)}
            onSubmit={async (form) => {
              await run(() => rpc('create_live', { p_name: form.get('name') }))
              setCreate(false)
            }}
          >
            <label>
              Nombre de la transmisión
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Ej. Miércoles de pequeños pasos"
              />
            </label>
            <p className="tiny">
              Las ventas no reservan ni descuentan stock hasta que cierres el Live. Todo el equipo
              activo puede colaborar.
            </p>
          </AsyncForm>
        </Modal>
      )}
    </>
  )
}
