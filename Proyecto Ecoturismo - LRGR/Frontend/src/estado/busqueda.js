import { reactive } from 'vue'
import { busquedaInicial } from '../datos/publicaciones.js'

export const busqueda = reactive({ ...busquedaInicial })

export function actualizarBusqueda(nuevaBusqueda) {
  Object.assign(busqueda, nuevaBusqueda)
}
