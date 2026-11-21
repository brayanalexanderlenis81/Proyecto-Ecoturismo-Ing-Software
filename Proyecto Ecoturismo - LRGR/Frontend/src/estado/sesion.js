import { reactive } from 'vue'

const clave = 'sesionEcoturismo'
const duracionToken = 2 * 60 * 60 * 1000

function leerGuardada() {
  try {
    const guardada = JSON.parse(localStorage.getItem(clave))
    if (guardada && guardada.token && guardada.expira > Date.now()) {
      return guardada
    }
  } catch (error) {
    return null
  }
  return null
}

const guardada = leerGuardada()

export const sesion = reactive({
  token: guardada ? guardada.token : null,
  usuario: guardada ? guardada.usuario : null,
  expira: guardada ? guardada.expira : 0
})

export function haySesion() {
  return Boolean(sesion.token) && sesion.expira > Date.now()
}

export function guardarSesion(token, usuario) {
  sesion.token = token
  sesion.usuario = usuario
  sesion.expira = Date.now() + duracionToken
  try {
    localStorage.setItem(clave, JSON.stringify({ token, usuario, expira: sesion.expira }))
  } catch (error) {
    return
  }
}

export function cerrarSesion() {
  sesion.token = null
  sesion.usuario = null
  sesion.expira = 0
  try {
    localStorage.removeItem(clave)
  } catch (error) {
    return
  }
}

export function primerNombre() {
  return sesion.usuario ? sesion.usuario.nombre.split(' ')[0] : ''
}
