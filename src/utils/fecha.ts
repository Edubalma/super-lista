const formateador = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

/** timestamp -> "5 oct 2026, 18:30" */
export function formatearFecha(ms: number): string {
  return formateador.format(ms)
}
