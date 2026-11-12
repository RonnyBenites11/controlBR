import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boxes, Camera, Download, Pencil, Plus, Search } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { useData } from '../data/DataContext'
import { rpc } from '../lib/supabase'
import { downloadCSV, money, priceSchema } from '../lib/domain'
import type { Product, Variant } from '../lib/types'
import { Alert, AsyncForm, Badge, Empty, Modal, PageHeader } from '../components/ui'
import { CameraScanner } from '../components/Scanner'

export function Inventory() {
  const { data, run } = useData()
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [model, setModel] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [archived, setArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<'product' | 'variant' | 'stock' | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selected, setSelected] = useState<Variant | null>(null)
  const [camera, setCamera] = useState(false)
  const [stockRequest, setStockRequest] = useState(() => crypto.randomUUID())
  const query = params.get('q') ?? ''
  const low = params.get('bajo') === '1'
  const admin = profile?.role === 'admin'
  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLocaleLowerCase('es')
    return data.variants
      .filter((v) => {
        const p = data.products.find((p) => p.id === v.product_id)
        return (
          p &&
          (archived || p.active) &&
          (!model || v.product_id === model) &&
          (!size || v.size === Number(size)) &&
          (!color || v.color === color) &&
          (!low || v.stock <= v.minimum_stock) &&
          (!q ||
            `${p.name} ${p.sku} ${v.color} ${v.size} ${v.barcode}`
              .toLocaleLowerCase('es')
              .includes(q))
        )
      })
      .sort((a, b) => a.barcode.localeCompare(b.barcode))
  }, [data, query, model, size, color, low, archived])
  if (!data) return null
  function close() {
    setModal(null)
    setEditing(null)
    setSelected(null)
  }
  function search(q: string) {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next, { replace: true })
    setPage(1)
  }
  const pages = Math.max(1, Math.ceil(filtered.length / 25))
  const currentPage = Math.min(page, pages)
  return (
    <>
      <PageHeader
        title="Cada par, en su lugar"
        eyebrow="INVENTARIO"
        description="Modelos, colores y tallas. Encuentra justo lo que necesitas."
        action={
          admin && (
            <div className="button-row">
              <button className="button secondary" onClick={() => setModal('variant')}>
                <Plus size={17} /> Variante
              </button>
              <button className="button" onClick={() => setModal('product')}>
                <Plus size={17} /> Nuevo modelo
              </button>
            </div>
          )
        }
      />
      <div className="inventory-summary">
        <div>
          <span className="stat-icon green">
            <Boxes size={22} />
          </span>
          <div>
            <strong>{data.products.filter((p) => p.active).length}</strong>
            <span>modelos activos</span>
          </div>
        </div>
        <div>
          <strong>{data.variants.reduce((n, v) => n + v.stock, 0)}</strong>
          <span>pares disponibles</span>
        </div>
        <div>
          <strong>{data.variants.filter((v) => v.stock <= v.minimum_stock).length}</strong>
          <span>variantes con stock bajo</span>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar inventario o escanear código"
              placeholder="Modelo, color, talla o código de barras…"
              value={query}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
            />
            <button
              className="icon-button"
              aria-label="Escanear con cámara"
              onClick={() => setCamera(true)}
            >
              <Camera size={19} />
            </button>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              downloadCSV('inventario-baby-ronnys.csv', [
                ['Código', 'Modelo', 'SKU', 'Color', 'Talla', 'Stock', 'Mínimo', 'Precio'],
                ...filtered.map((v) => {
                  const p = data.products.find((p) => p.id === v.product_id)!
                  return [
                    v.barcode,
                    p.name,
                    p.sku,
                    v.color,
                    v.size,
                    v.stock,
                    v.minimum_stock,
                    p.base_price,
                  ]
                }),
              ])
            }
          >
            <Download size={16} /> Exportar
          </button>
        </div>
        <div className="filters">
          <select
            aria-label="Filtrar modelo"
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los modelos</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.active ? ' (archivado)' : ''}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los colores</option>
            {[...new Set(data.variants.map((v) => v.color))].sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar talla"
            value={size}
            onChange={(e) => {
              setSize(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas las tallas</option>
            {[...new Set(data.variants.map((v) => v.size))]
              .sort((a, b) => a - b)
              .map((s) => (
                <option key={s}>{s}</option>
              ))}
          </select>
          <label className="check-label">
            <input
              type="checkbox"
              checked={low}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                if (e.target.checked) next.set('bajo', '1')
                else next.delete('bajo')
                setParams(next)
                setPage(1)
              }}
            />{' '}
            Stock bajo
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />{' '}
            Incluir archivados
          </label>
        </div>
        {filtered.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Modelo / código</th>
                    <th>Color</th>
                    <th>Talla</th>
                    <th>Precio base</th>
                    <th>Disponible</th>
                    {admin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((currentPage - 1) * 25, currentPage * 25).map((v) => {
                    const p = data.products.find((p) => p.id === v.product_id)!
                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="product-cell">
                            <span className="product-swatch">
                              <Boxes size={22} />
                            </span>
                            <div>
                              <strong>
                                {p.name} {!p.active && <Badge>Archivado</Badge>}
                              </strong>
                              <small className="monospace">
                                {v.barcode} · {p.sku}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{v.color}</td>
                        <td>
                          <span className="size-chip">{v.size}</span>
                        </td>
                        <td>{money(p.base_price)}</td>
                        <td>
                          <Badge
                            tone={
                              v.stock === 0 ? 'red' : v.stock <= v.minimum_stock ? 'amber' : 'green'
                            }
                          >
                            {v.stock} pares
                          </Badge>
                        </td>
                        {admin && (
                          <td>
                            <div className="button-row">
                              <button
                                className="text-button"
                                onClick={() => {
                                  setSelected(v)
                                  setModal('stock')
                                }}
                              >
                                + Stock
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Editar modelo ${p.name}`}
                                onClick={() => {
                                  setEditing(p)
                                  setModal('product')
                                }}
                              >
                                <Pencil size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>{filtered.length} variantes</span>
              <button
                className="button secondary small"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </button>
              <span>
                {currentPage} / {pages}
              </span>
              <button
                className="button secondary small"
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente
              </button>
            </div>
          </>
        ) : (
          <Empty title="Aún no hay variantes aquí">
            Crea un modelo y agrega sus combinaciones de color y talla, o ajusta los filtros.
          </Empty>
        )}
      </section>
      {admin && data.products.some((p) => !data.variants.some((v) => v.product_id === p.id)) && (
        <section className="panel orphan-products">
          <h2>Modelos sin variantes</h2>
          <p className="muted">Agrega color y talla para empezar a registrar stock.</p>
          {data.products
            .filter((p) => !data.variants.some((v) => v.product_id === p.id))
            .map((p) => (
              <div className="simple-row" key={p.id}>
                <strong>{p.name}</strong>
                <span>{p.sku}</span>
                <button
                  className="text-button"
                  onClick={() => {
                    setEditing(p)
                    setModal('product')
                  }}
                >
                  Editar modelo
                </button>
                <button className="text-button" onClick={() => setModal('variant')}>
                  Agregar variante
                </button>
              </div>
            ))}
        </section>
      )}
      {modal === 'product' && (
        <Modal title={editing ? 'Editar modelo' : 'Un nuevo modelo'} onClose={close}>
          <AsyncForm
            onCancel={close}
            onSubmit={async (form) => {
              const price = priceSchema.parse(form.get('price'))
              await run(() =>
                rpc('save_product', {
                  p_id: editing?.id ?? null,
                  p_sku: String(form.get('sku')).trim(),
                  p_name: String(form.get('name')).trim(),
                  p_price: price,
                  p_active: form.get('active') === 'on',
                }),
              )
              close()
            }}
          >
            <label>
              Nombre del modelo
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={editing?.name}
                placeholder="Ej. Luna · primeros pasos"
              />
            </label>
            <div className="form-grid">
              <label>
                Código del modelo
                <input
                  name="sku"
                  required
                  pattern="[A-Za-z0-9-]{2,30}"
                  maxLength={30}
                  defaultValue={editing?.sku}
                  placeholder="BR-LUNA"
                />
              </label>
              <label>
                Precio base (S/)
                <input
                  name="price"
                  type="number"
                  required
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  defaultValue={editing?.base_price}
                />
              </label>
            </div>
            <label className="check-label">
              <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} />{' '}
              Modelo activo
            </label>
            <p className="tiny">
              El precio base sugiere el valor de nuevas ventas. Los precios anteriores se conservan.
            </p>
          </AsyncForm>
        </Modal>
      )}
      {modal === 'variant' && (
        <Modal title="Agregar color y talla" onClose={close}>
          <AsyncForm
            onCancel={close}
            onSubmit={async (form) => {
              const size = z.coerce.number().int().min(10).max(45).parse(form.get('size'))
              await run(() =>
                rpc('create_variant', {
                  p_product_id: form.get('product'),
                  p_color: form.get('color'),
                  p_size: size,
                  p_minimum: Number(form.get('minimum')),
                }),
              )
              close()
            }}
          >
            <label>
              Modelo
              <select name="product" required defaultValue={model}>
                <option value="" disabled>
                  Selecciona un modelo
                </option>
                {data.products
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Color
                <input name="color" required minLength={2} maxLength={40} placeholder="Ej. Crema" />
              </label>
              <label>
                Talla
                <input name="size" type="number" required min={10} max={45} step={1} />
              </label>
            </div>
            <label>
              Alertar cuando queden estos pares
              <input
                name="minimum"
                type="number"
                required
                min={0}
                max={10000}
                step={1}
                defaultValue={3}
              />
            </label>
            <p className="tiny">
              El código de barras se genera automáticamente. Registra producción para ingresar
              stock.
            </p>
          </AsyncForm>
        </Modal>
      )}
      {modal === 'stock' && selected && (
        <Modal title="Registrar movimiento de stock" onClose={close}>
          <p className="muted">
            {data.products.find((p) => p.id === selected.product_id)?.name} · {selected.color} ·
            Talla {selected.size}
          </p>
          <AsyncForm
            onCancel={close}
            onSubmit={async (form) => {
              const quantity = z.coerce
                .number()
                .int()
                .min(-100000)
                .max(100000)
                .refine((n) => n !== 0, 'Ingresa una cantidad distinta de cero.')
                .parse(form.get('quantity'))
              await run(() =>
                rpc('change_stock', {
                  p_variant_id: selected.id,
                  p_kind: form.get('kind'),
                  p_quantity: quantity,
                  p_reason: form.get('reason'),
                  p_request_id: stockRequest,
                }),
              )
              setStockRequest(crypto.randomUUID())
              close()
            }}
          >
            <label>
              Tipo
              <select name="kind">
                <option value="production">Ingreso de producción</option>
                <option value="adjustment">Ajuste de inventario</option>
              </select>
            </label>
            <label>
              Cantidad de pares
              <input name="quantity" type="number" min={-100000} max={100000} step={1} required />
            </label>
            <p className="tiny">
              Producción: cantidad positiva. Ajuste: positiva para agregar, negativa para descontar.
            </p>
            <label>
              Motivo
              <textarea
                name="reason"
                minLength={3}
                maxLength={300}
                required
                placeholder="Ej. Producción terminada, lote 012"
              />
            </label>
            <Alert success>
              Stock actual: {selected.stock} pares. Cada cambio queda registrado en el historial.
            </Alert>
          </AsyncForm>
        </Modal>
      )}
      {camera && (
        <CameraScanner
          onClose={() => setCamera(false)}
          onScan={(code) => {
            search(code)
            setCamera(false)
          }}
        />
      )}
    </>
  )
}
