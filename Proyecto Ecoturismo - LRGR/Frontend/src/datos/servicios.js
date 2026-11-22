import { pedir, usaApi } from './api.js'
import { adaptarPublicacion, adaptarDetalle, adaptarSalida, ubicarEnMapa, valoresPorDefecto } from './adaptadores.js'
import * as cuentaPrueba from './cuentaPrueba.js'
import * as catalogoPrueba from './catalogoPrueba.js'
import { contactoEmergenciaPerfil } from './publicaciones.js'
import { normalizarTexto } from '../utilidades/formato.js'

export { usaApi }

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
