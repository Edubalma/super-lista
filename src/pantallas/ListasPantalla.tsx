import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { db } from '../db/database'
import { crearLista } from '../db/repositorio'
import { exportarRespaldo, importarRespaldo, leerRespaldo } from '../db/respaldo'
import { formatearFecha } from '../utils/fecha'
import { formatearMonto } from '../utils/moneda'
import { navegar } from '../utils/navegacion'

export function ListasPantalla() {
  const [nombre, setNombre] = useState('')

  const listas = useLiveQuery(async () => {
    const activas = await db.listas.where('estado').equals('activa').reverse().sortBy('creadaEn')
    return Promise.all(
      activas.map(async (l) => ({
        ...l,
        cantidadItems: await db.items.where('listaId').equals(l.id!).count(),
      })),
    )
  }, [])

  const historial = useLiveQuery(
    () => db.listas.where('estado').equals('cerrada').reverse().sortBy('cerradaEn'),
    [],
  )

  const inputArchivoRef = useRef<HTMLInputElement>(null)

  async function onImportar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite elegir el mismo archivo otra vez
    if (!archivo) return
    try {
      const datos = await leerRespaldo(archivo)
      const ok = window.confirm(
        `Se van a REEMPLAZAR todos tus datos actuales por los del respaldo ` +
          `(${datos.listas.length} ${datos.listas.length === 1 ? 'lista' : 'listas'}). ¿Continuar?`,
      )
      if (!ok) return
      await importarRespaldo(datos)
      window.alert('Respaldo restaurado.')
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  async function onCrear(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    const id = await crearLista(nombre)
    setNombre('')
    navegar({ pantalla: 'lista', id })
  }

  return (
    <>
      <header className="encabezado">
        <h1>Mis listas</h1>
      </header>

      <main className="contenido">
        <form className="fila-form" onSubmit={onCrear}>
          <input
            type="text"
            placeholder="Nueva lista (ej: Super semana)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            enterKeyHint="done"
            aria-label="Nombre de la nueva lista"
          />
          <button type="submit" className="btn btn-primario" disabled={!nombre.trim()}>
            Crear
          </button>
        </form>

        {listas?.length === 0 && (
          <p className="vacio">
            {historial?.length ? 'No tenés listas activas.' : 'Todavía no tenés listas. Creá la primera arriba.'}
          </p>
        )}

        <ul className="tarjetas">
          {listas?.map((l) => (
            <li key={l.id}>
              <button className="tarjeta" onClick={() => navegar({ pantalla: 'lista', id: l.id! })}>
                <span className="tarjeta-titulo">{l.nombre}</span>
                <span className="tarjeta-detalle">
                  {l.cantidadItems} {l.cantidadItems === 1 ? 'producto' : 'productos'}
                  {l.presupuesto != null && ` · Presupuesto ${formatearMonto(l.presupuesto)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {historial && historial.length > 0 && (
          <>
            <h3 className="seccion">
              Historial <span>{historial.length}</span>
            </h3>
            <ul className="tarjetas">
              {historial.map((l) => (
                <li key={l.id}>
                  <button className="tarjeta tarjeta-historial" onClick={() => navegar({ pantalla: 'lista', id: l.id! })}>
                    <span className="tarjeta-fila">
                      <span className="tarjeta-titulo">{l.nombre}</span>
                      <strong>{formatearMonto(l.totalFinal ?? 0)}</strong>
                    </span>
                    <span className="tarjeta-detalle">{l.cerradaEn ? formatearFecha(l.cerradaEn) : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <section className="respaldo">
          <h3 className="seccion">Respaldo</h3>
          <p className="nota">Guardá una copia de tus listas y precios por si cambiás o reseteás el teléfono.</p>
          <div className="fila-botones">
            <button className="btn" onClick={() => exportarRespaldo()}>
              Exportar
            </button>
            <button className="btn" onClick={() => inputArchivoRef.current?.click()}>
              Restaurar
            </button>
          </div>
          <input ref={inputArchivoRef} type="file" accept="application/json,.json" hidden onChange={onImportar} />
        </section>
      </main>
    </>
  )
}
