import { useLiveQuery } from 'dexie-react-hooks'
import type { Lista } from '../db/models'
import { eliminarLista, obtenerItems } from '../db/repositorio'
import { formatearCantidad } from '../utils/cantidad'
import { formatearFecha } from '../utils/fecha'
import { formatearMonto } from '../utils/moneda'
import { navegar } from '../utils/navegacion'
import { calcularNivel, subtotal } from '../utils/totales'

/** Vista de solo lectura de una compra cerrada (historial) */
export function DetalleCompra({ lista }: { lista: Lista }) {
  const items = useLiveQuery(() => obtenerItems(lista.id!), [lista.id]) ?? []
  const comprados = items.filter((i) => i.enCarrito)
  const noComprados = items.filter((i) => !i.enCarrito)
  const totalExtras = comprados
    .filter((i) => i.esExtra)
    .reduce((acc, i) => acc + subtotal(i.precioUnitario ?? 0, i.cantidad), 0)
  const total = lista.totalFinal ?? 0
  const nivel = calcularNivel(total, lista.presupuesto)

  async function onEliminar() {
    if (!window.confirm(`¿Eliminar "${lista.nombre}" del historial?`)) return
    await eliminarLista(lista.id!)
    navegar({ pantalla: 'listas' })
  }

  return (
    <>
      <header className="encabezado">
        <button className="btn-volver" onClick={() => navegar({ pantalla: 'listas' })}>
          ‹ Listas
        </button>
        <h1>{lista.nombre}</h1>
        {lista.cerradaEn && <p className="nota">Compra cerrada el {formatearFecha(lista.cerradaEn)}</p>}
      </header>

      <main className="contenido">
        <section className="resumen">
          <div className="resumen-fila">
            <span>Total pagado</span>
            <strong className={`nivel-${nivel}`}>{formatearMonto(total)}</strong>
          </div>
          {lista.presupuesto != null && (
            <>
              <div className="resumen-fila">
                <span>Presupuesto</span>
                <span>{formatearMonto(lista.presupuesto)}</span>
              </div>
              <div className="resumen-fila">
                <span>{total <= lista.presupuesto ? 'Te sobró' : 'Te pasaste'}</span>
                <span className={`nivel-${nivel}`}>{formatearMonto(Math.abs(lista.presupuesto - total))}</span>
              </div>
            </>
          )}
          {totalExtras > 0 && (
            <div className="resumen-fila">
              <span>En extras</span>
              <span>{formatearMonto(totalExtras)}</span>
            </div>
          )}
        </section>

        <h3 className="seccion">
          Compraste <span>{comprados.length}</span>
        </h3>
        <ul className="items">
          {comprados.map((item) => (
            <li key={item.id} className="item">
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
            </li>
          ))}
        </ul>

        {noComprados.length > 0 && (
          <>
            <h3 className="seccion">
              No compraste <span>{noComprados.length}</span>
            </h3>
            <ul className="items">
              {noComprados.map((item) => (
                <li key={item.id} className="item item-no-comprado">
                  <span className="item-info">
                    <span className="item-nombre">{item.nombre}</span>
                    <span className="item-detalle">{formatearCantidad(item.cantidad)} u.</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <button className="btn btn-peligro btn-bloque" onClick={onEliminar}>
          Eliminar del historial
        </button>
      </main>
    </>
  )
}
