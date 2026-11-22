<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import IconoBase from '../components/IconoBase.vue'
import { obtenerMisPublicaciones, obtenerSalidas, crearSalida } from '../datos/servicios.js'
import { sesion } from '../estado/sesion.js'
import { formatearFechaHora, formatearHora, sumarDias } from '../utilidades/formato.js'

const props = defineProps({
  id: { type: String, required: true }
})

const route = useRoute()
const router = useRouter()

const actividad = ref(null)
const salidas = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const enviando = ref(false)
const error = ref('')
const mensaje = ref('')

const manana = sumarDias('', 1)

const formulario = reactive({
  fecha: manana,
  horaInicio: '08:00',
  horaFin: '12:00',
  cupos: ''
})

function irAlLogin() {
  router.replace({ name: 'iniciar-sesion', query: { redirigir: route.fullPath } })
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    const publicaciones = await obtenerMisPublicaciones(sesion.token)
    const encontrada = publicaciones.find((item) => item.id_publicacion === props.id)
    actividad.value =
      encontrada && encontrada.tipo === 'actividad' && encontrada.estado_moderacion === 'aprobada' ? encontrada : null
    salidas.value = actividad.value ? await obtenerSalidas(props.id) : []
  } catch (problema) {
    if (problema.estado === 401) {
      irAlLogin()
      return
    }
    errorCarga.value = problema.error || 'No pudimos cargar la actividad.'
  } finally {
    cargando.value = false
  }
}

function validar() {
  if (!formulario.fecha || !formulario.horaInicio || !formulario.horaFin) {
    return 'Escribe la fecha y las horas de la salida.'
  }
  if (formulario.horaFin <= formulario.horaInicio) {
    return 'La hora de fin debe ser después de la hora de inicio.'
  }
  if (new Date(formulario.fecha + 'T' + formulario.horaInicio + ':00-05:00') <= new Date()) {
    return 'La salida debe ser a futuro.'
  }
  const cupos = Number(formulario.cupos)
  if (!Number.isInteger(cupos) || cupos < 1) {
    return 'Los cupos deben ser un número entero mayor que cero.'
  }
  return ''
}

async function agregar() {
  error.value = validar()
  mensaje.value = ''
  if (error.value || enviando.value) {
    return
  }
  enviando.value = true
  try {
    const nueva = await crearSalida(sesion.token, props.id, {
      inicio: formulario.fecha + 'T' + formulario.horaInicio + ':00-05:00',
      fin: formulario.fecha + 'T' + formulario.horaFin + ':00-05:00',
      capacidad_total: Number(formulario.cupos)
    })
    salidas.value = await obtenerSalidas(props.id)
    mensaje.value = 'Agregaste la salida del ' + formatearFechaHora(nueva.inicio) + '.'
    formulario.cupos = ''
  } catch (problema) {
    if (problema.estado === 401) {
      irAlLogin()
      return
    }
    error.value = problema.error || 'No pudimos agregar la salida. Intenta de nuevo.'
  } finally {
    enviando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina-con-barra">
    <EncabezadoPrincipal />

    <main class="contenedor-pagina">
      <RouterLink :to="{ name: 'mis-publicaciones' }" class="volver">
        <IconoBase nombre="atras" :tamano="20" />
        Mis publicaciones
      </RouterLink>

      <p v-if="cargando" class="texto-secundario estado-carga">Cargando…</p>

      <div v-else-if="errorCarga" class="tarjeta-blanca estado-carga">
        <p class="texto-error">{{ errorCarga }}</p>
        <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
      </div>

      <div v-else-if="!actividad" class="tarjeta-blanca estado-carga">
        <p class="texto-secundario">Solo puedes agregar salidas a tus actividades aprobadas.</p>
        <RouterLink :to="{ name: 'mis-publicaciones' }" class="boton boton-primario">Ver mis publicaciones</RouterLink>
      </div>

      <template v-else>
        <h1 class="titulo-pagina">Salidas</h1>
        <p class="texto-secundario">{{ actividad.titulo }}</p>

        <section class="tarjeta-blanca bloque">
          <h2 class="subtitulo">Próximas salidas</h2>
          <p v-if="!salidas.length" class="texto-secundario">
            Aún no tienes salidas. Sin salidas, los turistas no pueden reservar esta actividad.
          </p>
          <ul v-else class="salidas">
            <li v-for="salida in salidas" :key="salida.id">
              <span>{{ formatearFechaHora(salida.inicio) }} – {{ formatearHora(salida.fin) }}</span>
              <span class="texto-secundario cupos">
                {{ salida.cuposDisponibles }} de {{ salida.capacidadTotal }} cupos libres
              </span>
            </li>
          </ul>
        </section>

        <form class="tarjeta-blanca bloque" novalidate @submit.prevent="agregar">
          <h2 class="subtitulo">Agregar salida</h2>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Fecha</span>
            <input v-model="formulario.fecha" type="date" :min="manana" />
          </label>
          <div class="fila-campos">
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Hora de inicio</span>
              <input v-model="formulario.horaInicio" type="time" />
            </label>
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Hora de fin</span>
              <input v-model="formulario.horaFin" type="time" />
            </label>
          </div>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Cupos</span>
            <input v-model="formulario.cupos" type="number" min="1" step="1" inputmode="numeric" />
          </label>
          <p class="texto-secundario ayuda">Las horas son de Colombia. Los cupos no pueden pasar la capacidad de la actividad.</p>

          <p v-if="mensaje" class="mensaje" role="status">{{ mensaje }}</p>
          <p v-if="error" class="texto-error" role="alert">{{ error }}</p>

          <button type="submit" class="boton boton-primario boton-agregar" :disabled="enviando">
            {{ enviando ? 'Guardando…' : 'Agregar salida' }}
          </button>
        </form>
      </template>
    </main>

    <BarraInferiorTurista activo="publicaciones" />
  </div>
</template>

<style scoped>
.volver {
  display: inline-flex;
  align-items: center;
  gap: var(--espacio-1);
  margin-bottom: var(--espacio-3);
  color: var(--color-primario);
  font-weight: var(--peso-medio);
  text-decoration: none;
}

.bloque {
  margin-top: var(--espacio-4);
}

.subtitulo {
  margin-bottom: var(--espacio-2);
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.salidas {
  margin: 0;
  padding: 0;
  list-style: none;
}

.salidas li {
  display: flex;
  flex-direction: column;
  padding: var(--espacio-3) 0;
}

.salidas li + li {
  border-top: 1px solid var(--color-borde);
}

.cupos {
  font-size: var(--texto-sm);
}

.ayuda {
  margin-top: var(--espacio-2);
  font-size: var(--texto-sm);
}

.mensaje {
  margin-top: var(--espacio-3);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  color: var(--color-primario);
}

.texto-error {
  margin-top: var(--espacio-3);
}

.boton-agregar {
  width: 100%;
  margin-top: var(--espacio-4);
}

.estado-carga {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-3);
  margin-top: var(--espacio-4);
  padding: var(--espacio-8) var(--espacio-4);
  text-align: center;
}
</style>
