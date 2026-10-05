import { subtotal } from '../utils/totales'
import { db, normalizarNombre } from './database'
import type { Item, Lista } from './models'

// ---------- Listas ----------

export async function crearLista(nombre: string): Promise<number> {
  const id = await db.listas.add({
    nombre: nombre.trim(),
    presupuesto: null,
    estado: 'activa',
    creadaEn: Date.now(),
  })
  return id as number
}

export function actualizarLista(id: number, cambios: Partial<Omit<Lista, 'id'>>) {
  return db.listas.update(id, cambios)
}

/** Elimina la lista y todos sus ítems */
export function eliminarLista(id: number) {
  return db.transaction('rw', db.listas, db.items, async () => {
    await db.items.where('listaId').equals(id).delete()
    await db.listas.delete(id)
  })
}

// ---------- Ítems ----------

export function obtenerItems(listaId: number): Promise<Item[]> {
  return db.items.where('[listaId+orden]').between([listaId, -Infinity], [listaId, Infinity]).toArray()
}

export async function agregarItem(
  listaId: number,
  datos: { nombre: string; cantidad: number; esExtra?: boolean; precioUnitario?: number | null; enCarrito?: boolean },
): Promise<number> {
  const ultimo = await db.items
    .where('[listaId+orden]')
    .between([listaId, -Infinity], [listaId, Infinity])
    .last()
  const id = await db.items.add({
    listaId,
    nombre: datos.nombre.trim(),
    cantidad: datos.cantidad,
    precioUnitario: datos.precioUnitario ?? null,
    enCarrito: datos.enCarrito ?? false,
    esExtra: datos.esExtra ?? false,
    orden: (ultimo?.orden ?? 0) + 1,
  })
  return id as number
}

export function actualizarItem(id: number, cambios: Partial<Omit<Item, 'id' | 'listaId'>>) {
  return db.items.update(id, cambios)
}

export function eliminarItem(id: number) {
  return db.items.delete(id)
}

// ---------- Catálogo ----------

/** Mapa clave normalizada -> último precio, para estimar */
export async function obtenerPreciosCatalogo(): Promise<Map<string, number>> {
  const productos = await db.productos.toArray()
  return new Map(productos.map((p) => [p.clave, p.ultimoPrecio]))
}

// ---------- Cierre de compra ----------

/**
 * Cierra la compra en una sola transacción:
 * - guarda en el catálogo el último precio de cada producto del carrito
 * - marca la lista como cerrada con el total pagado
 * Devuelve el total final en centavos.
 */
export function cerrarCompra(listaId: number): Promise<number> {
  return db.transaction('rw', db.listas, db.items, db.productos, async () => {
    const items = await db.items.where('listaId').equals(listaId).toArray()
    const ahora = Date.now()
    let total = 0

    for (const item of items) {
      if (!item.enCarrito || item.precioUnitario == null) continue
      total += subtotal(item.precioUnitario, item.cantidad)
      await db.productos.put({
        clave: normalizarNombre(item.nombre),
        nombre: item.nombre,
        ultimoPrecio: item.precioUnitario,
        actualizadoEn: ahora,
      })
    }

    await db.listas.update(listaId, { estado: 'cerrada', cerradaEn: ahora, totalFinal: total })
    return total
  })
}
