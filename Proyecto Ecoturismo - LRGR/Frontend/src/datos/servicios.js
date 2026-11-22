import { pedir, usaApi } from './api.js'
import { adaptarPublicacion, adaptarDetalle, adaptarSalida, ubicarEnMapa, valoresPorDefecto } from './adaptadores.js'
import * as cuentaPrueba from './cuentaPrueba.js'
import * as catalogoPrueba from './catalogoPrueba.js'
import * as gestionPrueba from './gestionPrueba.js'
import { contactoEmergenciaPerfil } from './publicaciones.js'
import { normalizarTexto } from '../utilidades/formato.js'

export { usaApi }

const nubeCloudinary = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim()
const presetCloudinary = (import.meta.env.VITE_CLOUDINARY_PRESET || '').trim()

export const usaCloudinary = nubeCloudinary !== '' && presetCloudinary !== ''

export async function subirFoto(archivo) {
  const datos = new FormData()
  datos.append('file', archivo)
  datos.append('upload_preset', presetCloudinary)
  let respuesta
  try {
    respuesta = await fetch('https://api.cloudinary.com/v1_1/' + nubeCloudinary + '/image/upload', {
      method: 'POST',
      body: datos
    })
  } catch (error) {
    throw { estado: 0, error: 'No pudimos conectar para subir la foto.' }
  }
  const resultado = await respuesta.json().catch(() => null)
  if (!respuesta.ok || !resultado || !resultado.secure_url) {
    const mensaje = resultado && resultado.error ? resultado.error.message : 'No se pudo subir la foto.'
    throw { estado: respuesta.status, error: mensaje }
  }
  return resultado.secure_url
}

let municipiosGuardados = null

export function iniciarSesion(credenciales) {
  if (!usaApi) {
    return cuentaPrueba.iniciarSesion(credenciales)
  }
  return pedir('/api/login', { metodo: 'POST', cuerpo: credenciales })
}

export function registrarCuenta(datos) {
  if (!usaApi) {
    return cuentaPrueba.registrarCuenta(datos)
  }
  return pedir('/api/registro', { metodo: 'POST', cuerpo: datos })
}

export function obtenerPerfil(token) {
  if (!usaApi) {
    return cuentaPrueba.obtenerPerfil(token)
  }
  return pedir('/api/perfil', { token })
}

export function obtenerMisReservas(token) {
  if (!usaApi) {
    return cuentaPrueba.obtenerMisReservas(token)
  }
  return pedir('/api/mis-reservas', { token })
}

export function cancelarReserva(token, idReserva) {
  if (!usaApi) {
    return cuentaPrueba.cancelarReserva(token, idReserva)
  }
  return pedir('/api/reservas/' + idReserva + '/cancelar', { metodo: 'POST', token })
}

export function crearResena(token, idReserva, resena) {
  if (!usaApi) {
    return cuentaPrueba.crearResena(token, idReserva, resena)
  }
  return pedir('/api/reservas/' + idReserva + '/resena', { metodo: 'POST', cuerpo: resena, token })
}

export function crearReserva(token, datos) {
  if (!usaApi) {
    return cuentaPrueba.crearReserva(token, datos)
  }
  return pedir('/api/reservas', { metodo: 'POST', cuerpo: datos, token })
}

export function pagarReserva(token, datos) {
  if (!usaApi) {
    return cuentaPrueba.pagarReserva(token, datos)
  }
  return pedir('/api/pagos', { metodo: 'POST', cuerpo: datos, token })
}

export async function obtenerMunicipios() {
  if (!usaApi) {
    return catalogoPrueba.obtenerMunicipios()
  }
  if (!municipiosGuardados) {
    municipiosGuardados = pedir('/api/municipios').catch((problema) => {
      municipiosGuardados = null
      throw problema
    })
  }
  return municipiosGuardados
}

async function filtrosDeBusqueda({ destino, personas }) {
  const parametros = new URLSearchParams()
  const lugar = normalizarTexto(String(destino || '').split(',')[0])
  if (lugar !== '') {
    const municipios = await obtenerMunicipios()
    const municipio = municipios.find((item) => normalizarTexto(item.nombre) === lugar)
    if (municipio) {
      parametros.set('id_municipio', municipio.id_municipio)
    } else {
      parametros.set('q', String(destino).split(',')[0].trim())
    }
  }
  if (personas) {
    parametros.set('personas', personas)
  }
  const texto = parametros.toString()
  return texto ? '?' + texto : ''
}

async function completarResenas(publicacion, datos) {
  if (datos.cantidad_resenas !== undefined || publicacion.calificacion === null) {
    return publicacion
  }
  const resenas = await pedir('/api/publicaciones/' + publicacion.id + '/resenas')
  return { ...publicacion, totalResenas: resenas.length }
}

export async function buscarPublicaciones(busqueda) {
  if (!usaApi) {
    return catalogoPrueba.buscarPublicaciones(busqueda)
  }
  const filtros = await filtrosDeBusqueda(busqueda)
  const [alojamientos, actividades] = await Promise.all([
    pedir('/api/alojamientos' + filtros),
    pedir('/api/actividades' + filtros)
  ])
  const datos = [...alojamientos, ...actividades]
  const publicaciones = await Promise.all(datos.map((item) => completarResenas(adaptarPublicacion(item), item)))
  return ubicarEnMapa(publicaciones)
}

export async function obtenerPublicacion(id) {
  if (!usaApi) {
    return catalogoPrueba.obtenerPublicacion(id)
  }
  const [detalle, resenas] = await Promise.all([
    pedir('/api/publicaciones/' + id),
    pedir('/api/publicaciones/' + id + '/resenas')
  ])
  return adaptarDetalle(detalle, resenas)
}

export async function obtenerSalidas(id) {
  if (!usaApi) {
    return catalogoPrueba.obtenerSalidas(id)
  }
  const salidas = await pedir('/api/actividades/' + id + '/salidas')
  return salidas.map(adaptarSalida)
}

export function contactoEmergenciaInicial() {
  return usaApi ? { ...valoresPorDefecto.contactoEmergencia } : { ...contactoEmergenciaPerfil }
}

export function obtenerMisPublicaciones(token) {
  if (!usaApi) {
    return gestionPrueba.obtenerMisPublicaciones(token)
  }
  return pedir('/api/anfitrion/publicaciones', { token })
}

export function crearPublicacion(token, datos) {
  if (!usaApi) {
    return gestionPrueba.crearPublicacion(token, datos)
  }
  return pedir('/api/publicaciones', { metodo: 'POST', cuerpo: datos, token })
}

export async function crearSalida(token, idPublicacion, datos) {
  const salida = usaApi
    ? await pedir('/api/anfitrion/publicaciones/' + idPublicacion + '/salidas', { metodo: 'POST', cuerpo: datos, token })
    : await gestionPrueba.crearSalida(token, idPublicacion, datos)
  return adaptarSalida({ ...salida, cupos_disponibles: salida.capacidad_total })
}

export function obtenerPublicacionesEnRevision(token) {
  if (!usaApi) {
    return gestionPrueba.obtenerPublicacionesEnRevision(token)
  }
  return pedir('/api/admin/publicaciones', { token })
}

export function decidirPublicacion(token, idPublicacion, decision) {
  if (!usaApi) {
    return gestionPrueba.decidirPublicacion(token, idPublicacion, decision)
  }
  return pedir('/api/admin/publicaciones/' + idPublicacion, { metodo: 'PATCH', cuerpo: decision, token })
}

export function obtenerPublicacionesAprobadas(token) {
  if (!usaApi) {
    return gestionPrueba.obtenerPublicacionesAprobadas(token)
  }
  return pedir('/api/admin/publicaciones/aprobadas', { token })
}

export function retirarPublicacion(token, idPublicacion, motivo) {
  if (!usaApi) {
    return gestionPrueba.retirarPublicacion(token, idPublicacion, { motivo })
  }
  return pedir('/api/admin/publicaciones/' + idPublicacion + '/retirar', { metodo: 'PATCH', cuerpo: { motivo }, token })
}

export function obtenerAnfitrionesPendientes(token) {
  if (!usaApi) {
    return gestionPrueba.obtenerAnfitrionesPendientes(token)
  }
  return pedir('/api/admin/anfitriones', { token })
}

export function decidirAnfitrion(token, idUsuario, decision) {
  if (!usaApi) {
    return gestionPrueba.decidirAnfitrion(token, idUsuario, decision)
  }
  return pedir('/api/admin/anfitriones/' + idUsuario, { metodo: 'PATCH', cuerpo: decision, token })
}
