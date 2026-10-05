/**
 * Pide al navegador que no borre los datos automáticamente.
 * En iOS Safari puede no concederse; por eso más adelante se agrega respaldo JSON.
 */
export async function solicitarAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
