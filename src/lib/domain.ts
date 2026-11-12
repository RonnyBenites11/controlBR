import { z } from 'zod'
import type { CartItem, Data, Sale } from './types'

export const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
export const integer = (n: number) => new Intl.NumberFormat('es-PE').format(n)
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value))
export function businessDate(value: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export function total(items: { quantity: number; unit_price: number }[]) {
  return (
    items.reduce(
      (cents, item) => cents + Math.round(Number(item.unit_price) * 100) * item.quantity,
      0,
    ) / 100
  )
}
export function saleTotal(data: Data, saleId: string) {
  return total(data.items.filter((i) => i.sale_id === saleId))
}
export function activeSales(data: Data, liveId?: string): Sale[] {
  return data.sales.filter((s) => !s.cancelled_at && (!liveId || s.live_id === liveId))
}
export const priceSchema = z.coerce
  .number()
  .positive('El precio debe ser mayor que cero.')
  .max(1000000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
    'Usa como máximo dos decimales.',
  )
export const saleSchema = z.object({
  buyer: z.string().trim().min(2, 'Escribe el nombre o usuario del cliente.').max(100),
  payment: z.enum(['yape', 'plin', 'transferencia', 'efectivo']),
  notes: z.string().trim().max(500),
  items: z
    .array(
      z.object({
        variant_id: z.uuid(),
        quantity: z.number().int().min(1).max(10000),
        unit_price: priceSchema,
      }),
    )
    .min(1, 'Agrega al menos un producto.')
    .max(100),
})
export function validateCart(items: CartItem[]) {
  if (new Set(items.map((i) => i.variant_id)).size !== items.length)
    throw new Error('Agrupa las cantidades de cada variante en una sola línea.')
}
export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Revisa los campos.'
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message)
    if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
    if (message.includes('Email not confirmed')) return 'Confirma tu correo para iniciar sesión.'
    if (message.includes('Failed to fetch'))
      return 'No se pudo conectar con Supabase. Revisa tu conexión y configuración.'
    if (message.includes('duplicate key'))
      return 'Ya existe un registro con ese código o combinación de color y talla.'
    if (message.includes('permission denied'))
      return 'No tienes permisos para esta operación. Revisa tu acceso con el administrador.'
    if (message.includes('check constraint') || message.includes('not-null constraint'))
      return 'Hay un valor inválido o vacío. Revisa los campos.'
    return message
  }
  return 'No pudimos completar la operación. Inténtalo nuevamente.'
}
export function csvText(rows: (string | number)[][]): string {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value)
            if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text
            return '"' + text.replace(/"/g, '""') + '"'
          })
          .join(','),
      )
      .join('\r\n')
  )
}
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
