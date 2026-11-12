import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdates() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  return needRefresh ? (
    <div className="update-banner pwa-notice" role="status">
      Hay una nueva versión. Guarda tus cambios antes de actualizar.
      <button
        className="text-button"
        onClick={() => {
          void updateServiceWorker(true)
        }}
      >
        Actualizar aplicación
      </button>
    </div>
  ) : null
}
