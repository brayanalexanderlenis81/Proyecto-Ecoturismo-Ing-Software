export const valoresPorDefecto = {
  anfitrion: { nombre: 'Nombre no disponible', titulo: 'Anfitrión', verificado: true, rnt: 'no disponible' },
  servicios: ['sin información'],
  reglas: ['El anfitrión no registró normas para este lugar.'],
  cercanos: [{ id: 0, nombre: 'Aún no hay negocios locales registrados', tipo: 'Información pendiente', distancia: '—' }],
  contactoEmergencia: { nombre: '', telefono: '' }
}

export function urlImagen(ruta) {
  const texto = String(ruta || '').trim()
  if (texto === '' || /^https?:\/\//.test(texto) || texto.startsWith('/')) {
    return texto
  }
  if (texto.startsWith('imagenes/')) {
    return '/' + texto
  }
  return '/imagenes/' + texto
}

function rutasDeImagenes(datos) {
  const rutas = datos.imagenes || (datos.imagen ? [datos.imagen] : [])
  return rutas.map(urlImagen).filter((ruta) => ruta !== '')
}

function textoTipo(tipo) {
  return tipo === 'actividad' ? 'Actividad' : 'Alojamiento'
}

function textoCapacidad(datos) {
  const capacidad = Number(datos.capacidad)
  if (datos.tipo === 'actividad') {
    const partes = ['Grupos de hasta ' + capacidad + ' personas']
    if (datos.dificultad) {
      partes.push('dificultad ' + datos.dificultad)
    }
    return partes.join(' · ')
  }
  const partes = ['Hasta ' + capacidad + (capacidad === 1 ? ' huésped' : ' huéspedes')]
  if (datos.hora_entrada) {
    partes.push('entrada ' + String(datos.hora_entrada).slice(0, 5))
  }
  if (datos.hora_salida) {
    partes.push('salida ' + String(datos.hora_salida).slice(0, 5))
  }
  return partes.join(' · ')
}

function separarNormas(normas) {
  return String(normas || '')
    .split(/\n|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿¡])|(?<=[.!?])\s+(?=\d+[.)]\s)/)
    .map((norma) => norma.trim().replace(/^(?:\d+[.)]|[-*•])(?=\s|$)\s*/, ''))
    .filter((norma) => !/^[\d\s.)]*$/.test(norma))
}

function serviciosDeActividad(datos) {
  const servicios = []
  if (datos.guia_incluido) {
    servicios.push('guía incluido')
  }
  if (datos.tiene_seguro) {
    servicios.push('seguro')
  }
  if (datos.equipo_incluido) {
    servicios.push('equipo: ' + String(datos.equipo_incluido).trim().replace(/\.+$/, ''))
  }
  return servicios
}

function reglasDeActividad(datos) {
  const reglas = []
  if (datos.requisitos_participante) {
    reglas.push('Requisitos: ' + datos.requisitos_participante)
  }
  if (datos.detalle_seguridad) {
    reglas.push('Seguridad: ' + datos.detalle_seguridad)
  }
  return reglas
}

function fechaResena(valor) {
  const texto = new Date(valor).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function adaptarResena(resena) {
  return {
    id: Number(resena.id_resena),
    autor: resena.turista || 'Viajero',
    fecha: fechaResena(resena.creada_en),
    calificacion: Number(resena.calificacion),
    texto: resena.comentario || 'Sin comentario.'
  }
}

export function adaptarPublicacion(datos) {
  const calificacion = datos.calificacion === null || datos.calificacion === undefined ? null : Number(datos.calificacion)
  return {
    id: Number(datos.id_publicacion),
    nombre: datos.titulo,
    tipo: textoTipo(datos.tipo),
    categoria: datos.categoria,
    ciudad: datos.municipio,
    departamento: datos.departamento,
    precio: Number(datos.precio_base),
    unidadPrecio: datos.tipo === 'actividad' ? 'persona' : 'noche',
    calificacion,
    totalResenas: datos.cantidad_resenas !== undefined ? Number(datos.cantidad_resenas) : 0,
    destacado: Boolean(datos.destacado),
    imagenes: rutasDeImagenes(datos),
    anfitrion: { ...valoresPorDefecto.anfitrion },
    descripcion: datos.descripcion || '',
    capacidad: textoCapacidad(datos),
    servicios: [...valoresPorDefecto.servicios],
    reglas: [...valoresPorDefecto.reglas],
    resenas: [],
    cercanos: [...valoresPorDefecto.cercanos],
    latitud: datos.latitud_aproximada === null ? null : Number(datos.latitud_aproximada),
    longitud: datos.longitud_aproximada === null ? null : Number(datos.longitud_aproximada),
    mapa: { x: 50, y: 50 }
  }
}

export function adaptarDetalle(datos, resenas) {
  const publicacion = adaptarPublicacion(datos)
  const servicios = [...(datos.servicios || []), ...serviciosDeActividad(datos)]
  const reglas = [...separarNormas(datos.normas), ...reglasDeActividad(datos)]
  const listaResenas = resenas.map(adaptarResena)
  return {
    ...publicacion,
    servicios: servicios.length ? servicios : publicacion.servicios,
    reglas: reglas.length ? reglas : publicacion.reglas,
    resenas: listaResenas,
    totalResenas: listaResenas.length,
    versionNormas: datos.version_normas
  }
}

export function adaptarSalida(salida) {
  return {
    id: Number(salida.id_salida),
    inicio: salida.inicio,
    fin: salida.fin,
    capacidadTotal: Number(salida.capacidad_total),
    cuposDisponibles: Number(salida.cupos_disponibles)
  }
}

export function ubicarEnMapa(publicaciones) {
  const conCoordenadas = publicaciones.filter((item) => item.latitud !== null && item.longitud !== null)
  if (conCoordenadas.length === 0) {
    return publicaciones
  }
  const latitudes = conCoordenadas.map((item) => item.latitud)
  const longitudes = conCoordenadas.map((item) => item.longitud)
  const latMin = Math.min(...latitudes)
  const latMax = Math.max(...latitudes)
  const lonMin = Math.min(...longitudes)
  const lonMax = Math.max(...longitudes)
  const ubicadas = publicaciones.map((item, indice) => {
    if (item.latitud === null || item.longitud === null) {
      return { ...item, mapa: { x: 22 + ((indice * 19) % 56), y: 88 } }
    }
    const x = lonMax === lonMin ? 50 : 22 + ((item.longitud - lonMin) / (lonMax - lonMin)) * 56
    const y = latMax === latMin ? 50 : 15 + ((latMax - item.latitud) / (latMax - latMin)) * 70
    return { ...item, mapa: { x, y } }
  })
  return separarMarcadores(ubicadas)
}

const anchoMarcador = 26
const altoMarcador = 10
const desplazamientos = [0, 10, -10, 20, -20, 30, -30, 40, -40]

function seCruzan(a, b) {
  return Math.abs(a.x - b.x) < anchoMarcador && Math.abs(a.y - b.y) < altoMarcador
}

function separarMarcadores(publicaciones) {
  const puestos = []
  return publicaciones.map((item) => {
    const libre =
      desplazamientos
        .map((desplazamiento) => ({ x: item.mapa.x, y: Math.min(92, Math.max(8, item.mapa.y + desplazamiento)) }))
        .find((posicion) => puestos.every((puesto) => !seCruzan(posicion, puesto))) || item.mapa
    puestos.push(libre)
    return { ...item, mapa: libre }
  })
}
