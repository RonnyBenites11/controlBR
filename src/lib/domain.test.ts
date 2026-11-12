import { describe, expect, it } from 'vitest'
import {
  businessDate,
  csvText,
  errorMessage,
  priceSchema,
  saleSchema,
  total,
  validateCart,
} from './domain'

describe('Importes e integridad de una venta', () => {
  it('suma en céntimos sin acumular errores binarios', () => {
    expect(
      total([
        { quantity: 3, unit_price: 0.1 },
        { quantity: 1, unit_price: 49.9 },
      ]),
    ).toBe(50.2)
  })
  it('rechaza precios nulos, negativos, excesivos y fracciones de céntimo', () => {
    for (const value of [0, -1, NaN, 1000001, 20.001, ''])
      expect(priceSchema.safeParse(value).success).toBe(false)
    expect(priceSchema.parse('49.90')).toBe(49.9)
  })
  it('requiere productos, comprador y cantidades enteras', () => {
    expect(
      saleSchema.safeParse({ buyer: 'A', payment: 'yape', notes: '', items: [] }).success,
    ).toBe(false)
    expect(() =>
      validateCart([
        { variant_id: 'x', quantity: 1, unit_price: 10 },
        { variant_id: 'x', quantity: 1, unit_price: 10 },
      ]),
    ).toThrow('Agrupa')
  })
})
describe('Reportes y mensajes', () => {
  it('usa fecha peruana al cruzar medianoche UTC', () => {
    expect(businessDate('2026-11-12T02:00:00Z')).toBe('2026-11-11')
    expect(businessDate('2026-11-12T05:00:00Z')).toBe('2026-11-12')
  })
  it('escapa comillas y neutraliza fórmulas al exportar CSV', () => {
    expect(csvText([['=SUM(1)', '  @cmd', 'Luna "rosa"', 'normal']])).toBe(
      '\uFEFF"\'=SUM(1)","\'  @cmd","Luna ""rosa""","normal"',
    )
  })
  it('muestra errores comprensibles', () => {
    expect(errorMessage({ message: 'Invalid login credentials' })).toContain('incorrectos')
    expect(errorMessage(priceSchema.safeParse(0).error)).toContain('mayor que cero')
  })
})
