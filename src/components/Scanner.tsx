import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { Camera, ScanBarcode } from 'lucide-react'
import { Alert, Modal } from './ui'
import { errorMessage } from '../lib/domain'

export function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void
  onClose: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const callback = useRef(onScan)
  const [error, setError] = useState('')
  useEffect(() => {
    callback.current = onScan
  }, [onScan])
  useEffect(() => {
    let controls: IScannerControls | undefined
    const element = video.current
    let cancelled = false
    let scanned = false
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            'La cámara requiere HTTPS y un navegador compatible. Usa el lector o la búsqueda manual.',
          )
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
          [import('@zxing/browser'), import('@zxing/library')],
        )
        if (cancelled) return
        const reader = new BrowserMultiFormatReader(
          new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]]]),
        )
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          element!,
          (result, _error, scanner) => {
            if (result && !cancelled && !scanned) {
              scanned = true
              scanner.stop()
              callback.current(result.getText())
            }
          },
        )
        if (cancelled) controls.stop()
      } catch (cause) {
        if (!cancelled) setError(errorMessage(cause))
      }
    }
    void start()
    return () => {
      cancelled = true
      controls?.stop()
      const stream = element?.srcObject
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop())
    }
  }, [])
  return (
    <Modal title="Escanear un código" onClose={onClose}>
      <div className="scanner">
        <video ref={video} muted playsInline autoPlay aria-label="Vista previa de la cámara" />
        <div className="scan-guide">
          <ScanBarcode size={44} />
        </div>
      </div>
      <p className="muted scanner-help">
        <Camera size={16} /> Apunta al código de barras de la etiqueta.
      </p>
      {error && <Alert>{error}</Alert>}
      <p className="tiny">
        También puedes conectar un lector USB o Bluetooth en modo teclado y escanear en el campo de
        búsqueda.
      </p>
    </Modal>
  )
}
