import { db } from './database'
import type { Item, Lista, Producto } from './models'

const VERSION_RESPALDO = 1

interface Respaldo {
  app: 'super-lista'
  version: number
  fecha: number
  listas: Lista[]
  items: Item[]
  productos: Producto[]
}

/** Genera el respaldo y lo comparte (iPhone) o lo descarga (PC) */
export async function exportarRespaldo(): Promise<void> {
  const respaldo: Respaldo = {
    app: 'super-lista',
    version: VERSION_RESPALDO,
    fecha: Date.now(),
    listas: await db.listas.toArray(),
    items: await db.items.toArray(),
    productos: await db.productos.toArray(),
  }
  const fecha = new Date().toISOString().slice(0, 10)
  const nombre = `super-lista-respaldo-${fecha}.json`
  const archivo = new File([JSON.stringify(respaldo)], nombre, { type: 'application/json' })

  // En iPhone abre el menú Compartir (Guardar en Archivos, WhatsApp, Mail, etc.)
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Respaldo Super Lista' })
      return
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return // el usuario canceló
    }
  }

  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/** Lee y valida un archivo de respaldo. Lanza Error con mensaje para el usuario si no es válido. */
export async function leerRespaldo(archivo: File): Promise<Respaldo> {
  let datos: Respaldo
  try {
    datos = JSON.parse(await archivo.text())
  } catch {
    throw new Error('El archivo no es un respaldo válido.')
  }
  if (
    datos?.app !== 'super-lista' ||
    !Array.isArray(datos.listas) ||
    !Array.isArray(datos.items) ||
    !Array.isArray(datos.productos)
  ) {
    throw new Error('El archivo no es un respaldo de Super Lista.')
  }
  if (datos.version > VERSION_RESPALDO) {
    throw new Error('El respaldo es de una versión más nueva de la app.')
  }
  return datos
}

/** Reemplaza TODOS los datos actuales por los del respaldo */
export function importarRespaldo(datos: Respaldo): Promise<void> {
  return db.transaction('rw', db.listas, db.items, db.productos, async () => {
    await Promise.all([db.listas.clear(), db.items.clear(), db.productos.clear()])
    await db.listas.bulkAdd(datos.listas)
    await db.items.bulkAdd(datos.items)
    await db.productos.bulkAdd(datos.productos)
  })
}
