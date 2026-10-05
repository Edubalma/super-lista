import Dexie, { type EntityTable } from 'dexie'
import type { Item, Lista, Producto } from './models'

export const db = new Dexie('SuperListaDB') as Dexie & {
  listas: EntityTable<Lista, 'id'>
  items: EntityTable<Item, 'id'>
  productos: EntityTable<Producto, 'clave'>
}

db.version(1).stores({
  listas: '++id, estado, creadaEn',
  items: '++id, listaId, [listaId+orden]',
  productos: 'clave, nombre',
})

/** Normaliza un nombre para usarlo como clave del catálogo */
export function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}
