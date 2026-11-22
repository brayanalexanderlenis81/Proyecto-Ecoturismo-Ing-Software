import { publicaciones } from './publicaciones.js'
import { obtenerSalidas } from './catalogoPrueba.js'

const contrasenaPrueba = 'Prueba123*'

const usuarios = [
  {
    id_usuario: '1',
    nombre: 'Administrador',
    correo: 'admin@ecoturismo.test',
    contrasena: contrasenaPrueba,
    telefono: '3000000001',
    estado_cuenta: 'activa',
    roles: ['administrador'],
    numero_rnt: null,
    estado_verificacion: null,
    observacion_verificacion: null
  },
  {
    id_usuario: '2',
    nombre: 'Laura Gómez',
    correo: 'laura@ecoturismo.test',
    contrasena: contrasenaPrueba,
    telefono: '3000000002',
    estado_cuenta: 'activa',
    roles: ['anfitrion'],
    numero_rnt: '123456',
    estado_verificacion: 'aprobado',
    observacion_verificacion: null
  },
  {
    id_usuario: '3',
    nombre: 'Carlos Ruiz',
    correo: 'carlos@ecoturismo.test',
    contrasena: contrasenaPrueba,
    telefono: '3000000003',
    estado_cuenta: 'activa',
    roles: ['anfitrion'],
    numero_rnt: '456789',
    estado_verificacion: 'aprobado',
    observacion_verificacion: null
  },
  {
    id_usuario: '4',
    nombre: 'Ana Ruiz',
    correo: 'ana@ecoturismo.test',
    contrasena: contrasenaPrueba,
    telefono: '3001234567',
    estado_cuenta: 'activa',
    roles: ['turista'],
    numero_rnt: null,
    estado_verificacion: null,
    observacion_verificacion: null
  },
  {
    id_usuario: '5',
    nombre: 'Andrés Patiño',
    correo: 'andres@ecoturismo.test',
    contrasena: contrasenaPrueba,
    telefono: '3007654321',
    estado_cuenta: 'activa',
    roles: ['turista'],
    numero_rnt: null,
    estado_verificacion: null,
    observacion_verificacion: null
  }
]

function fechaDesdeHoy(dias) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

function horaDesdeAhora(minutos) {
  return new Date(Date.now() + minutos * 60000).toISOString()
}

const reservas = [
  {
    id_usuario: '4',
    id_reserva: '23',
    estado_reserva: 'pendiente',
    id_publicacion: '1',
    titulo: 'Finca El Roble',
    tipo: 'alojamiento',
    municipio: 'Salento',
    fecha_entrada: fechaDesdeHoy(14),
    fecha_salida: fechaDesdeHoy(16),
    inicio: null,
    fin: null,
    personas: 2,
    subtotal: '560000.00',
    comision: '56000.00',
    total: '616000.00',
    expira_en: horaDesdeAhora(12),
    direccion_exacta: null
  },
  {
    id_usuario: '4',
    id_reserva: '21',
    estado_reserva: 'confirmada',
    id_publicacion: '2',
    titulo: 'Glamping Bosque de Niebla',
    tipo: 'alojamiento',
    municipio: 'Salento',
    fecha_entrada: fechaDesdeHoy(30),
    fecha_salida: fechaDesdeHoy(31),
    inicio: null,
    fin: null,
    personas: 2,
    subtotal: '350000.00',
    comision: '35000.00',
    total: '385000.00',
    expira_en: null,
    direccion_exacta: 'Vereda Boquía, kilómetro 3, entrada por el portón verde'
  },
  {
    id_usuario: '4',
    id_reserva: '18',
    estado_reserva: 'expirada',
    id_publicacion: '4',
    titulo: 'Glamping Mirador del Valle',
    tipo: 'alojamiento',
    municipio: 'Salento',
    fecha_entrada: fechaDesdeHoy(5),
    fecha_salida: fechaDesdeHoy(6),
    inicio: null,
    fin: null,
    personas: 2,
    subtotal: '390000.00',
    comision: '39000.00',
    total: '429000.00',
    expira_en: horaDesdeAhora(-2880),
    direccion_exacta: null
  },
  {
    id_usuario: '4',
    id_reserva: '15',
    estado_reserva: 'cancelada',
    id_publicacion: '3',
    titulo: 'Finca Los Cafetales',
    tipo: 'alojamiento',
    municipio: 'Filandia',
    fecha_entrada: fechaDesdeHoy(-20),
    fecha_salida: fechaDesdeHoy(-18),
    inicio: null,
    fin: null,
    personas: 4,
    subtotal: '460000.00',
    comision: '46000.00',
    total: '506000.00',
    expira_en: null,
    direccion_exacta: null
  },
  {
    id_usuario: '4',
    id_reserva: '9',
    estado_reserva: 'completada',
    id_publicacion: '5',
    titulo: 'Caminata al Valle de Cocora',
    tipo: 'actividad',
    municipio: 'Salento',
    fecha_entrada: null,
    fecha_salida: null,
    inicio: '2026-10-12T13:00:00.000Z',
    fin: '2026-10-12T18:00:00.000Z',
    personas: 2,
    subtotal: '180000.00',
    comision: '18000.00',
    total: '198000.00',
    expira_en: null,
    direccion_exacta: 'Parque principal de Salento, frente a la iglesia'
  }
]

const resenas = []

const pagos = []

function esperar() {
  return new Promise((resolver) => setTimeout(resolver, 300))
}

function errorApi(estado, error) {
  return { estado, error }
}

function usuarioDelToken(token) {
  const id = String(token || '').replace('token-prueba-', '')
  const usuario = usuarios.find((item) => item.id_usuario === id)
  if (!usuario) {
    throw errorApi(401, 'Inicia sesión para continuar.')
  }
  return usuario
}

function reservaDelUsuario(token, idReserva) {
  const usuario = usuarioDelToken(token)
  return reservas.find((item) => item.id_reserva === String(idReserva) && item.id_usuario === usuario.id_usuario)
}

function sinDatosPrivados(reserva) {
  const { id_usuario, ...publica } = reserva
  const conDireccion = reserva.estado_reserva === 'confirmada' || reserva.estado_reserva === 'completada'
  return { ...publica, direccion_exacta: conDireccion ? reserva.direccion_exacta : null }
}

export async function iniciarSesion({ correo, contrasena }) {
  await esperar()
  const usuario = usuarios.find((item) => item.correo === String(correo).trim().toLowerCase())
  if (!usuario || usuario.contrasena !== contrasena) {
    throw errorApi(401, 'Correo o contraseña incorrectos.')
  }
  if (usuario.estado_cuenta !== 'activa') {
    throw errorApi(403, 'Tu cuenta está suspendida.')
  }
  return {
    token: 'token-prueba-' + usuario.id_usuario,
    usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, roles: usuario.roles }
  }
}

export async function registrarCuenta(datos) {
  await esperar()
  const nombre = String(datos.nombre || '').trim()
  const correo = String(datos.correo || '').trim().toLowerCase()
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/.test(nombre)) {
    throw errorApi(400, 'El nombre solo admite letras y espacios.')
  }
  if (!/^\S+@\S+\.\S+$/.test(correo)) {
    throw errorApi(400, 'El correo no es válido.')
  }
  if (String(datos.contrasena || '').length < 8) {
    throw errorApi(400, 'La contraseña debe tener al menos 8 caracteres.')
  }
  if (!/^\d{7,15}$/.test(String(datos.telefono || ''))) {
    throw errorApi(400, 'El teléfono debe tener de 7 a 15 números.')
  }
  if (datos.rol !== 'turista' && datos.rol !== 'anfitrion') {
    throw errorApi(400, 'El rol debe ser turista o anfitrion.')
  }
  if (datos.rol === 'anfitrion' && !String(datos.numero_rnt || '').trim()) {
    throw errorApi(400, 'Falta el dato: numero_rnt')
  }
  if (datos.acepta_datos !== true) {
    throw errorApi(400, 'Debes aceptar la política de tratamiento de datos.')
  }
  if (usuarios.some((item) => item.correo === correo)) {
    throw errorApi(409, 'Ese correo ya está registrado.')
  }
  if (datos.rol === 'anfitrion' && usuarios.some((item) => item.numero_rnt === String(datos.numero_rnt).trim())) {
    throw errorApi(409, 'Ese RNT ya está registrado.')
  }
  const nuevo = {
    id_usuario: String(usuarios.length + 1),
    nombre,
    correo,
    contrasena: datos.contrasena,
    telefono: datos.telefono,
    estado_cuenta: 'activa',
    roles: [datos.rol],
    numero_rnt: datos.rol === 'anfitrion' ? String(datos.numero_rnt).trim() : null,
    estado_verificacion: datos.rol === 'anfitrion' ? 'pendiente' : null,
    observacion_verificacion: null
  }
  usuarios.push(nuevo)
  return { id_usuario: nuevo.id_usuario, nombre: nuevo.nombre, correo: nuevo.correo, rol: datos.rol }
}

export async function obtenerPerfil(token) {
  await esperar()
  const usuario = usuarioDelToken(token)
  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    telefono: usuario.telefono,
    estado_cuenta: usuario.estado_cuenta,
    roles: usuario.roles,
    numero_rnt: usuario.numero_rnt,
    estado_verificacion: usuario.estado_verificacion,
    observacion_verificacion: usuario.observacion_verificacion
  }
}

export async function obtenerMisReservas(token) {
  await esperar()
  const usuario = usuarioDelToken(token)
  return reservas
    .filter((item) => item.id_usuario === usuario.id_usuario)
    .sort((a, b) => Number(b.id_reserva) - Number(a.id_reserva))
    .map(sinDatosPrivados)
}

export async function cancelarReserva(token, idReserva) {
  await esperar()
  const reserva = reservaDelUsuario(token, idReserva)
  if (!reserva || (reserva.estado_reserva !== 'pendiente' && reserva.estado_reserva !== 'confirmada')) {
    throw errorApi(404, 'Esa reserva no existe o ya no se puede cancelar.')
  }
  const inicio = reserva.fecha_entrada ? new Date(reserva.fecha_entrada + 'T00:00:00') : new Date(reserva.inicio)
  if (reserva.estado_reserva === 'confirmada' && inicio <= new Date()) {
    throw errorApi(400, 'La reserva ya empezó y no se puede cancelar.')
  }
  reserva.estado_reserva = 'cancelada'
  return { id_reserva: reserva.id_reserva, estado_reserva: reserva.estado_reserva }
}

export async function crearResena(token, idReserva, { calificacion, comentario }) {
  await esperar()
  const reserva = reservaDelUsuario(token, idReserva)
  if (!reserva) {
    throw errorApi(404, 'Esa reserva no existe.')
  }
  if (reserva.estado_reserva !== 'completada') {
    throw errorApi(400, 'La experiencia aun no ha terminado.')
  }
  if (resenas.some((item) => item.id_reserva === reserva.id_reserva)) {
    throw errorApi(409, 'Ya dejaste una reseña para esta reserva.')
  }
  const valor = Number(calificacion)
  if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
    throw errorApi(400, 'La calificación debe ser de 1 a 5.')
  }
  const resena = {
    id_resena: String(resenas.length + 1),
    id_reserva: reserva.id_reserva,
    calificacion: valor,
    comentario: String(comentario || '').trim(),
    creada_en: new Date().toISOString()
  }
  resenas.push(resena)
  const { id_reserva, ...respuesta } = resena
  return respuesta
}

function noches(entrada, salida) {
  return Math.round((new Date(salida + 'T00:00:00') - new Date(entrada + 'T00:00:00')) / 86400000)
}

function seCruzan(reserva, entrada, salida) {
  const vigente =
    reserva.estado_reserva === 'confirmada' ||
    (reserva.estado_reserva === 'pendiente' && new Date(reserva.expira_en) > new Date())
  return vigente && reserva.fecha_entrada < salida && entrada < reserva.fecha_salida
}

export async function crearReserva(token, datos) {
  await esperar()
  const usuario = usuarioDelToken(token)
  const publicacion = publicaciones.find((item) => item.id === Number(datos.id_publicacion))
  if (!publicacion) {
    throw errorApi(404, 'La publicación no existe')
  }
  const personas = Number(datos.personas)
  let cantidad = personas
  let salida = null
  if (publicacion.tipo === 'Actividad') {
    const lista = await obtenerSalidas(publicacion.id)
    salida = lista.find((item) => item.id === Number(datos.id_salida))
    if (!salida) {
      throw errorApi(400, 'Esa salida no existe o ya pasó.')
    }
    if (salida.cuposDisponibles < personas) {
      throw errorApi(400, 'No hay cupos suficientes para esa salida.')
    }
  } else {
    cantidad = noches(datos.fecha_entrada, datos.fecha_salida)
    if (!(cantidad > 0)) {
      throw errorApi(400, 'La fecha de salida debe ser después de la de entrada.')
    }
    const ocupada = reservas.some(
      (item) => item.id_publicacion === String(publicacion.id) && seCruzan(item, datos.fecha_entrada, datos.fecha_salida)
    )
    if (ocupada) {
      throw errorApi(409, 'Esas fechas ya están reservadas.')
    }
  }
  const subtotal = publicacion.precio * cantidad
  const comision = Math.round(subtotal * 0.1)
  const nueva = {
    id_usuario: usuario.id_usuario,
    id_reserva: String(Math.max(...reservas.map((item) => Number(item.id_reserva))) + 1),
    estado_reserva: 'pendiente',
    id_publicacion: String(publicacion.id),
    titulo: publicacion.nombre,
    tipo: publicacion.tipo === 'Actividad' ? 'actividad' : 'alojamiento',
    municipio: publicacion.ciudad,
    fecha_entrada: salida ? null : datos.fecha_entrada,
    fecha_salida: salida ? null : datos.fecha_salida,
    inicio: salida ? salida.inicio : null,
    fin: salida ? salida.fin : null,
    personas,
    subtotal: subtotal.toFixed(2),
    comision: comision.toFixed(2),
    total: (subtotal + comision).toFixed(2),
    expira_en: horaDesdeAhora(15),
    direccion_exacta: 'Dirección de prueba en ' + publicacion.ciudad + ', ' + publicacion.departamento
  }
  reservas.push(nueva)
  return {
    id_reserva: nueva.id_reserva,
    estado_reserva: nueva.estado_reserva,
    subtotal: nueva.subtotal,
    comision: nueva.comision,
    total: nueva.total,
    expira_en: nueva.expira_en
  }
}

export async function pagarReserva(token, datos) {
  await esperar()
  const reserva = reservaDelUsuario(token, datos.id_reserva)
  if (!reserva) {
    throw errorApi(404, 'No encontramos esa reserva entre las tuyas.')
  }
  const repetido = pagos.find((item) => item.clave_idempotencia === datos.clave_idempotencia)
  if (repetido) {
    return { ...repetido.respuesta, estado_reserva: reserva.estado_reserva }
  }
  if (reserva.estado_reserva !== 'pendiente' || new Date(reserva.expira_en) <= new Date()) {
    throw errorApi(400, 'Solo se paga una reserva pendiente y vigente.')
  }
  const aprobado = datos.resultado === 'aprobado'
  if (aprobado) {
    reserva.estado_reserva = 'confirmada'
    reserva.expira_en = null
  }
  const respuesta = {
    id_pago: String(pagos.length + 1),
    estado_pago: aprobado ? 'aprobado' : 'rechazado',
    medio: datos.medio,
    valor: reserva.total,
    referencia_pasarela: 'PRUEBA-' + Date.now(),
    id_reserva: reserva.id_reserva,
    estado_reserva: reserva.estado_reserva
  }
  pagos.push({ clave_idempotencia: datos.clave_idempotencia, respuesta })
  return respuesta
}
