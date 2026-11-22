import { publicaciones } from './publicaciones.js'
import { normalizarTexto } from '../utilidades/formato.js'

function esperar() {
  return new Promise((resolver) => setTimeout(resolver, 250))
}

function horaDesdeHoy(dias, hora) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  fecha.setHours(hora, 0, 0, 0)
  return fecha.toISOString()
}

const salidas = {
  5: [
    { id: 1, inicio: horaDesdeHoy(3, 8), fin: horaDesdeHoy(3, 13), capacidadTotal: 10, cuposDisponibles: 6 },
    { id: 2, inicio: horaDesdeHoy(7, 8), fin: horaDesdeHoy(7, 13), capacidadTotal: 10, cuposDisponibles: 10 }
  ]
}

function conVersion(publicacion) {
  return { ...publicacion, versionNormas: 'v1' }
}

export async function buscarPublicaciones({ destino }) {
  await esperar()
  const texto = normalizarTexto(destino)
  return publicaciones
    .filter(
      (publicacion) =>
        texto === '' ||
        texto.includes(normalizarTexto(publicacion.ciudad)) ||
        texto.includes(normalizarTexto(publicacion.departamento))
    )
    .map(conVersion)
}

export async function obtenerPublicacion(id) {
  await esperar()
  const publicacion = publicaciones.find((item) => item.id === Number(id))
  if (!publicacion) {
    throw { estado: 404, error: 'Esa publicación no existe o no está disponible.' }
  }
  return conVersion(publicacion)
}

export async function obtenerMunicipios() {
  await esperar()
  const vistos = new Map()
  publicaciones.forEach((item) => vistos.set(item.ciudad, item.departamento))
  return [...vistos].map(([nombre, departamento], indice) => ({ id_municipio: String(indice + 1), nombre, departamento }))
}

export async function obtenerSalidas(id) {
  await esperar()
  return salidas[Number(id)] || []
}
