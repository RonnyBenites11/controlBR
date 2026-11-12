import { useRef, useState } from 'react'
import { Camera, Plus, ScanBarcode, Search, Trash2 } from 'lucide-react'
import { useData } from '../data/DataContext'
import { money, saleSchema, total, validateCart } from '../lib/domain'
import { rpc } from '../lib/supabase'
import type { CartItem, Variant } from '../lib/types'
import { payments } from '../lib/types'
import { Alert, AsyncForm, Modal } from './ui'
import { CameraScanner } from './Scanner'

export function SaleForm({ liveId, onClose }: { liveId: string; onClose: () => void }) {
  const { data, run } = useData()
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [camera, setCamera] = useState(false)
  const [scanError, setScanError] = useState('')
  const requestId = useRef(crypto.randomUUID())
  if (!data) return null
  const activeVariants = data.variants.filter((v) =>
    data.products.some((p) => p.id === v.product_id && p.active),
  )
  const q = query.trim().toLowerCase()
  const matches = q
    ? activeVariants
        .filter((v) => {
          const p = data.products.find((p) => p.id === v.product_id)!
          return `${p.name} ${p.sku} ${v.color} ${v.size} ${v.barcode}`.toLowerCase().includes(q)
        })
        .slice(0, 8)
    : []
  function add(variant: Variant) {
    const product = data!.products.find((p) => p.id === variant.product_id)!
    setCart((previous) =>
      previous.some((i) => i.variant_id === variant.id)
        ? previous.map((i) =>
            i.variant_id === variant.id ? { ...i, quantity: Math.min(10000, i.quantity + 1) } : i,
          )
        : [
            ...previous,
            { variant_id: variant.id, quantity: 1, unit_price: Number(product.base_price) },
          ],
    )
    setQuery('')
    setScanError('')
  }
  function scan(code: string) {
    const variant = activeVariants.find((v) => v.barcode === code.trim())
    if (variant) add(variant)
    else {
      setQuery(code)
      setScanError(`No se encontró el código ${code}. Revisa el inventario.`)
    }
    setCamera(false)
  }
  return (
    <>
      {
        <Modal title="Registrar una venta" onClose={onClose} wide>
          <AsyncForm
            submit="Guardar venta"
            onCancel={onClose}
            onSubmit={async (form) => {
              validateCart(cart)
              const sale = saleSchema.parse({
                buyer: form.get('buyer'),
                payment: form.get('payment'),
                notes: form.get('notes'),
                items: cart,
              })
              await run(() =>
                rpc('create_sale', {
                  p_live_id: liveId,
                  p_buyer: sale.buyer,
                  p_payment: sale.payment,
                  p_notes: sale.notes,
                  p_items: sale.items,
                  p_request_id: requestId.current,
                }),
              )
              onClose()
            }}
          >
            <div className="form-grid">
              <label>
                Cliente o usuario de TikTok
                <input
                  name="buyer"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Ej. @maria_pasos"
                />
              </label>
              <label>
                Medio de pago
                <select name="payment">
                  {Object.entries(payments).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="sale-search">
              <label htmlFor="scan-search">Agrega los pares de esta venta</label>
              <div className="search-field">
                <ScanBarcode size={19} />
                <input
                  id="scan-search"
                  placeholder="Escanea un código o busca el modelo…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      scan(query)
                    }
                  }}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Abrir cámara"
                  onClick={() => setCamera(true)}
                >
                  <Camera size={19} />
                </button>
              </div>
              {scanError && <Alert>{scanError}</Alert>}
              {matches.length > 0 && (
                <div className="search-results">
                  {matches.map((v) => (
                    <button type="button" key={v.id} onClick={() => add(v)}>
                      <Search size={15} />
                      <span>
                        <strong>{data.products.find((p) => p.id === v.product_id)?.name}</strong>
                        <small>
                          {v.color} · Talla {v.size} · {v.stock} disponibles
                        </small>
                      </span>
                      <Plus size={17} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {cart.length ? (
              <div className="cart-items">
                {cart.map((item) => {
                  const v = data.variants.find((v) => v.id === item.variant_id)!
                  const p = data.products.find((p) => p.id === v.product_id)!
                  return (
                    <div className="cart-item" key={item.variant_id}>
                      <div className="cart-product">
                        <strong>{p.name}</strong>
                        <small>
                          {v.color} · Talla {v.size}
                        </small>
                        {item.quantity > v.stock && (
                          <span className="stock-warning">
                            Supera el stock actual ({v.stock}). Requiere reposición antes del
                            cierre.
                          </span>
                        )}
                      </div>
                      <label>
                        Pares
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          step={1}
                          required
                          value={item.quantity || ''}
                          onChange={(e) =>
                            setCart(
                              cart.map((i) =>
                                i.variant_id === item.variant_id
                                  ? { ...i, quantity: Number(e.target.value) }
                                  : i,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Precio S/
                        <input
                          type="number"
                          min="0.01"
                          max={1000000}
                          step="0.01"
                          required
                          value={item.unit_price || ''}
                          onChange={(e) =>
                            setCart(
                              cart.map((i) =>
                                i.variant_id === item.variant_id
                                  ? { ...i, unit_price: Number(e.target.value) }
                                  : i,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Quitar ${p.name} talla ${v.size}`}
                        onClick={() =>
                          setCart(cart.filter((i) => i.variant_id !== item.variant_id))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="cart-empty">
                Busca o escanea una etiqueta para agregar el primer par.
              </div>
            )}
            <div className="sale-total">
              <span>Total de la venta</span>
              <strong>{money(total(cart))}</strong>
            </div>
            <label>
              Notas (opcional)
              <textarea
                name="notes"
                maxLength={500}
                placeholder="Entrega, referencia o una indicación especial…"
              />
            </label>
            <p className="tiny">
              El precio de esta venta se conserva en el historial. Puedes adjuntar el comprobante
              después de guardarla.
            </p>
          </AsyncForm>
        </Modal>
      }
      {camera && <CameraScanner onScan={scan} onClose={() => setCamera(false)} />}
    </>
  )
}
