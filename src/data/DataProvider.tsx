import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { allRows } from '../lib/supabase'
import { errorMessage } from '../lib/domain'
import type { Data, Live, Movement, Product, Receipt, Sale, SaleItem, Variant } from '../lib/types'
import { DataContext } from './DataContext'

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const inFlight = useRef<Promise<void> | null>(null)
  const alive = useRef(true)
  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    const promise = (async () => {
      try {
        const [products, variants, lives, sales, items, receipts, movements] = await Promise.all([
          allRows<Product>('products'),
          allRows<Variant>('variants'),
          allRows<Live>('lives'),
          allRows<Sale>('sales'),
          allRows<SaleItem>('sale_items'),
          allRows<Receipt>('receipts'),
          allRows<Movement>('stock_movements'),
        ])
        if (alive.current) {
          setData({ products, variants, lives, sales, items, receipts, movements })
          setError('')
        }
      } catch (cause) {
        if (alive.current) setError(errorMessage(cause))
      } finally {
        if (alive.current) setLoading(false)
        inFlight.current = null
      }
    })()
    inFlight.current = promise
    return promise
  }, [])
  useEffect(() => {
    alive.current = true
    void refresh()
    const onFocus = () => {
      void refresh()
    }
    const interval = setInterval(onFocus, 30000)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    return () => {
      alive.current = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [refresh])
  async function run<T>(job: () => Promise<T>) {
    const result = await job()
    // Espera cualquier lectura anterior y vuelve a leer después de la mutación.
    if (inFlight.current) await inFlight.current
    await refresh()
    return result
  }
  return (
    <DataContext.Provider value={{ data, loading, error, refresh, run }}>
      {children}
    </DataContext.Provider>
  )
}
