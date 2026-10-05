/**
 * Montos: siempre en CENTAVOS (enteros) para evitar errores de punto flotante.
 * Ej: $ 1.234,50 -> 123450
 */

export type EstadoLista = 'activa' | 'cerrada'

export interface Lista {
  id?: number
  nombre: string
  /** Presupuesto máximo en centavos. null = sin presupuesto */
  presupuesto: number | null
  estado: EstadoLista
  creadaEn: number
  cerradaEn?: number
  /** Total pagado al cerrar la compra, en centavos */
  totalFinal?: number
}

export interface Item {
  id?: number
  listaId: number
  nombre: string
  /** Admite decimales (ej: 1.5 kg) */
  cantidad: number
  /** Precio unitario en centavos cargado en el super. null = todavía no cargado */
  precioUnitario: number | null
  enCarrito: boolean
  /** true = agregado en el momento, no estaba en la lista original */
  esExtra: boolean
  orden: number
}

/** Catálogo para recordar precios y autocompletar nombres */
export interface Producto {
  /** Clave: nombre normalizado (minúsculas, sin acentos ni espacios extra) */
  clave: string
  nombre: string
  /** Último precio unitario conocido, en centavos */
  ultimoPrecio: number
  actualizadoEn: number
}
