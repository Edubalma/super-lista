import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { HojaItem, type DatosHoja } from '../componentes/HojaItem'
import { ListaNoEncontrada } from '../componentes/ListaNoEncontrada'
import { db, normalizarNombre } from '../db/database'
import type { Item, Lista } from '../db/models'
import { DetalleCompra } from '../componentes/DetalleCompra'
import {
  actualizarItem,
  agregarItem,
  cerrarCompra,
  eliminarItem,
  obtenerItems,
  obtenerPreciosCatalogo,
} from '../db/repositorio'
import { formatearCantidad } from '../utils/cantidad'
import { formatearMonto, montoAEditable } from '../utils/moneda'
import { navegar } from '../utils/navegacion'
import { calcularTotales, subtotal, type ResumenTotales } from '../utils/totales'

/** null = cerrada; 'extra' = alta de extra; Item = carga/edición de un producto */
type HojaAbierta = null | 'extra' | Item

export function CompraPantalla({ id }: { id: number }) {
  const lista = useLiveQuery(async () => (await db.listas.get(id)) ?? null, [id])
  if (lista === undefined) return null
  if (lista === null) return <ListaNoEncontrada />
  if (lista.estado === 'cerrada') return <DetalleCompra lista={lista} />
  return <Compra lista={lista} />
}

function Compra({ lista }: { lista: Lista }) {
  const id = lista.id!
  const [hoja, setHoja] = useState<HojaAbierta>(null)

  const items = useLiveQuery(() => obtenerItems(id), [id]) ?? []
  const catalogo = useLiveQuery(() => obtenerPreciosCatalogo(), []) ?? new Map<string, number>()
  const productos = useLiveQuery(() => db.productos.orderBy('nombre').toArray(), []) ?? []

  const totales = calcularTotales(items, lista.presupuesto, catalogo, normalizarNombre)
  const pendientes = items.filter((i) => !i.enCarrito)
  const enCarrito = items.filter((i) => i.enCarrito)

  function precioSugerido(item: Item): string {
    return montoAEditable(item.precioUnitario ?? catalogo.get(normalizarNombre(item.nombre)) ?? null)
  }

  async function confirmarItem(item: Item, datos: DatosHoja) {
    setHoja(null)
    await actualizarItem(item.id!, { cantidad: datos.cantidad, precioUnitario: datos.precioUnitario, enCarrito: true })
  }

  async function confirmarExtra(datos: DatosHoja) {
    setHoja(null)
    await agregarItem(id, { ...datos, esExtra: true, enCarrito: true })
  }

  async function sacarDelCarrito(item: Item) {
    setHoja(null)
    // Un extra nunca estuvo en la lista: al sacarlo se elimina
    if (item.esExtra) await eliminarItem(item.id!)
    else await actualizarItem(item.id!, { enCarrito: false })
  }

  async function onCerrarCompra() {
    const faltan = pendientes.length
    const mensaje =
      `¿Cerrar la compra por ${formatearMonto(totales.enCarrito)}?` +
      (faltan > 0 ? `\n\n${faltan} ${faltan === 1 ? 'producto quedó' : 'productos quedaron'} sin comprar.` : '')
    if (!window.confirm(mensaje)) return
    await cerrarCompra(id)
    navegar({ pantalla: 'listas' })
  }

  return (
    <>
      <BarraTotales totales={totales} presupuesto={lista.presupuesto} nombre={lista.nombre} listaId={id} />

      <main className="contenido con-barra-inferior">
        <h3 className="seccion">
          Por agarrar <span>{pendientes.length}</span>
        </h3>
        {pendientes.length === 0 ? (
          <p className="nota">¡Ya tenés todo lo de la lista!</p>
        ) : (
          <ul className="items">
            {pendientes.map((item) => {
              const ref = item.precioUnitario ?? catalogo.get(normalizarNombre(item.nombre))
              return (
                <li key={item.id}>
                  <button className="item item-tocable" onClick={() => setHoja(item)}>
                    <span className="casilla" aria-hidden />
                    <span className="item-info">
                      <span className="item-nombre">{item.nombre}</span>
                      <span className="item-detalle">
                        {formatearCantidad(item.cantidad)} u.
                        {ref != null && ` · ≈ ${formatearMonto(subtotal(ref, item.cantidad))}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <h3 className="seccion">
          En el carrito <span>{enCarrito.length}</span>
        </h3>
        {enCarrito.length === 0 ? (
          <p className="nota">Tocá un producto para cargar su precio y pasarlo al carrito.</p>
        ) : (
          <ul className="items">
            {enCarrito.map((item) => (
              <li key={item.id}>
                <button className="item item-tocable item-en-carrito" onClick={() => setHoja(item)}>
                  <span className="casilla marcada" aria-hidden>
                    ✓
                  </span>
                  <span className="item-info">
                    <span className="item-nombre">
                      {item.nombre}
                      {item.esExtra && <span className="etiqueta">extra</span>}
                    </span>
                    <span className="item-detalle">
                      {formatearCantidad(item.cantidad)} × {formatearMonto(item.precioUnitario ?? 0)}
                    </span>
                  </span>
                  <strong className="item-subtotal">{formatearMonto(subtotal(item.precioUnitario ?? 0, item.cantidad))}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="barra-inferior">
        <div className="barra-inferior-botones">
          <button className="btn" onClick={() => setHoja('extra')}>
            + Extra
          </button>
          <button className="btn btn-primario" onClick={onCerrarCompra} disabled={enCarrito.length === 0}>
            Cerrar compra
          </button>
        </div>
      </footer>

      {hoja === 'extra' && (
        <HojaItem
          titulo="Agregar extra"
          nombreEditable
          textoConfirmar="Agregar al carrito"
          sugerencias={productos.map((p) => p.nombre)}
          onConfirmar={confirmarExtra}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja !== null && hoja !== 'extra' && (
        <HojaItem
          key={hoja.id}
          titulo={hoja.nombre}
          cantidadInicial={hoja.cantidad}
          precioInicial={precioSugerido(hoja)}
          textoConfirmar={hoja.enCarrito ? 'Guardar' : 'Al carrito'}
          onConfirmar={(datos) => confirmarItem(hoja, datos)}
          onSacar={hoja.enCarrito ? () => sacarDelCarrito(hoja) : undefined}
          textoSacar={hoja.esExtra ? 'Eliminar extra' : 'Sacar del carrito'}
          onCerrar={() => setHoja(null)}
        />
      )}
    </>
  )
}

function BarraTotales({
  totales,
  presupuesto,
  nombre,
  listaId,
}: {
  totales: ResumenTotales
  presupuesto: number | null
  nombre: string
  listaId: number
}) {
  const progreso = presupuesto ? Math.min(totales.enCarrito / presupuesto, 1) : 0

  return (
    <header className={`barra-totales nivel-fondo-${totales.nivel}`}>
      <div className="barra-totales-fila">
        <button className="btn-volver" onClick={() => navegar({ pantalla: 'lista', id: listaId })}>
          ‹ {nombre}
        </button>
      </div>

      <div className="barra-totales-fila">
        <span className="etiqueta-total">En el carrito</span>
        <strong className={`total-grande nivel-${totales.nivel}`}>{formatearMonto(totales.enCarrito)}</strong>
      </div>

      {presupuesto != null && totales.restante != null && (
        <>
          <div className="barra-progreso" role="progressbar" aria-valuenow={Math.round(progreso * 100)}>
            <div className={`barra-progreso-relleno relleno-${totales.nivel}`} style={{ width: `${progreso * 100}%` }} />
          </div>
          <div className="barra-totales-fila">
            <span className={`nivel-${totales.nivel}`}>
              {totales.restante >= 0
                ? `Te quedan ${formatearMonto(totales.restante)}`
                : `Te pasaste ${formatearMonto(-totales.restante)}`}
            </span>
            <span className="nota">de {formatearMonto(presupuesto)}</span>
          </div>
        </>
      )}

      <div className="barra-totales-fila nota">
        <span>Estimado al terminar</span>
        <span>
          {formatearMonto(totales.estimado)}
          {totales.pendientesSinPrecio > 0 && ` + ${totales.pendientesSinPrecio} sin precio`}
        </span>
      </div>
    </header>
  )
}
