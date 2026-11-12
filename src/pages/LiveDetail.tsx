import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileImage,
  Plus,
  ReceiptText,
  Upload,
  XCircle,
} from 'lucide-react'
import { useData } from '../data/DataContext'
import { useAuth } from '../auth/AuthContext'
import { activeSales, dateTime, downloadCSV, errorMessage, money, saleTotal } from '../lib/domain'
import { rpc } from '../lib/supabase'
import { receiptURL, uploadReceipt } from '../lib/receipts'
import type { Sale } from '../lib/types'
import { payments } from '../lib/types'
import { Alert, AsyncForm, Badge, Empty, Modal, PageHeader } from '../components/ui'
import { SaleForm } from '../components/SaleForm'

export function LiveDetail() {
  const { id } = useParams()
  const { data, run } = useData()
  const { profile } = useAuth()
  const [modal, setModal] = useState<'sale' | 'close' | 'cancel-live' | null>(null)
  const [cancel, setCancel] = useState<Sale | null>(null)
  const [upload, setUpload] = useState<Sale | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [buyerSearch, setBuyerSearch] = useState('')
  const [page, setPage] = useState(1)
  if (!data) return null
  const live = data.lives.find((l) => l.id === id)
  if (!live)
    return (
      <Empty title="No encontramos este Live">
        <Link to="/lives">Volver a los Lives</Link>
      </Empty>
    )
  const sales = activeSales(data, live.id)
  const saleIds = new Set(sales.map((s) => s.id))
  const items = data.items.filter((i) => saleIds.has(i.sale_id))
  const pairs = items.reduce((n, i) => n + i.quantity, 0)
  const total = sales.reduce((n, s) => n + saleTotal(data, s.id), 0)
  const missingReceipts = sales.filter(
    (s) =>
      ['yape', 'plin', 'transferencia'].includes(s.payment_method) &&
      !data.receipts.some((r) => r.sale_id === s.id),
  ).length
  const demand = new Map<string, number>()
  items.forEach((i) => demand.set(i.variant_id, (demand.get(i.variant_id) ?? 0) + i.quantity))
  const shortages = [...demand].filter(
    ([id, qty]) => (data.variants.find((v) => v.id === id)?.stock ?? 0) < qty,
  )
  const visible = data.sales
    .filter(
      (s) =>
        s.live_id === live.id &&
        (showCancelled || !s.cancelled_at) &&
        s.buyer.toLowerCase().includes(buyerSearch.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const pages = Math.max(1, Math.ceil(visible.length / 25))
  const currentPage = Math.min(page, pages)
  const open = live.status === 'open'
  return (
    <>
      <Link className="back-link" to="/lives">
        <ArrowLeft size={15} /> Todos los Lives
      </Link>
      <PageHeader
        eyebrow="DETALLE DE TRANSMISIÓN"
        title={live.name}
        description={`${dateTime(live.created_at)}${live.closed_at ? ` · Finalizado: ${dateTime(live.closed_at)}` : ''}`}
        action={
          <div className="button-row">
            <Badge tone={open ? 'green' : ''}>
              {open ? 'En curso' : live.status === 'closed' ? 'Cerrado' : 'Cancelado'}
            </Badge>
            {open && (
              <>
                <button className="button secondary" onClick={() => setModal('close')}>
                  <CheckCircle2 size={17} /> Cerrar Live
                </button>
                <button className="button" onClick={() => setModal('sale')}>
                  <Plus size={17} /> Nueva venta
                </button>
              </>
            )}
          </div>
        }
      />
      {error && <Alert>{error}</Alert>}
      {notice && <Alert success>{notice}</Alert>}
      {open && (
        <div className="info-banner">
          <ReceiptText size={20} />
          <span>
            El stock se descontará al cerrar este Live. Las ventas abiertas no reservan inventario.
          </span>
        </div>
      )}
      <div className="live-stats">
        <div>
          <span>Total {open ? 'registrado' : 'del Live'}</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Ventas activas</span>
          <strong>{sales.length}</strong>
        </div>
        <div>
          <span>Pares vendidos</span>
          <strong>{pairs}</strong>
        </div>
        <div>
          <span>Pagos digitales sin comprobante</span>
          <strong>{missingReceipts}</strong>
        </div>
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>Ventas de la transmisión</h2>
            <p>Precios históricos y comprobantes de cada cliente</p>
          </div>
          <button
            className="button secondary small"
            onClick={() =>
              downloadCSV(`live-${live.id.slice(0, 8)}.csv`, [
                ['Cliente', 'Pago', 'Fecha', 'Estado', 'Total'],
                ...data.sales
                  .filter((s) => s.live_id === live.id)
                  .map((s) => [
                    s.buyer,
                    payments[s.payment_method],
                    dateTime(s.created_at),
                    s.cancelled_at ? 'Anulada' : 'Activa',
                    saleTotal(data, s.id),
                  ]),
              ])
            }
          >
            <Download size={15} /> Exportar
          </button>
        </div>
        <div className="filters">
          <label className="check-label">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />{' '}
            Mostrar anuladas
          </label>
          <input
            aria-label="Buscar cliente"
            placeholder="Buscar por cliente…"
            value={buyerSearch}
            onChange={(e) => {
              setBuyerSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        {visible.length ? (
          <div className="sale-list">
            {visible.slice((currentPage - 1) * 25, currentPage * 25).map((s) => (
              <article className={`sale-card ${s.cancelled_at ? 'cancelled' : ''}`} key={s.id}>
                <div className="sale-card-head">
                  <div className="sale-buyer">
                    <span className="avatar">
                      {s.buyer.replace('@', '').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{s.buyer}</strong>
                      <small>
                        {dateTime(s.created_at)} · {payments[s.payment_method]}
                      </small>
                    </div>
                  </div>
                  <div>
                    <strong>{money(saleTotal(data, s.id))}</strong>
                    {s.cancelled_at && <Badge tone="red">Anulada</Badge>}
                  </div>
                </div>
                <div className="sale-lines">
                  {data.items
                    .filter((i) => i.sale_id === s.id)
                    .map((i) => (
                      <div key={i.id}>
                        <span>
                          {i.quantity} × {i.product_name}{' '}
                          <small>
                            {i.color} · Talla {i.size}
                          </small>
                        </span>
                        <span>{money(i.unit_price)} / par</span>
                      </div>
                    ))}
                </div>
                {s.notes && <p className="sale-notes">{s.notes}</p>}
                {s.cancelled_at && (
                  <p className="stock-warning">Anulada: {s.cancellation_reason}</p>
                )}
                <div className="sale-card-footer">
                  <div className="button-row">
                    {data.receipts
                      .filter((r) => r.sale_id === s.id)
                      .map((r, index) => (
                        <button
                          key={r.id}
                          className="text-button"
                          onClick={async () => {
                            try {
                              setError('')
                              setPreview(await receiptURL(r.storage_path))
                            } catch (cause) {
                              setError(errorMessage(cause))
                            }
                          }}
                        >
                          <FileImage size={15} /> Comprobante {index + 1}
                        </button>
                      ))}
                    {!data.receipts.some((r) => r.sale_id === s.id) && (
                      <span className="tiny">
                        {s.payment_method === 'efectivo'
                          ? 'Pago en efectivo'
                          : 'Sin comprobante adjunto'}
                      </span>
                    )}
                  </div>
                  {open && !s.cancelled_at && (
                    <div className="button-row">
                      <button className="text-button" onClick={() => setUpload(s)}>
                        <Upload size={15} /> Adjuntar
                      </button>
                      <button className="text-button danger-text" onClick={() => setCancel(s)}>
                        <XCircle size={15} /> Anular
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Todavía no hay ventas para mostrar">
            Registra una nueva venta o ajusta los filtros.
          </Empty>
        )}
        {pages > 1 && (
          <div className="pagination">
            <span>{visible.length} ventas</span>
            <button
              className="button secondary small"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span>
              {currentPage} / {pages}
            </span>
            <button
              className="button secondary small"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
      {open && profile?.role === 'admin' && (
        <div className="end-actions">
          <button className="text-button danger-text" onClick={() => setModal('cancel-live')}>
            Cancelar esta transmisión
          </button>
        </div>
      )}
      {modal === 'sale' && <SaleForm liveId={live.id} onClose={() => setModal(null)} />}
      {modal === 'close' && (
        <Modal title="Cerrar y consolidar este Live" onClose={() => setModal(null)}>
          <AsyncForm
            submit="Confirmar cierre y descontar stock"
            onCancel={() => setModal(null)}
            onSubmit={async (form) => {
              if (form.get('confirm') !== 'on')
                throw new Error('Confirma que revisaste las ventas.')
              await run(() => rpc('close_live', { p_live_id: live.id }))
              setModal(null)
              setNotice(
                'Live cerrado. El stock y los movimientos se actualizaron en una sola transacción.',
              )
            }}
          >
            <p>
              Se consolidarán <strong>{sales.length} ventas</strong>, <strong>{pairs} pares</strong>{' '}
              y <strong>{money(total)}</strong>. Las ventas quedarán bloqueadas para edición.
            </p>
            {missingReceipts > 0 && (
              <Alert>
                Faltan comprobantes en {missingReceipts} pagos digitales. El cierre los dejará sin
                adjunto; revisa antes de continuar.
              </Alert>
            )}
            {shortages.length > 0 && (
              <Alert>
                Hay {shortages.length} variantes con stock insuficiente. Registra producción o anula
                las ventas correspondientes antes de cerrar.
              </Alert>
            )}
            <p className="tiny">
              El servidor vuelve a verificar el stock. Si detecta una falta, revierte todos los
              descuentos. Un segundo cierre no vuelve a descontar.
            </p>
            <label className="check-label">
              <input name="confirm" type="checkbox" required /> Revisé las ventas y quiero cerrar
              definitivamente.
            </label>
          </AsyncForm>
        </Modal>
      )}
      {modal === 'cancel-live' && (
        <Modal title="Cancelar el Live" onClose={() => setModal(null)}>
          <AsyncForm
            danger
            submit="Cancelar transmisión"
            onCancel={() => setModal(null)}
            onSubmit={async () => {
              await run(() => rpc('cancel_live', { p_live_id: live.id }))
              setModal(null)
            }}
          >
            <p>
              Solo puedes cancelar una transmisión sin ventas activas. Su historial se conservará.
            </p>
            <label className="check-label">
              <input type="checkbox" required /> Confirmo la cancelación del Live.
            </label>
          </AsyncForm>
        </Modal>
      )}
      {cancel && (
        <Modal title={`Anular venta de ${cancel.buyer}`} onClose={() => setCancel(null)}>
          <AsyncForm
            danger
            submit="Anular venta"
            onCancel={() => setCancel(null)}
            onSubmit={async (form) => {
              await run(() =>
                rpc('cancel_sale', { p_sale_id: cancel.id, p_reason: form.get('reason') }),
              )
              setCancel(null)
            }}
          >
            <label>
              Motivo de anulación
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={300}
                placeholder="Ej. El cliente desistió de la compra"
              />
            </label>
            <p className="tiny">
              La venta se conserva en el historial y no se incluirá en el cierre.
            </p>
          </AsyncForm>
        </Modal>
      )}
      {upload && (
        <Modal title={`Comprobante de ${upload.buyer}`} onClose={() => setUpload(null)}>
          <AsyncForm
            submit="Subir comprobante"
            onCancel={() => setUpload(null)}
            onSubmit={async (form) => {
              const file = form.get('image')
              if (!(file instanceof File) || !file.size) throw new Error('Selecciona una imagen.')
              await run(() => uploadReceipt(live.id, upload.id, file))
              setUpload(null)
            }}
          >
            <label>
              Imagen del pago
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
            </label>
            <p className="tiny">
              JPG, PNG o WebP hasta 20 MB. Se comprime a JPEG antes de subir a un bucket privado.
              Solo el equipo activo puede verla.
            </p>
          </AsyncForm>
        </Modal>
      )}
      {preview && (
        <Modal title="Comprobante privado" onClose={() => setPreview(null)}>
          <img className="receipt-preview" src={preview} alt="Comprobante de pago" />
          <p className="tiny">
            El enlace temporal caduca en 2 minutos. Cierra y abre de nuevo si necesitas renovarlo.
          </p>
        </Modal>
      )}
    </>
  )
}
