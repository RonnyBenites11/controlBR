import imageCompression from 'browser-image-compression'
import { client, rpc } from './supabase'

export async function uploadReceipt(liveId: string, saleId: string, file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Selecciona una imagen JPG, PNG o WebP.')
  if (file.size > 20 * 1024 * 1024) throw new Error('La imagen original debe pesar menos de 20 MB.')
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: false,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  })
  const path = `${liveId}/${saleId}/${crypto.randomUUID()}.jpg`
  const { error } = await client()
    .storage.from('receipts')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  try {
    await rpc('attach_receipt', { p_sale_id: saleId, p_path: path })
  } catch (cause) {
    const cleanup = await client().storage.from('receipts').remove([path])
    if (cleanup.error)
      throw new Error(
        'No se pudo vincular la imagen y quedó un archivo sin vincular. Pide al administrador que revise Storage. La venta permanece registrada.',
      )
    throw cause
  }
}
export async function receiptURL(path: string) {
  const { data, error } = await client().storage.from('receipts').createSignedUrl(path, 120)
  if (error) throw error
  return data.signedUrl
}
