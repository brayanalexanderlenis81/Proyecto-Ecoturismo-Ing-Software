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

export const municipios = [
  { id_municipio: '1', nombre: 'Guatavita', departamento: 'Cundinamarca' },
  { id_municipio: '2', nombre: 'Villa de Leyva', departamento: 'Boyacá' },
  { id_municipio: '3', nombre: 'Salento', departamento: 'Quindío' },
  { id_municipio: '4', nombre: 'San Gil', departamento: 'Santander' },
  { id_municipio: '5', nombre: 'Santa Marta', departamento: 'Magdalena' },
  { id_municipio: '6', nombre: 'Filandia', departamento: 'Quindío' }
]

export async function obtenerMunicipios() {
  await esperar()
  return municipios
}

export async function obtenerSalidas(id) {
  await esperar()
  return salidas[Number(id)] || []
}

export function agregarSalida(idActividad, salida) {
  const id = Number(idActividad)
  if (!salidas[id]) {
    salidas[id] = []
  }
  salidas[id].push(salida)
  salidas[id].sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
}
