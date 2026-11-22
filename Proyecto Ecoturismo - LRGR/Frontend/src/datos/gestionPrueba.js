import { usuarios, esperar, errorApi, usuarioDelToken } from './cuentaPrueba.js'
import { municipios, obtenerSalidas, agregarSalida } from './catalogoPrueba.js'

function haceDias(dias) {
  return new Date(Date.now() - dias * 86400000).toISOString()
}

const publicaciones = [
  {
    id_publicacion: '1',
    id_anfitrion: '2',
    id_municipio: '3',
    tipo: 'alojamiento',
    categoria: 'Finca',
    titulo: 'Finca El Roble',
    descripcion: 'Casa campesina entre cafetales, a 10 minutos del parque principal.',
    precio_base: '280000.00',
    capacidad: 4,
    direccion_exacta: 'Vereda Llano Grande, finca El Roble',
    normas: 'No se permiten fiestas ni eventos. Silencio desde las 10:00 p. m.',
    estado_moderacion: 'aprobada',
    motivo: null,
    pausada: false,
    creada_en: haceDias(60)
  },
  {
    id_publicacion: '5',
    id_anfitrion: '2',
    id_municipio: '3',
    tipo: 'actividad',
    categoria: 'Senderismo',
    titulo: 'Caminata al Valle de Cocora',
    descripcion: 'Recorrido guiado de 5 horas entre palmas de cera, ríos y bosque de niebla.',
    precio_base: '90000.00',
    capacidad: 10,
    direccion_exacta: 'Parque principal de Salento, frente a la iglesia',
    normas: 'Usar ropa y calzado adecuados. No dejar basura en el sendero.',
    estado_moderacion: 'aprobada',
    motivo: null,
    pausada: false,
    creada_en: haceDias(45)
  },
  {
    id_publicacion: '7',
    id_anfitrion: '2',
    id_municipio: '5',
    tipo: 'alojamiento',
    categoria: 'Glamping',
    titulo: 'Casa del árbol en Minca',
    descripcion: 'Cabaña elevada entre la selva, con vista a la Sierra Nevada.',
    precio_base: '320000.00',
    capacidad: 2,
    direccion_exacta: 'Vía Minca - Pozo Azul, kilómetro 3',
    normas: 'No se admiten mascotas.',
    estado_moderacion: 'rechazada',
    motivo: 'Faltan fotos del lugar y la dirección no es clara.',
    pausada: false,
    creada_en: haceDias(20)
  },
  {
    id_publicacion: '6',
    id_anfitrion: '2',
    id_municipio: '1',
    tipo: 'alojamiento',
    categoria: 'Cabaña',
    titulo: 'Cabaña frente al embalse de Tominé',
    descripcion: 'Cabaña de madera con chimenea y vista al embalse, a 10 minutos del pueblo.',
    precio_base: '180000.00',
    capacidad: 4,
    direccion_exacta: 'Vereda Montecillo, kilómetro 2 vía Sesquilé',
    normas: 'Silencio después de las 10 p. m. No se permiten fiestas.',
    estado_moderacion: 'en_revision',
    motivo: null,
    pausada: false,
    creada_en: haceDias(2)
  },
  {
    id_publicacion: '8',
    id_anfitrion: '3',
    id_municipio: '4',
    tipo: 'actividad',
    categoria: 'Deportes de aventura',
    titulo: 'Rafting en el río Fonce',
    descripcion: 'Descenso de 2 horas por rápidos de nivel 3 con guías certificados.',
    precio_base: '90000.00',
    capacidad: 8,
    direccion_exacta: 'Malecón del río Fonce, San Gil',
    normas: 'Saber nadar. Seguir siempre las indicaciones del guía.',
    estado_moderacion: 'en_revision',
    motivo: null,
    pausada: false,
    creada_en: haceDias(1)
  }
]

let siguienteSalida = 100

function conRol(token, rol, mensaje) {
  const usuario = usuarioDelToken(token)
  if (!usuario.roles.includes(rol)) {
    throw errorApi(403, mensaje)
  }
  return usuario
}

function faltante(datos, campos) {
  return campos.find((campo) => datos[campo] === undefined || datos[campo] === null || String(datos[campo]).trim() === '')
}

const camposComunes = [
  'id_municipio',
  'categoria',
  'titulo',
  'descripcion',
  'precio_base',
  'capacidad',
  'direccion_exacta',
  'latitud',
  'longitud',
  'normas'
]

const camposAlojamiento = ['hora_entrada', 'hora_salida']

const camposActividad = [
  'dificultad',
  'requisitos_participante',
  'equipo_incluido',
  'guia_incluido',
  'tiene_seguro',
  'detalle_seguridad'
]

export async function obtenerMisPublicaciones(token) {
  await esperar()
  const usuario = conRol(token, 'anfitrion', 'Solo un anfitrión puede hacer esto.')
  return publicaciones
    .filter((item) => item.id_anfitrion === usuario.id_usuario)
    .sort((a, b) => new Date(b.creada_en) - new Date(a.creada_en))
    .map((item) => ({
      id_publicacion: item.id_publicacion,
      tipo: item.tipo,
      titulo: item.titulo,
      precio_base: item.precio_base,
      estado_moderacion: item.estado_moderacion,
      motivo: item.motivo,
      pausada: item.pausada,
      creada_en: item.creada_en
    }))
}

export async function crearPublicacion(token, datos) {
  await esperar()
  const usuario = conRol(token, 'anfitrion', 'Solo un anfitrión puede publicar.')
  if (datos.tipo !== 'alojamiento' && datos.tipo !== 'actividad') {
    throw errorApi(400, 'El tipo debe ser alojamiento o actividad.')
  }
  const campos = [...camposComunes, ...(datos.tipo === 'alojamiento' ? camposAlojamiento : camposActividad)]
  const falta = faltante(datos, campos)
  if (falta) {
    throw errorApi(400, 'Falta el dato: ' + falta)
  }
  if (usuario.estado_verificacion !== 'aprobado') {
    throw errorApi(400, 'El anfitrion debe estar activo y tener el RNT verificado.')
  }
  if (!(Number(datos.precio_base) > 0) || !(Number(datos.capacidad) > 0)) {
    throw errorApi(400, 'El precio y la capacidad deben ser mayores que cero.')
  }
  const latitud = Number(datos.latitud)
  const longitud = Number(datos.longitud)
  if (!(latitud >= -4.3 && latitud <= 13.5 && longitud >= -82 && longitud <= -66.8)) {
    throw errorApi(400, 'Las coordenadas deben quedar dentro de Colombia.')
  }
  const nueva = {
    id_publicacion: String(Math.max(...publicaciones.map((item) => Number(item.id_publicacion))) + 1),
    id_anfitrion: usuario.id_usuario,
    id_municipio: String(datos.id_municipio),
    tipo: datos.tipo,
    categoria: String(datos.categoria).trim(),
    titulo: String(datos.titulo).trim(),
    descripcion: String(datos.descripcion).trim(),
    precio_base: Number(datos.precio_base).toFixed(2),
    capacidad: Number(datos.capacidad),
    direccion_exacta: String(datos.direccion_exacta).trim(),
    normas: String(datos.normas).trim(),
    estado_moderacion: 'en_revision',
    motivo: null,
    pausada: false,
    creada_en: new Date().toISOString()
  }
  publicaciones.push(nueva)
  return {
    id_publicacion: nueva.id_publicacion,
    titulo: nueva.titulo,
    tipo: nueva.tipo,
    estado_moderacion: nueva.estado_moderacion
  }
}

export async function crearSalida(token, idPublicacion, datos) {
  await esperar()
  const usuario = conRol(token, 'anfitrion', 'Solo un anfitrión puede hacer esto.')
  const actividad = publicaciones.find(
    (item) =>
      item.id_publicacion === String(idPublicacion) && item.id_anfitrion === usuario.id_usuario && item.tipo === 'actividad'
  )
  if (!actividad) {
    throw errorApi(404, 'No encontramos esa actividad entre las tuyas.')
  }
  const inicio = new Date(datos.inicio)
  const fin = new Date(datos.fin)
  const capacidad = Number(datos.capacidad_total)
  if (Number.isNaN(inicio.getTime()) || inicio <= new Date()) {
    throw errorApi(400, 'La salida debe ser a futuro.')
  }
  if (Number.isNaN(fin.getTime()) || fin <= inicio) {
    throw errorApi(400, 'El fin de la salida debe ser después del inicio.')
  }
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > actividad.capacidad) {
    throw errorApi(400, 'Los cupos deben estar entre 1 y ' + actividad.capacidad + ', la capacidad de la actividad.')
  }
  const existentes = await obtenerSalidas(actividad.id_publicacion)
  if (existentes.some((salida) => new Date(salida.inicio).getTime() === inicio.getTime())) {
    throw errorApi(409, 'Ya tienes una salida a esa hora.')
  }
  siguienteSalida += 1
  agregarSalida(actividad.id_publicacion, {
    id: siguienteSalida,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    capacidadTotal: capacidad,
    cuposDisponibles: capacidad
  })
  return {
    id_salida: String(siguienteSalida),
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    capacidad_total: capacidad
  }
}

export async function obtenerPublicacionesEnRevision(token) {
  await esperar()
  conRol(token, 'administrador', 'Solo un administrador puede hacer esto.')
  return publicaciones
    .filter((item) => item.estado_moderacion === 'en_revision')
    .sort((a, b) => new Date(a.creada_en) - new Date(b.creada_en))
    .map((item) => {
      const municipio = municipios.find((lugar) => lugar.id_municipio === item.id_municipio) || {}
      const anfitrion = usuarios.find((persona) => persona.id_usuario === item.id_anfitrion) || {}
      return {
        id_publicacion: item.id_publicacion,
        tipo: item.tipo,
        categoria: item.categoria,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio_base: item.precio_base,
        capacidad: item.capacidad,
        direccion_exacta: item.direccion_exacta,
        normas: item.normas,
        municipio: municipio.nombre || '',
        departamento: municipio.departamento || '',
        anfitrion: anfitrion.nombre || '',
        creada_en: item.creada_en
      }
    })
}

export async function decidirPublicacion(token, idPublicacion, { decision, motivo }) {
  await esperar()
  conRol(token, 'administrador', 'Solo un administrador puede hacer esto.')
  if (decision !== 'aprobada' && decision !== 'rechazada') {
    throw errorApi(400, 'La decisión debe ser aprobada o rechazada.')
  }
  if (decision === 'rechazada' && !String(motivo || '').trim()) {
    throw errorApi(400, 'Para rechazar hay que escribir el motivo.')
  }
  const publicacion = publicaciones.find(
    (item) => item.id_publicacion === String(idPublicacion) && item.estado_moderacion === 'en_revision'
  )
  if (!publicacion) {
    throw errorApi(404, 'No hay una publicación en revisión con ese id.')
  }
  publicacion.estado_moderacion = decision
  publicacion.motivo = motivo ? String(motivo).trim() : null
  return {
    id_publicacion: publicacion.id_publicacion,
    titulo: publicacion.titulo,
    estado_moderacion: publicacion.estado_moderacion,
    motivo: publicacion.motivo
  }
}

export async function obtenerAnfitrionesPendientes(token) {
  await esperar()
  conRol(token, 'administrador', 'Solo un administrador puede hacer esto.')
  return usuarios
    .filter((item) => item.roles.includes('anfitrion') && item.estado_verificacion === 'pendiente')
    .map((item) => ({
      id_usuario: item.id_usuario,
      nombre: item.nombre,
      correo: item.correo,
      numero_rnt: item.numero_rnt,
      estado_rnt: 'pendiente',
      estado_verificacion: item.estado_verificacion
    }))
}

export async function decidirAnfitrion(token, idUsuario, { decision, motivo }) {
  await esperar()
  conRol(token, 'administrador', 'Solo un administrador puede hacer esto.')
  if (decision !== 'aprobado' && decision !== 'rechazado') {
    throw errorApi(400, 'La decisión debe ser aprobado o rechazado.')
  }
  if (decision === 'rechazado' && !String(motivo || '').trim()) {
    throw errorApi(400, 'Para rechazar hay que escribir el motivo.')
  }
  const anfitrion = usuarios.find(
    (item) => item.id_usuario === String(idUsuario) && item.estado_verificacion === 'pendiente'
  )
  if (!anfitrion) {
    throw errorApi(404, 'No hay un anfitrión pendiente con ese id.')
  }
  anfitrion.estado_verificacion = decision
  anfitrion.observacion_verificacion = motivo ? String(motivo).trim() : null
  return {
    id_usuario: anfitrion.id_usuario,
    numero_rnt: anfitrion.numero_rnt,
    estado_rnt: decision === 'aprobado' ? 'activo' : 'pendiente',
    estado_verificacion: anfitrion.estado_verificacion
  }
}
