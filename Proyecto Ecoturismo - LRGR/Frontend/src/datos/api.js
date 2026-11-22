import { cerrarSesion } from '../estado/sesion.js'

export const urlApi = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')

export const usaApi = urlApi !== ''

export async function pedir(ruta, opciones = {}) {
  const encabezados = { Accept: 'application/json' }
  if (opciones.cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json'
  }
  if (opciones.token) {
    encabezados.Authorization = 'Bearer ' + opciones.token
  }

  let respuesta
  try {
    respuesta = await fetch(urlApi + ruta, {
      method: opciones.metodo || 'GET',
      headers: encabezados,
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined
    })
  } catch (error) {
    throw { estado: 0, error: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.' }
  }

  let datos = null
  try {
    datos = await respuesta.json()
  } catch (error) {
    datos = null
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && opciones.token) {
      cerrarSesion()
    }
    const mensaje = datos && datos.error ? datos.error : 'El servidor respondió con un error (' + respuesta.status + ').'
    throw { estado: respuesta.status, error: mensaje }
  }

  return datos
}
