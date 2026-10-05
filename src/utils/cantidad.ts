/** "1,5" -> 1.5 ; devuelve null si no es un número positivo */
export function parsearCantidad(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 1.5 -> "1,5" */
export function formatearCantidad(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 })
}
