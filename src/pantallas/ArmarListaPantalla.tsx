import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent } from 'react'
import { DetalleCompra } from '../componentes/DetalleCompra'
import { ListaNoEncontrada } from '../componentes/ListaNoEncontrada'
import { db, normalizarNombre } from '../db/database'
import type { Item, Lista } from '../db/models'
import {
  actualizarItem,
  actualizarLista,
  agregarItem,
  eliminarItem,
  eliminarLista,
  obtenerItems,
  obtenerPreciosCatalogo,
} from '../db/repositorio'
import { formatearCantidad, parsearCantidad } from '../utils/cantidad'
import { formatearMonto, montoAEditable, parsearMonto } from '../utils/moneda'
import { navegar } from '../utils/navegacion'
import { calcularNivel, calcularTotales, subtotal } from '../utils/totales'

export function ArmarListaPantalla({ id }: { id: number }) {
  // null = no existe; undefined = cargando
  const lista = useLiveQuery(async () => (await db.listas.get(id)) ?? null, [id])

  if (lista === undefined) return null
  if (lista === null) return <ListaNoEncontrada />
  if (lista.estado === 'cerrada') return <DetalleCompra lista={lista} />
  // key: reinicia los campos editables si cambia la lista
  return <Editor key={lista.id} lista={lista} />
}

function Editor({ lista }: { lista: Lista }) {
  const id = lista.id!
  const [nombreLista, setNombreLista] = useState(lista.nombre)
  const [presupuestoTxt, setPresupuestoTxt] = useState(montoAEditable(lista.presupuesto))
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState('1')
  const inputNombreRef = useRef<HTMLInputElement>(null)

  const items = useLiveQuery(() => obtenerItems(id), [id]) ?? []
  const catalogo = useLiveQuery(() => obtenerPreciosCatalogo(), []) ?? new Map<string, number>()
  const productos = useLiveQuery(() => db.productos.orderBy('nombre').toArray(), []) ?? []

  const totales = calcularTotales(items, lista.presupuesto, catalogo, normalizarNombre)
  const nivelEstimado = calcularNivel(totales.estimado, lista.presupuesto)

  function guardarNombreLista() {
    const limpio = nombreLista.trim()
    if (!limpio) return setNombreLista(lista.nombre)
    if (limpio !== lista.nombre) actualizarLista(id, { nombre: limpio })
  }

  function guardarPresupuesto() {
    if (!presupuestoTxt.trim()) {
      actualizarLista(id, { presupuesto: null })
      return
    }
    const centavos = parsearMonto(presupuestoTxt)
    if (centavos == null || centavos <= 0) {
      // Valor inválido: se restaura el anterior
      setPresupuestoTxt(montoAEditable(lista.presupuesto))
      return
    }
    actualizarLista(id, { presupuesto: centavos })
  }

  async function onAgregar(e: FormEvent) {
    e.preventDefault()
    const cantidad = parsearCantidad(nuevaCantidad)
    const nombre = nuevoNombre
    if (!nombre.trim() || cantidad == null) return
    // Se limpia antes de guardar para no pisar lo que el usuario tipee mientras tanto
    setNuevoNombre('')
    setNuevaCantidad('1')
    inputNombreRef.current?.focus() // carga rápida de varios productos
    await agregarItem(id, { nombre, cantidad })
  }

  async function onEliminarLista() {
    if (!window.confirm(`¿Eliminar la lista "${lista.nombre}" y todos sus productos?`)) return
    await eliminarLista(id)
    navegar({ pantalla: 'listas' })
  }

  return (
    <>
      <header className="encabezado">
        <button className="btn-volver" onClick={() => navegar({ pantalla: 'listas' })}>
          ‹ Listas
        </button>
        <input
          className="titulo-editable"
          value={nombreLista}
          onChange={(e) => setNombreLista(e.target.value)}
          onBlur={guardarNombreLista}
          aria-label="Nombre de la lista"
        />
      </header>

      <main className="contenido con-barra-inferior">
        <label className="campo">
          <span>Presupuesto máximo (opcional)</span>
          <div className="input-moneda">
            <span>$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ej: 50.000"
              value={presupuestoTxt}
              onChange={(e) => setPresupuestoTxt(e.target.value)}
              onBlur={guardarPresupuesto}
            />
          </div>
        </label>

        <form className="fila-form" onSubmit={onAgregar}>
          <input
            ref={inputNombreRef}
            type="text"
            placeholder="Producto"
            list="catalogo-productos"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            enterKeyHint="next"
            aria-label="Nombre del producto"
            autoCapitalize="sentences"
          />
          <input
            className="input-cantidad"
            type="text"
            inputMode="decimal"
            value={nuevaCantidad}
            onChange={(e) => setNuevaCantidad(e.target.value)}
            aria-label="Cantidad"
          />
          <button type="submit" className="btn btn-primario" disabled={!nuevoNombre.trim()}>
            +
          </button>
          <datalist id="catalogo-productos">
            {productos.map((p) => (
              <option key={p.clave} value={p.nombre} />
            ))}
          </datalist>
        </form>

        {items.length === 0 ? (
          <p className="vacio">Agregá los productos que querés comprar.</p>
        ) : (
          <ul className="items">
            {items.map((item) => (
              <FilaItem key={item.id} item={item} precioCatalogo={catalogo.get(normalizarNombre(item.nombre))} />
            ))}
          </ul>
        )}

        <section className="resumen">
          <div className="resumen-fila">
            <span>Total estimado</span>
            <strong className={`nivel-${nivelEstimado}`}>{formatearMonto(totales.estimado)}</strong>
          </div>
          {totales.pendientesSinPrecio > 0 && (
            <p className="nota">
              {totales.pendientesSinPrecio}{' '}
              {totales.pendientesSinPrecio === 1 ? 'producto sin precio conocido' : 'productos sin precio conocido'}
            </p>
          )}
          {lista.presupuesto != null && (
            <div className="resumen-fila">
              <span>Presupuesto</span>
              <span>{formatearMonto(lista.presupuesto)}</span>
            </div>
          )}
        </section>

        <button className="btn btn-peligro btn-bloque" onClick={onEliminarLista}>
          Eliminar lista
        </button>
      </main>

      <footer className="barra-inferior">
        <button
          className="btn btn-primario btn-bloque"
          disabled={items.length === 0}
          onClick={() => navegar({ pantalla: 'compra', id })}
        >
          Ir a comprar
        </button>
      </footer>
    </>
  )
}

function FilaItem({ item, precioCatalogo }: { item: Item; precioCatalogo?: number }) {
  const precio = item.precioUnitario ?? precioCatalogo

  function cambiarCantidad(delta: number) {
    const nueva = Math.round((item.cantidad + delta) * 1000) / 1000
    if (nueva > 0) actualizarItem(item.id!, { cantidad: nueva })
  }

  return (
    <li className="item">
      <div className="item-info">
        <span className="item-nombre">{item.nombre}</span>
        <span className="item-detalle">
          {precio != null ? `≈ ${formatearMonto(subtotal(precio, item.cantidad))}` : 'Sin precio'}
        </span>
      </div>
      <div className="stepper">
        <button onClick={() => cambiarCantidad(-1)} disabled={item.cantidad <= 1} aria-label="Restar">
          −
        </button>
        <span>{formatearCantidad(item.cantidad)}</span>
        <button onClick={() => cambiarCantidad(1)} aria-label="Sumar">
          +
        </button>
      </div>
      <button className="btn-icono" onClick={() => eliminarItem(item.id!)} aria-label={`Quitar ${item.nombre}`}>
        ×
      </button>
    </li>
  )
}
