const formateador = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 123450 -> "$ 1.234,50" */
export function formatearMonto(centavos: number): string {
  return formateador.format(centavos / 100)
}

/**
 * Convierte lo que tipea el usuario a centavos.
 * Acepta "1234,5", "1.234,50", "1234.5", "$ 1.234". Devuelve null si no es válido.
 */
export function parsearMonto(texto: string): number | null {
  let limpio = texto.replace(/[$\s]/g, '')
  if (!limpio) return null

  const tieneComa = limpio.includes(',')
  if (tieneComa) {
    // Formato AR: punto = miles, coma = decimales
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  } else {
    // Sin coma: un punto seguido de exactamente 3 dígitos se toma como miles
    const partes = limpio.split('.')
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      limpio = partes.join('')
    }
  }

  if (!/^\d+(\.\d{0,2})?$/.test(limpio)) return null
  return Math.round(parseFloat(limpio) * 100)
}

/** 5000050 -> "50000,5" (valor para precargar un input editable) */
export function montoAEditable(centavos: number | null): string {
  return centavos == null ? '' : (centavos / 100).toString().replace('.', ',')
}
