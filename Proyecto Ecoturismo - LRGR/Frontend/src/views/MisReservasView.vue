<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import FiltrosRapidos from '../components/FiltrosRapidos.vue'
import TarjetaReserva from '../components/TarjetaReserva.vue'
import { obtenerMisReservas, cancelarReserva, crearResena } from '../datos/cuentaPrueba.js'
import { sesion, cerrarSesion } from '../estado/sesion.js'

const router = useRouter()

const filtros = {
  Todas: '',
  Pendientes: 'pendiente',
  Confirmadas: 'confirmada',
  Completadas: 'completada',
  Canceladas: 'cancelada',
  Expiradas: 'expirada'
}

const reservas = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const filtro = ref('Todas')
const ocupada = ref(null)
const resenadas = ref([])
const mensajes = reactive({})
const errores = reactive({})

const reservasVisibles = computed(() => {
  const estado = filtros[filtro.value]
  return estado ? reservas.value.filter((reserva) => reserva.estado_reserva === estado) : reservas.value
})

function manejarError(problema, idReserva) {
  if (problema.estado === 401) {
    cerrarSesion()
    router.replace({ name: 'iniciar-sesion', query: { redirigir: '/mis-reservas' } })
    return
  }
  const texto = problema.error || 'No pudimos conectar. Intenta de nuevo.'
  if (idReserva) {
    errores[idReserva] = texto
  } else {
    errorCarga.value = texto
  }
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    reservas.value = await obtenerMisReservas(sesion.token)
  } catch (problema) {
    manejarError(problema)
  } finally {
    cargando.value = false
  }
}

async function cancelar(idReserva) {
  ocupada.value = idReserva
  errores[idReserva] = ''
  try {
    const respuesta = await cancelarReserva(sesion.token, idReserva)
    const reserva = reservas.value.find((item) => item.id_reserva === respuesta.id_reserva)
    reserva.estado_reserva = respuesta.estado_reserva
    reserva.direccion_exacta = null
    mensajes[idReserva] = 'Cancelaste la reserva.'
  } catch (problema) {
    manejarError(problema, idReserva)
  } finally {
    ocupada.value = null
  }
}

async function resenar({ id, resena }) {
  ocupada.value = id
  errores[id] = ''
  try {
    await crearResena(sesion.token, id, resena)
    resenadas.value.push(id)
    mensajes[id] = '¡Gracias! Tu reseña ya está publicada.'
  } catch (problema) {
    if (problema.estado === 409) {
      resenadas.value.push(id)
    }
    manejarError(problema, id)
  } finally {
    ocupada.value = null
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina-con-barra">
    <EncabezadoPrincipal />

    <main class="contenedor-pagina">
      <h1 class="titulo-pagina">Mis reservas</h1>

      <div class="filtros">
        <FiltrosRapidos :opciones="Object.keys(filtros)" :seleccionado="filtro" @seleccionar="filtro = $event" />
      </div>

      <p v-if="cargando" class="texto-secundario estado-lista">Cargando tus reservas…</p>

      <div v-else-if="errorCarga" class="tarjeta-blanca estado-lista">
        <p class="texto-error">{{ errorCarga }}</p>
        <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
      </div>

      <div v-else-if="reservasVisibles.length" class="lista">
        <TarjetaReserva
          v-for="reserva in reservasVisibles"
          :key="reserva.id_reserva"
          :reserva="reserva"
          :ocupada="ocupada === reserva.id_reserva"
          :resenada="resenadas.includes(reserva.id_reserva)"
          :mensaje="mensajes[reserva.id_reserva]"
          :error="errores[reserva.id_reserva]"
          @cancelar="cancelar"
          @resenar="resenar"
        />
      </div>

      <div v-else class="tarjeta-blanca estado-lista vacio">
        <p class="texto-secundario">
          {{ reservas.length ? 'No tienes reservas con ese estado.' : 'Todavía no tienes reservas.' }}
        </p>
        <RouterLink :to="{ name: 'resultados' }" class="boton boton-primario">Explorar planes</RouterLink>
      </div>
    </main>

    <BarraInferiorTurista activo="reservas" />
  </div>
</template>

<style scoped>
.filtros {
  margin: var(--espacio-4) calc(var(--espacio-4) * -1) var(--espacio-4) 0;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-4);
}

.estado-lista {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-3);
  padding: var(--espacio-8) var(--espacio-4);
  text-align: center;
}

@media (min-width: 1024px) {
  .filtros {
    margin-right: 0;
  }

  .filtros :deep(.filtros-rapidos) {
    flex-wrap: wrap;
  }
}
</style>
