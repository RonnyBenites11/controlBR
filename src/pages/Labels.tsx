import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { Printer, ScanBarcode, Search } from 'lucide-react'
import { useData } from '../data/DataContext'
import { Alert, Empty, PageHeader } from '../components/ui'

export function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current)
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        width: 1.4,
        height: 38,
        margin: 4,
        fontSize: 12,
        displayValue: true,
        background: '#ffffff',
        lineColor: '#000000',
      })
  }, [value])
  return <svg ref={ref} role="img" aria-label={`Código de barras ${value}`} />
}
export function Labels() {
  const { data } = useData()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Record<string, number>>({})
  if (!data) return null
  const variants = data.variants.filter((v) => {
    const p = data.products.find((p) => p.id === v.product_id)
    return (
      p?.active &&
      `${p.name} ${v.color} ${v.size} ${v.barcode}`.toLowerCase().includes(query.toLowerCase())
    )
  })
  const count = Object.values(selected).reduce((n, q) => n + q, 0)
  const printable = data.variants.filter((v) => selected[v.id] > 0)
  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="CÓDIGOS DE BARRAS"
          title="Un escaneo y listo"
          description="Etiquetas Code 128 únicas por modelo, color y talla."
          action={
            <button
              disabled={!count || count > 200}
              className="button"
              onClick={() => window.print()}
            >
              <Printer size={17} /> Imprimir {count} etiquetas
            </button>
          }
        />
        <div className="info-banner">
          <ScanBarcode size={20} /> Las etiquetas identifican la variante, no un par individual.
          Configura tu lector USB o Bluetooth en modo teclado con sufijo Enter.
        </div>
        <section className="panel">
          <div className="toolbar">
            <div className="search-field">
              <Search size={18} />
              <input
                aria-label="Buscar etiquetas"
                placeholder="Busca el modelo, color, talla o código…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="button secondary small" onClick={() => setSelected({})}>
              Limpiar selección
            </button>
          </div>
          {count > 200 && <Alert>Selecciona un máximo de 200 etiquetas por impresión.</Alert>}
          {variants.length ? (
            <div className="label-options">
              {variants.map((v) => (
                <label key={v.id}>
                  <span>
                    <strong>{data.products.find((p) => p.id === v.product_id)?.name}</strong>
                    <small>
                      {v.color} · Talla {v.size} · {v.barcode}
                    </small>
                  </span>
                  <input
                    aria-label={`Copias de ${v.barcode}`}
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={selected[v.id] ?? 0}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        [v.id]: Math.max(0, Math.min(50, Math.floor(Number(e.target.value)))),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ) : (
            <Empty title="Agrega variantes para generar etiquetas" />
          )}
        </section>
      </div>
      <section className="print-area" aria-label="Vista previa de etiquetas">
        {!count && (
          <div className="no-print empty">
            <h3>Selecciona cuántas etiquetas necesitas</h3>
            <p>La vista previa aparecerá aquí.</p>
          </div>
        )}
        {count <= 200 &&
          printable.flatMap((v) =>
            Array.from({ length: selected[v.id] }, (_, index) => (
              <div className="barcode-label" key={`${v.id}-${index}`}>
                <strong>BABY RONNYS</strong>
                <span>{data.products.find((p) => p.id === v.product_id)?.name}</span>
                <span>
                  {v.color} · Talla {v.size}
                </span>
                <Barcode value={v.barcode} />
              </div>
            )),
          )}
      </section>
    </>
  )
}
