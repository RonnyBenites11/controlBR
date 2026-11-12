import { createContext, useContext } from 'react'
import type { Data } from '../lib/types'
export interface DataValue {
  data: Data | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
  run: <T>(job: () => Promise<T>) => Promise<T>
}
export const DataContext = createContext<DataValue | null>(null)
export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('Falta DataProvider')
  return value
}
