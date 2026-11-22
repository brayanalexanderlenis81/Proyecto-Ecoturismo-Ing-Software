import { reactive } from 'vue'
import { busquedaInicial } from '../datos/publicaciones.js'
import { sumarDias } from '../utilidades/formato.js'

export const busqueda = reactive({
  ...busquedaInicial,
  fechaInicio: sumarDias('', 1),
  fechaFin: sumarDias('', 2)
})

export function actualizarBusqueda(nuevaBusqueda) {
  Object.assign(busqueda, nuevaBusqueda)
}
