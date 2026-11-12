import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AlertCircle, ArrowRight, Check, LoaderCircle, X } from 'lucide-react'
import { errorMessage } from '../lib/domain'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-icon">
        b<span>r</span>
        <i />
      </span>
      {!compact && (
        <div>
          <strong>BABY RONNYS</strong>
          <small>PEQUEÑOS PASOS, GRANDES SUEÑOS</small>
        </div>
      )}
    </div>
  )
}
export function Spinner() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} /> Cargando tu espacio…
    </div>
  )
}
export function Alert({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return (
    <div className={`alert ${success ? 'success' : ''}`} role={success ? 'status' : 'alert'}>
      {success ? <Check size={18} /> : <AlertCircle size={18} />}
      <span>{children}</span>
    </div>
  )
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-art">✳</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}
export function PageHeader({
  eyebrow = 'TU NEGOCIO, EN ORDEN',
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      className={`modal ${wide ? 'wide' : ''}`}
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function AsyncForm({
  children,
  onSubmit,
  submit = 'Guardar',
  onCancel,
  danger = false,
}: {
  children: ReactNode
  onSubmit: (form: FormData) => Promise<void>
  submit?: string
  onCancel?: () => void
  danger?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked.current) return
    const form = new FormData(event.currentTarget)
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <form onSubmit={handle} className="form">
      <fieldset disabled={busy}>{children}</fieldset>
      {error && <Alert>{error}</Alert>}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>
            Volver
          </button>
        )}
        <button disabled={busy} className={`button ${danger ? 'danger' : ''}`} type="submit">
          {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}
          {busy ? 'Procesando…' : submit}
        </button>
      </div>
    </form>
  )
}
