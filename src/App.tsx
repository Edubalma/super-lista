import { ArmarListaPantalla } from './pantallas/ArmarListaPantalla'
import { CompraPantalla } from './pantallas/CompraPantalla'
import { ListasPantalla } from './pantallas/ListasPantalla'
import { useRuta } from './utils/navegacion'

function App() {
  const ruta = useRuta()

  return (
    <div className="app">
      {ruta.pantalla === 'listas' && <ListasPantalla />}
      {ruta.pantalla === 'lista' && <ArmarListaPantalla id={ruta.id} />}
      {ruta.pantalla === 'compra' && <CompraPantalla id={ruta.id} />}
    </div>
  )
}

export default App
