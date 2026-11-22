<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmarReserva from '../components/ConfirmarReserva.vue'
import {
  obtenerPublicacion,
  obtenerSalidas,
  crearReserva,
  pagarReserva,
  contactoEmergenciaInicial
} from '../datos/servicios.js'
import { tarifaServicio } from '../datos/publicaciones.js'
import { busqueda } from '../estado/busqueda.js'
import { sesion } from '../estado/sesion.js'
import { formatearPrecio } from '../utilidades/formato.js'

const props = defineProps({
  id: { type: String, required: true }
})

const route = useRoute()
const router = useRouter()

const publicacion = ref(null)
const salidas = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const contactoInicial = contactoEmergenciaInicial()

const enviando = ref(false)
const errorEnvio = ref('')
const reservaCreada = ref(null)
const clavePago = ref('')
const pagoAprobado = ref(null)

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  publicacion.value = null
  try {
    const encontrada = await obtenerPublicacion(props.id)
    salidas.value = encontrada.tipo === 'Actividad' ? await obtenerSalidas(encontrada.id) : []
    publicacion.value = encontrada
  } catch (problema) {
    errorCarga.value =
      problema.estado === 404 || problema.estado === 400 ? '' : problema.error || 'No pudimos cargar esta publicación.'
  } finally {
    cargando.value = false
  }
}

watch(() => props.id, cargar, { immediate: true })

function volver() {
  router.push({ name: 'detalle', params: { id: props.id } })
}

function cuerpoReserva(datos) {
  const cuerpo = {
    id_publicacion: datos.publicacionId,
    personas: datos.personas,
    emergencia_nombre: datos.contactoEmergencia.nombre.trim(),
    emergencia_telefono: datos.contactoEmergencia.telefono.replace(/\D/g, ''),
    version_normas: publicacion.value.versionNormas
  }
  if (datos.idSalida) {
    cuerpo.id_salida = datos.idSalida
  } else {
    cuerpo.fecha_entrada = datos.fechaInicio
    cuerpo.fecha_salida = datos.fechaFin
  }
  return cuerpo
}

async function continuar(datos) {
  if (enviando.value) {
    return
  }
  enviando.value = true
  errorEnvio.value = ''
  let pagando = false
  try {
    if (!reservaCreada.value) {
      reservaCreada.value = await crearReserva(sesion.token, cuerpoReserva(datos))
    }
    if (!clavePago.value) {
      clavePago.value = 'pago-reserva-' + reservaCreada.value.id_reserva + '-' + Date.now()
    }
    pagando = true
    const pago = await pagarReserva(sesion.token, {
      id_reserva: Number(reservaCreada.value.id_reserva),
      clave_idempotencia: clavePago.value,
      medio: 'tarjeta',
      resultado: 'aprobado'
    })
    if (pago.estado_pago === 'aprobado') {
      pagoAprobado.value = pago
    } else {
      clavePago.value = ''
      errorEnvio.value = 'El pago fue rechazado. Puedes intentarlo de nuevo.'
    }
  } catch (problema) {
    if (problema.estado === 401) {
      router.replace({ name: 'iniciar-sesion', query: { redirigir: route.fullPath } })
      return
    }
    if (pagando && problema.estado !== 0) {
      clavePago.value = ''
    }
    if (pagando && problema.estado === 400) {
      reservaCreada.value = null
    }
    errorEnvio.value = problema.error || 'No pudimos completar la reserva. Intenta de nuevo.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="pagina-confirmar">
    <div v-if="pagoAprobado" class="mensaje">
      <h1>¡Reserva confirmada!</h1>
      <p>Pagaste {{ formatearPrecio(Number(pagoAprobado.valor)) }}. En Mis reservas ya puedes ver la dirección exacta.</p>
      <RouterLink :to="{ name: 'mis-reservas' }" class="boton boton-primario">Ver mis reservas</RouterLink>
      <RouterLink :to="{ name: 'resultados' }" class="boton boton-contorno">Seguir explorando</RouterLink>
    </div>

    <p v-else-if="cargando" class="mensaje">Cargando…</p>

    <ConfirmarReserva
      v-else-if="publicacion"
      :publicacion="publicacion"
      :busqueda="busqueda"
      :contacto-inicial="contactoInicial"
      :tarifa-servicio="tarifaServicio"
      :salidas="salidas"
      :enviando="enviando"
      :error="errorEnvio"
      @volver="volver"
      @continuar="continuar"
    />

    <div v-else-if="errorCarga" class="mensaje">
      <p class="texto-error">{{ errorCarga }}</p>
      <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
    </div>

    <div v-else class="mensaje">
      <p>No encontramos esta publicación.</p>
      <RouterLink :to="{ name: 'resultados' }" class="boton boton-primario">Volver a resultados</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.mensaje {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-4);
  max-width: 480px;
  margin: 0 auto;
  padding: var(--espacio-10) var(--espacio-4);
  text-align: center;
}

.mensaje h1 {
  font-size: var(--texto-xl);
  color: var(--color-primario);
}

.mensaje p {
  color: var(--color-texto-secundario);
}
</style>
