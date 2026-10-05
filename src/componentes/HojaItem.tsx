import { useState, type FormEvent } from 'react'
import { formatearCantidad, parsearCantidad } from '../utils/cantidad'
import { formatearMonto, parsearMonto } from '../utils/moneda'
import { subtotal } from '../utils/totales'

export interface DatosHoja {
  nombre: string
  cantidad: number
  precioUnitario: number
}

interface Props {
  titulo: string
  /** true = se puede editar el nombre (alta de extra) */
  nombreEditable?: boolean
  nombreInicial?: string
  cantidadInicial?: number
  precioInicial?: string
  textoConfirmar: string
  sugerencias?: string[]
  onConfirmar: (datos: DatosHoja) => void
  onSacar?: () => void
  textoSacar?: string
  onCerrar: () => void
}

/** Ventana para cargar precio y cantidad de un producto (o un extra nuevo) */
export function HojaItem({
  titulo,
  nombreEditable = false,
  nombreInicial = '',
  cantidadInicial = 1,
  precioInicial = '',
  textoConfirmar,
  sugerencias = [],
  onConfirmar,
  onSacar,
  textoSacar = 'Sacar del carrito',
  onCerrar,
}: Props) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [cantidadTxt, setCantidadTxt] = useState(formatearCantidad(cantidadInicial))
  const [precioTxt, setPrecioTxt] = useState(precioInicial)
  const [error, setError] = useState<string | null>(null)

  const cantidad = parsearCantidad(cantidadTxt)
  const precio = parsearMonto(precioTxt)
  const vistaPrevia = cantidad != null && precio != null ? subtotal(precio, cantidad) : null

  function cambiarCantidad(delta: number) {
    const nueva = Math.round(((cantidad ?? 1) + delta) * 1000) / 1000
    if (nueva > 0) setCantidadTxt(formatearCantidad(nueva))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (nombreEditable && !nombre.trim()) return setError('Ingresá el nombre del producto')
    if (cantidad == null) return setError('La cantidad no es válida')
    if (precio == null) return setError('Ingresá el precio')
    onConfirmar({ nombre: nombre.trim(), cantidad, precioUnitario: precio })
  }

  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <form className="hoja" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="hoja-encabezado">
          <h2>{titulo}</h2>
          <button type="button" className="btn-icono" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>

        {nombreEditable && (
          <label className="campo">
            <span>Producto</span>
            <input
              type="text"
              list="sugerencias-extra"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              autoCapitalize="sentences"
            />
            <datalist id="sugerencias-extra">
              {sugerencias.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        )}

        <label className="campo">
          <span>Precio unitario</span>
          <div className="input-moneda">
            <span>$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={precioTxt}
              onChange={(e) => setPrecioTxt(e.target.value)}
              onFocus={(e) => e.target.select()}
              autoFocus={!nombreEditable}
              aria-label="Precio unitario"
            />
          </div>
        </label>

        <div className="campo">
          <span>Cantidad</span>
          <div className="stepper stepper-grande">
            <button type="button" onClick={() => cambiarCantidad(-1)} disabled={(cantidad ?? 0) <= 1} aria-label="Restar">
              −
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={cantidadTxt}
              onChange={(e) => setCantidadTxt(e.target.value)}
              aria-label="Cantidad"
            />
            <button type="button" onClick={() => cambiarCantidad(1)} aria-label="Sumar">
              +
            </button>
          </div>
        </div>

        <div className="resumen-fila hoja-subtotal">
          <span>Subtotal</span>
          <strong>{vistaPrevia != null ? formatearMonto(vistaPrevia) : '—'}</strong>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primario btn-bloque">
          {textoConfirmar}
        </button>
        {onSacar && (
          <button type="button" className="btn btn-peligro btn-bloque" onClick={onSacar}>
            {textoSacar}
          </button>
        )}
      </form>
    </div>
  )
}
