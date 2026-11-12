import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useData } from '../data/DataContext'
import { businessDate, dateTime, downloadCSV } from '../lib/domain'
import { Badge, Empty, PageHeader } from '../components/ui'

const kinds = { production: 'Producción', adjustment: 'Ajuste', sale: 'Venta Live' }
export function Movements() {
  const { data } = useData()
  const [kind, setKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(businessDate())
  const [page, setPage] = useState(1)
  if (!data) return null
  const rows = data.movements
    .filter(
      (m) =>
        (!kind || m.kind === kind) &&
        (!from || businessDate(m.created_at) >= from) &&
        (!to || businessDate(m.created_at) <= to),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const pages = Math.max(1, Math.ceil(rows.length / 30))
  const current = Math.min(page, pages)
  return (
    <>
      <PageHeader
        eyebrow="TRAZABILIDAD"
        title="La historia de cada par"
        description="Ingresos, ajustes y ventas. Un historial que cuida tu inventario."
        action={
          <button
            className="button secondary"
            onClick={() =>
              downloadCSV('movimientos.csv', [
                ['Fecha', 'Código', 'Tipo', 'Cantidad', 'Saldo', 'Motivo'],
                ...rows.map((m) => [
                  dateTime(m.created_at),
                  data.variants.find((v) => v.id === m.variant_id)?.barcode ?? '',
                  kinds[m.kind],
                  m.quantity,
                  m.balance_after,
                  m.reason,
                ]),
              ])
            }
          >
            <Download size={16} /> Exportar
          </button>
        }
      />
      <section className="panel">
        <div className="filters">
          <label>
            Tipo
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos los movimientos</option>
              {Object.entries(kinds).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <Link to="/inventario" className="text-link">
            Registrar producción en inventario →
          </Link>
        </div>
        {rows.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Movimiento</th>
                    <th>Pares</th>
                    <th>Saldo</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * 30, current * 30).map((m) => {
                    const v = data.variants.find((v) => v.id === m.variant_id)
                    return (
                      <tr key={m.id}>
                        <td>{dateTime(m.created_at)}</td>
                        <td>
                          <strong>{data.products.find((p) => p.id === v?.product_id)?.name}</strong>
                          <small>
                            {v?.color} · Talla {v?.size}
                          </small>
                        </td>
                        <td>
                          <Badge tone={m.quantity > 0 ? 'green' : ''}>{kinds[m.kind]}</Badge>
                        </td>
                        <td className={m.quantity > 0 ? 'positive strong' : 'strong'}>
                          {m.quantity > 0 ? '+' : ''}
                          {m.quantity}
                        </td>
                        <td>{m.balance_after}</td>
                        <td>
                          {m.live_id ? (
                            <Link to={`/lives/${m.live_id}`} className="text-link">
                              {m.reason}
                            </Link>
                          ) : (
                            m.reason
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>{rows.length} movimientos</span>
              <button
                className="button secondary small"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                Anterior
              </button>
              <span>
                {current} / {pages}
              </span>
              <button
                className="button secondary small"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
              >
                Siguiente
              </button>
            </div>
          </>
        ) : (
          <Empty title="El historial comienza con tu primer movimiento">
            Registra una producción o cierra un Live para verlo aquí.
          </Empty>
        )}
      </section>
    </>
  )
}
