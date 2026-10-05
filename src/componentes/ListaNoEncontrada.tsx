import { navegar } from '../utils/navegacion'

export function ListaNoEncontrada() {
  return (
    <main className="contenido">
      <p className="vacio">La lista no existe.</p>
      <button className="btn btn-bloque" onClick={() => navegar({ pantalla: 'listas' })}>
        Volver a mis listas
      </button>
    </main>
  )
}
