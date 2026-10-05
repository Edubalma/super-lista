import { useEffect, useState } from 'react'

/**
 * Navegación mínima por hash (sin dependencias). Compatible con GitHub Pages
 * y con el gesto "atrás" del iPhone.
 *   #/             -> listas
 *   #/lista/:id    -> armar lista
 *   #/compra/:id   -> modo compra (etapa 3)
 */
export type Ruta =
  | { pantalla: 'listas' }
  | { pantalla: 'lista'; id: number }
  | { pantalla: 'compra'; id: number }

export function parsearRuta(hash: string): Ruta {
  const m = hash.match(/^#\/(lista|compra)\/(\d+)$/)
  if (m) return { pantalla: m[1] as 'lista' | 'compra', id: Number(m[2]) }
  return { pantalla: 'listas' }
}

export function navegar(ruta: Ruta) {
  window.location.hash = ruta.pantalla === 'listas' ? '#/' : `#/${ruta.pantalla}/${ruta.id}`
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(() => parsearRuta(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRuta(parsearRuta(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return ruta
}
