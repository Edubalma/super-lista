import type { Item } from '../db/models'

export type NivelPresupuesto = 'sin-presupuesto' | 'ok' | 'alerta' | 'excedido'

export interface ResumenTotales {
  /** Suma de lo que ya está en el carrito (lo que vas a pagar) */
  enCarrito: number
  /** enCarrito + pendientes con precio conocido (cargado o del catálogo) */
  estimado: number
  /** Pendientes sin ningún precio conocido: el estimado no los incluye */
  pendientesSinPrecio: number
  /** presupuesto - enCarrito. null si no hay presupuesto */
  restante: number | null
  nivel: NivelPresupuesto
}

/** Porcentaje del presupuesto a partir del cual se muestra alerta (amarillo) */
export const UMBRAL_ALERTA = 0.8

export function subtotal(precioUnitario: number, cantidad: number): number {
  return Math.round(precioUnitario * cantidad)
}

/**
 * @param preciosCatalogo precio recordado por nombre normalizado, para estimar pendientes
 */
export function calcularTotales(
  items: Item[],
  presupuesto: number | null,
  preciosCatalogo: Map<string, number> = new Map(),
  normalizar: (n: string) => string = (n) => n,
): ResumenTotales {
  let enCarrito = 0
  let pendientes = 0
  let pendientesSinPrecio = 0

  for (const item of items) {
    if (item.enCarrito) {
      enCarrito += subtotal(item.precioUnitario ?? 0, item.cantidad)
      continue
    }
    const precio = item.precioUnitario ?? preciosCatalogo.get(normalizar(item.nombre))
    if (precio == null) pendientesSinPrecio++
    else pendientes += subtotal(precio, item.cantidad)
  }

  const estimado = enCarrito + pendientes
  return {
    enCarrito,
    estimado,
    pendientesSinPrecio,
    restante: presupuesto == null ? null : presupuesto - enCarrito,
    nivel: calcularNivel(enCarrito, presupuesto),
  }
}

export function calcularNivel(monto: number, presupuesto: number | null): NivelPresupuesto {
  if (presupuesto == null || presupuesto <= 0) return 'sin-presupuesto'
  if (monto > presupuesto) return 'excedido'
  if (monto >= presupuesto * UMBRAL_ALERTA) return 'alerta'
  return 'ok'
}
