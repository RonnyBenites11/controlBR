export type Role = 'admin' | 'staff'
export type PaymentMethod = 'yape' | 'plin' | 'transferencia' | 'efectivo'
export interface Profile {
  id: string
  display_name: string
  role: Role
  active: boolean
}
export interface Product {
  id: string
  sku: string
  name: string
  base_price: number
  active: boolean
  created_at: string
}
export interface Variant {
  id: string
  product_id: string
  color: string
  size: number
  barcode: string
  stock: number
  minimum_stock: number
}
export interface Live {
  id: string
  name: string
  status: 'open' | 'closed' | 'cancelled'
  created_by: string
  created_at: string
  closed_at: string | null
}
export interface Sale {
  id: string
  live_id: string
  buyer: string
  payment_method: PaymentMethod
  notes: string
  created_by: string
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
}
export interface SaleItem {
  id: string
  sale_id: string
  variant_id: string
  quantity: number
  unit_price: number
  product_name: string
  color: string
  size: number
  barcode: string
}
export interface Receipt {
  id: string
  sale_id: string
  storage_path: string
  created_at: string
}
export interface Movement {
  id: string
  variant_id: string
  kind: 'production' | 'adjustment' | 'sale'
  quantity: number
  balance_after: number
  reason: string
  live_id: string | null
  created_at: string
}
export interface Data {
  products: Product[]
  variants: Variant[]
  lives: Live[]
  sales: Sale[]
  items: SaleItem[]
  receipts: Receipt[]
  movements: Movement[]
}
export interface CartItem {
  variant_id: string
  quantity: number
  unit_price: number
}
export const payments: Record<PaymentMethod, string> = {
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
}
