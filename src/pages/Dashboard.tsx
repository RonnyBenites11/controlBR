import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  Plus,
  Radio,
  ScanBarcode,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useData } from '../data/DataContext'
import { activeSales, businessDate, dateTime, integer, money, saleTotal } from '../lib/domain'
import { Badge, Empty, PageHeader } from '../components/ui'

export function Dashboard() {
  const { data } = useData()
  const { profile } = useAuth()
  if (!data) return null
  const today = businessDate()
  const completedIds = new Set(data.lives.filter((l) => l.status === 'closed').map((l) => l.id))
  const todaySales = activeSales(data).filter(
    (s) => completedIds.has(s.live_id) && businessDate(s.created_at) === today,
  )
  const amount = todaySales.reduce((n, s) => n + saleTotal(data, s.id), 0)
  const todaySaleIds = new Set(todaySales.map((s) => s.id))
  const pairs = data.items
    .filter((i) => todaySaleIds.has(i.sale_id))
    .reduce((n, i) => n + i.quantity, 0)
  const stock = data.variants.reduce((n, v) => n + v.stock, 0)
  const low = data.variants.filter(
    (v) => v.stock <= v.minimum_stock && data.products.find((p) => p.id === v.product_id)?.active,
  )
  const open = data.lives.filter((l) => l.status === 'open')
  const recent = [...data.lives]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4)
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(`${today}T12:00:00-05:00`)
    day.setUTCDate(day.getUTCDate() - 6 + i)
    const key = businessDate(day)
    const value = activeSales(data)
      .filter((s) => completedIds.has(s.live_id) && businessDate(s.created_at) === key)
      .reduce((sum, s) => sum + saleTotal(data, s.id), 0)
    return {
      key,
      day: new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'America/Lima' }).format(
        day,
      ),
      value,
    }
  })
  const maximum = Math.max(...week.map((w) => w.value), 1)
  return (
    <>
      <PageHeader
        title={`Hola, ${profile?.display_name.split(' ')[0]} ☀`}
        description="Un vistazo a tu negocio. Todo listo para dar el siguiente paso."
        action={
          <Link className="button" to="/lives">
            <Plus size={18} /> Nuevo Live
          </Link>
        }
      />
      <section className="welcome-banner">
        <div>
          <span className="pill">
            <Sparkles size={13} /> CADA PAR CUENTA
          </span>
          <h2>
            Pequeños pasos,
            <br />
            <em>grandes oportunidades.</em>
          </h2>
          <p>
            Tu inventario al día. Tus ventas bajo control.
            <br />
            Más tiempo para hacer crecer lo que amas.
          </p>
          <Link to="/inventario" className="banner-link">
            Ver mi inventario <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card back">
            <span>HECHO CON AMOR</span>
            <span className="shoe">♧</span>
            <small>BABY RONNYS</small>
          </div>
          <div className="art-card front">
            <PackageCheck size={40} strokeWidth={1.3} />
            <strong>Todo en su lugar</strong>
            <span>Listos para el próximo Live</span>
            <div className="art-checks">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="art-star">✳</span>
        </div>
      </section>
      <section className="stats-grid" aria-label="Indicadores">
        <Stat
          icon={<CircleDollarSign size={21} />}
          label="Ventas de hoy"
          value={money(amount)}
          detail="Ventas de Lives cerrados"
          tone="green"
        />
        <Stat
          icon={<PackageCheck size={21} />}
          label="Pares vendidos hoy"
          value={integer(pairs)}
          detail={`${todaySales.length} ventas registradas`}
          tone="peach"
        />
        <Stat
          icon={<Boxes size={21} />}
          label="Pares en inventario"
          value={integer(stock)}
          detail={`${data.variants.length} variantes de calzado`}
          tone="blue"
        />
        <Stat
          icon={<Radio size={21} />}
          label="Lives en curso"
          value={integer(open.length)}
          detail="Stock pendiente de descontar"
          tone="purple"
        />
      </section>
      <div className="dashboard-grid">
        <section className="panel sales-chart">
          <div className="section-title">
            <div>
              <h2>Así van tus ventas</h2>
              <p>Últimos 7 días · Lives cerrados</p>
            </div>
            <span className="chart-icon">
              <TrendingUp size={19} />
            </span>
          </div>
          <div className="chart-total">
            {money(week.reduce((n, w) => n + w.value, 0))}
            <span>en esta semana</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={week.map((w) => `${w.key}: ${money(w.value)}`).join('; ')}
          >
            {week.map((w) => (
              <div key={w.key} className={`bar-column ${w.key === today ? 'today' : ''}`}>
                <span className="bar-value">{w.value > 0 ? money(w.value) : '—'}</span>
                <div className="bar-track">
                  <div
                    className="bar"
                    style={{ height: `${Math.max((w.value / maximum) * 100, 2)}%` }}
                  />
                </div>
                <span className="bar-label">{w.day}</span>
              </div>
            ))}
          </div>
          <div className="chart-caption">
            <span className="legend-dot" /> Venta según fecha de registro · hora de Perú
          </div>
        </section>
        <section className="panel low-stock">
          <div className="section-title">
            <div>
              <h2>Un poquito de atención</h2>
              <p>Variantes que necesitan reposición</p>
            </div>
            <span className="count-bubble">{low.length}</span>
          </div>
          {low.length ? (
            <div className="stock-list">
              {low.slice(0, 4).map((v) => (
                <Link to={`/inventario?q=${v.barcode}`} className="stock-list-row" key={v.id}>
                  <div className="product-swatch">
                    <Boxes size={22} />
                  </div>
                  <div>
                    <strong>{data.products.find((p) => p.id === v.product_id)?.name}</strong>
                    <small>
                      {v.color} <span>·</span> Talla {v.size}
                    </small>
                  </div>
                  <Badge tone={v.stock === 0 ? 'red' : 'amber'}>{v.stock} pares</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Todo bajo control">No hay alertas de stock por ahora.</Empty>
          )}
          <Link className="panel-link" to="/inventario?bajo=1">
            Revisar inventario <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="panel recent-lives">
        <div className="section-title">
          <div>
            <h2>Tus últimos Lives</h2>
            <p>Cada transmisión, una nueva oportunidad</p>
          </div>
          <Link to="/lives" className="text-link">
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>
        {recent.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Live</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Ventas</th>
                  <th>Total</th>
                  <th>
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((l) => {
                  const sales = activeSales(data, l.id)
                  return (
                    <tr key={l.id}>
                      <td>
                        <Link to={`/lives/${l.id}`} className="table-name">
                          <span className={`live-icon ${l.status}`}>
                            <Radio size={18} />
                          </span>
                          {l.name}
                        </Link>
                      </td>
                      <td>{dateTime(l.created_at)}</td>
                      <td>
                        <Badge tone={l.status === 'open' ? 'green' : ''}>
                          {l.status === 'open'
                            ? 'En curso'
                            : l.status === 'closed'
                              ? 'Cerrado'
                              : 'Cancelado'}
                        </Badge>
                      </td>
                      <td>{sales.length}</td>
                      <td className="strong">
                        {money(sales.reduce((n, s) => n + saleTotal(data, s.id), 0))}
                      </td>
                      <td>
                        <Link
                          className="icon-button"
                          aria-label={`Abrir ${l.name}`}
                          to={`/lives/${l.id}`}
                        >
                          <ArrowDownRight size={19} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Tu primer Live empieza aquí">
            Crea una transmisión y registra tus ventas en un solo lugar.
          </Empty>
        )}
      </section>
      <Link className="quick-tip" to="/etiquetas">
        <span>
          <ScanBarcode size={23} />
        </span>
        <div>
          <strong>Menos búsquedas, más ventas.</strong>
          <p>Imprime tus etiquetas y encuentra cada par con un escaneo.</p>
        </div>
        <ArrowRight size={19} />
      </Link>
    </>
  )
}
function Stat({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}
