import { useState } from 'react'
import { Download, FileImage } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { businessDate, dateTime, downloadCSV, errorMessage, money, total } from '../lib/domain'
import { receiptURL } from '../lib/receipts'
import { payments } from '../lib/types'
import { Alert, Badge, Empty, Modal, PageHeader } from '../components/ui'

export function Reports() {
  const { data } = useData()
  const [from, setFrom] = useState(() => businessDate().slice(0, 7) + '-01')
  const [to, setTo] = useState(businessDate())
  const [liveId, setLiveId] = useState('')
  const [status, setStatus] = useState('closed')
  const [payment, setPayment] = useState('')
  const [receipt, setReceipt] = useState('')
  const [tab, setTab] = useState('diario')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  if (!data) return null
  const eligible = new Set(
    data.lives
      .filter(
        (l) =>
          l.status !== 'cancelled' &&
          (!liveId || l.id === liveId) &&
          (status === 'all' || l.status === status),
      )
      .map((l) => l.id),
  )
  const sales = data.sales.filter(
    (s) =>
      !s.cancelled_at &&
      eligible.has(s.live_id) &&
      (!from || businessDate(s.created_at) >= from) &&
      (!to || businessDate(s.created_at) <= to) &&
      (!payment || s.payment_method === payment) &&
      (!receipt || (data.receipts.some((r) => r.sale_id === s.id) ? 'yes' : 'no') === receipt),
  )
  const ids = new Set(sales.map((s) => s.id))
  const items = data.items.filter((i) => ids.has(i.sale_id))
  const grouped = new Map<string, { label: string; quantity: number; amount: number }>()
  items.forEach((item) => {
    const sale = sales.find((s) => s.id === item.sale_id)!
    let key: string
    let label: string
    switch (tab) {
      case 'modelo':
        key = item.product_name
        label = item.product_name
        break
      case 'talla':
        key = String(item.size)
        label = `Talla ${item.size}`
        break
      case 'pago':
        key = sale.payment_method
        label = payments[sale.payment_method]
        break
      case 'live':
        key = sale.live_id
        label = data.lives.find((l) => l.id === key)?.name ?? key
        break
      default:
        key = businessDate(sale.created_at)
        label = key
    }
    const previous = grouped.get(key) ?? { label, quantity: 0, amount: 0 }
    grouped.set(key, {
      label,
      quantity: previous.quantity + item.quantity,
      amount: previous.amount + Math.round(Number(item.unit_price) * 100) * item.quantity,
    })
  })
  const groups = [...grouped.entries()].sort(([a], [b]) =>
    tab === 'diario' ? b.localeCompare(a) : a.localeCompare(b, 'es', { numeric: true }),
  )
  const exportRows: (string | number)[][] = [
    [
      'Fecha venta (Perú)',
      'Live',
      'Estado Live',
      'Cliente',
      'Medio de pago',
      'Modelo histórico',
      'Código',
      'Color',
      'Talla',
      'Cantidad',
      'Precio histórico',
      'Subtotal',
      'Comprobantes',
    ],
  ]
  items.forEach((i) => {
    const s = sales.find((s) => s.id === i.sale_id)!
    const l = data.lives.find((l) => l.id === s.live_id)!
    exportRows.push([
      dateTime(s.created_at),
      l.name,
      l.status === 'closed' ? 'Cerrado' : 'En curso',
      s.buyer,
      payments[s.payment_method],
      i.product_name,
      i.barcode,
      i.color,
      i.size,
      i.quantity,
      i.unit_price,
      total([i]),
      data.receipts.filter((r) => r.sale_id === s.id).length,
    ])
  })
  return (
    <>
      <PageHeader
        eyebrow="REPORTES"
        title="Mira cómo crece tu negocio"
        description="Ventas, tallas y medios de pago. Información clara para decidir mejor."
        action={
          <button
            className="button secondary"
            onClick={() => downloadCSV(`reporte-${from}-${to}.csv`, exportRows)}
          >
            <Download size={17} /> Exportar detalle CSV
          </button>
        }
      />
      <section className="panel">
        <div className="filters report-filters">
          <label>
            Desde
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            Live
            <select value={liveId} onChange={(e) => setLiveId(e.target.value)}>
              <option value="">Todos los Lives</option>
              {data.lives.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="closed">Solo cerrados</option>
              <option value="open">Solo en curso</option>
              <option value="all">Cerrados y en curso</option>
            </select>
          </label>
          <label>
            Pago
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(payments).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Comprobante
            <select value={receipt} onChange={(e) => setReceipt(e.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Con comprobante</option>
              <option value="no">Sin comprobante</option>
            </select>
          </label>
        </div>
        <p className="tiny">
          Fechas de registro de venta en Perú (UTC−5). Solo ventas activas. Los Lives abiertos
          tienen stock pendiente de descontar.
        </p>
      </section>
      <div className="live-stats">
        <div>
          <span>Venta total filtrada</span>
          <strong>{money(total(items))}</strong>
        </div>
        <div>
          <span>Ventas</span>
          <strong>{sales.length}</strong>
        </div>
        <div>
          <span>Pares</span>
          <strong>{items.reduce((n, i) => n + i.quantity, 0)}</strong>
        </div>
        <div>
          <span>Ticket promedio</span>
          <strong>{money(sales.length ? total(items) / sales.length : 0)}</strong>
        </div>
      </div>
      <section className="panel">
        <div className="tabs report-tabs">
          {[
            ['diario', 'Por día'],
            ['live', 'Por Live'],
            ['modelo', 'Por modelo'],
            ['talla', 'Por talla'],
            ['pago', 'Medios de pago'],
            ['comprobantes', 'Comprobantes'],
          ].map(([key, label]) => (
            <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
        {error && <Alert>{error}</Alert>}
        {tab === 'comprobantes' ? (
          sales.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Live</th>
                    <th>Pago</th>
                    <th>Comprobantes</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td>{s.buyer}</td>
                      <td>
                        <Link className="text-link" to={`/lives/${s.live_id}`}>
                          {data.lives.find((l) => l.id === s.live_id)?.name}
                        </Link>
                      </td>
                      <td>{payments[s.payment_method]}</td>
                      <td>
                        {data.receipts
                          .filter((r) => r.sale_id === s.id)
                          .map((r, index) => (
                            <button
                              key={r.id}
                              className="text-button"
                              onClick={async () => {
                                try {
                                  setPreview(await receiptURL(r.storage_path))
                                  setError('')
                                } catch (cause) {
                                  setError(errorMessage(cause))
                                }
                              }}
                            >
                              <FileImage size={15} /> Ver {index + 1}
                            </button>
                          ))}
                        {!data.receipts.some((r) => r.sale_id === s.id) && (
                          <Badge tone="amber">Sin adjunto</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No hay ventas en este período" />
          )
        ) : groups.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    {tab === 'diario'
                      ? 'Fecha'
                      : tab === 'live'
                        ? 'Live'
                        : tab === 'modelo'
                          ? 'Modelo'
                          : tab === 'talla'
                            ? 'Talla'
                            : 'Medio de pago'}
                  </th>
                  <th>Pares vendidos</th>
                  <th>Participación</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([key, group]) => (
                  <tr key={key}>
                    <td className="strong">
                      {tab === 'live' ? (
                        <Link className="text-link" to={`/lives/${key}`}>
                          {group.label}
                        </Link>
                      ) : (
                        group.label
                      )}
                    </td>
                    <td>{group.quantity}</td>
                    <td>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${total(items) ? (group.amount / 100 / total(items)) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="strong">{money(group.amount / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Aún no hay resultados para estos filtros">
            Prueba con otro período o incluye los Lives en curso.
          </Empty>
        )}
      </section>
      {preview && (
        <Modal title="Comprobante privado" onClose={() => setPreview('')}>
          <img className="receipt-preview" src={preview} alt="Comprobante de pago" />
          <p className="tiny">Enlace válido durante 2 minutos.</p>
        </Modal>
      )}
    </>
  )
}
