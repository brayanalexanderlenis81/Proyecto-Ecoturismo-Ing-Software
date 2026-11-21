export function formatearPrecio(valor) {
  return '$ ' + valor.toLocaleString('es-CO')
}

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatearRangoFechas(inicio, fin, conAnio) {
  const fechaInicio = new Date(inicio + 'T00:00:00')
  const fechaFin = new Date(fin + 'T00:00:00')
  const anio = conAnio ? ' ' + fechaFin.getFullYear() : ''
  if (fechaInicio.getMonth() === fechaFin.getMonth()) {
    return fechaInicio.getDate() + ' – ' + fechaFin.getDate() + ' ' + meses[fechaFin.getMonth()] + anio
  }
  return (
    fechaInicio.getDate() + ' ' + meses[fechaInicio.getMonth()] + ' – ' + fechaFin.getDate() + ' ' + meses[fechaFin.getMonth()] + anio
  )
}

export function calcularNoches(inicio, fin) {
  const diferencia = new Date(fin + 'T00:00:00') - new Date(inicio + 'T00:00:00')
  return Math.max(1, Math.round(diferencia / 86400000))
}

export function textoPersonas(personas) {
  return personas === 1 ? '1 persona' : personas + ' personas'
}

export function formatearCalificacion(valor) {
  return valor.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function textoSubtitulo(publicacion) {
  const lugar = publicacion.ciudad + ', ' + publicacion.departamento
  if (publicacion.tipo === 'Actividad') {
    return 'Actividad · ' + publicacion.categoria + ' · ' + lugar
  }
  return publicacion.categoria + ' · ' + lugar
}

export function formatearFecha(valor) {
  const fecha = new Date(valor + 'T00:00:00')
  return fecha.getDate() + ' ' + meses[fecha.getMonth()] + ' ' + fecha.getFullYear()
}

export function formatearFechaHora(valor) {
  return new Date(valor).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatearHora(valor) {
  return new Date(valor).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}
