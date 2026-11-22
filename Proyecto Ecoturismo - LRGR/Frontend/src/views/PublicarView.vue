<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import FiltrosRapidos from '../components/FiltrosRapidos.vue'
import IconoBase from '../components/IconoBase.vue'
import { obtenerMunicipios, obtenerPerfil, crearPublicacion } from '../datos/servicios.js'
import { sesion } from '../estado/sesion.js'

const route = useRoute()
const router = useRouter()

const tipos = { Alojamiento: 'alojamiento', Actividad: 'actividad' }
const dificultades = { Baja: 'baja', Media: 'media', Alta: 'alta' }

const sugerencias = {
  alojamiento: ['Casa', 'Finca', 'Cabaña', 'Glamping', 'Hotel rural'],
  actividad: ['Senderismo', 'Cabalgata', 'Avistamiento de aves', 'Deportes de aventura', 'Recorrido cultural']
}

const formulario = reactive({
  tipo: 'alojamiento',
  id_municipio: '',
  categoria: '',
  titulo: '',
  descripcion: '',
  precio_base: '',
  capacidad: '',
  direccion_exacta: '',
  latitud: '',
  longitud: '',
  normas: '',
  hora_entrada: '15:00',
  hora_salida: '11:00',
  dificultad: 'media',
  requisitos_participante: '',
  equipo_incluido: '',
  guia_incluido: true,
  tiene_seguro: true,
  detalle_seguridad: ''
})

const municipios = ref([])
const perfil = ref(null)
const cargando = ref(true)
const errorCarga = ref('')
const enviando = ref(false)
const error = ref('')

const esActividad = computed(() => formulario.tipo === 'actividad')

const tipoVisible = computed(() => Object.keys(tipos).find((texto) => tipos[texto] === formulario.tipo))

const dificultadVisible = computed(() =>
  Object.keys(dificultades).find((texto) => dificultades[texto] === formulario.dificultad)
)

const avisoRnt = computed(() => {
  if (!perfil.value || perfil.value.estado_verificacion === 'aprobado') {
    return ''
  }
  if (perfil.value.estado_verificacion === 'rechazado') {
    const motivo = perfil.value.observacion_verificacion ? ' Motivo: ' + perfil.value.observacion_verificacion : ''
    return 'Tu RNT fue rechazado, así que todavía no puedes publicar.' + motivo
  }
  return 'Tu RNT está en revisión. Podrás publicar cuando un administrador lo apruebe.'
})

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    const [lista, datosPerfil] = await Promise.all([obtenerMunicipios(), obtenerPerfil(sesion.token)])
    municipios.value = lista
    perfil.value = datosPerfil
  } catch (problema) {
    if (problema.estado === 401) {
      router.replace({ name: 'iniciar-sesion', query: { redirigir: route.fullPath } })
      return
    }
    errorCarga.value = problema.error || 'No pudimos cargar el formulario.'
  } finally {
    cargando.value = false
  }
}

function vacio(valor) {
  return String(valor).trim() === ''
}

function validar() {
  const obligatorios = [
    ['id_municipio', 'el municipio'],
    ['categoria', 'la categoría'],
    ['titulo', 'el título'],
    ['descripcion', 'la descripción'],
    ['precio_base', 'el precio'],
    ['capacidad', 'la capacidad'],
    ['direccion_exacta', 'la dirección exacta'],
    ['latitud', 'la latitud'],
    ['longitud', 'la longitud'],
    ['normas', 'las normas']
  ]
  if (esActividad.value) {
    obligatorios.push(
      ['requisitos_participante', 'los requisitos'],
      ['equipo_incluido', 'el equipo incluido'],
      ['detalle_seguridad', 'el detalle de seguridad']
    )
  } else {
    obligatorios.push(['hora_entrada', 'la hora de entrada'], ['hora_salida', 'la hora de salida'])
  }
  const falta = obligatorios.find(([campo]) => vacio(formulario[campo]))
  if (falta) {
    return 'Falta ' + falta[1] + '.'
  }
  if (!(Number(formulario.precio_base) > 0)) {
    return 'El precio debe ser mayor que cero.'
  }
  if (!Number.isInteger(Number(formulario.capacidad)) || Number(formulario.capacidad) < 1) {
    return 'La capacidad debe ser un número entero mayor que cero.'
  }
  const latitud = Number(formulario.latitud)
  const longitud = Number(formulario.longitud)
  if (!(latitud >= -4.3 && latitud <= 13.5 && longitud >= -82 && longitud <= -66.8)) {
    return 'Las coordenadas deben quedar dentro de Colombia (latitud entre -4,3 y 13,5; longitud entre -82 y -66,8).'
  }
  return ''
}

function cuerpo() {
  const datos = {
    tipo: formulario.tipo,
    id_municipio: Number(formulario.id_municipio),
    categoria: formulario.categoria.trim(),
    titulo: formulario.titulo.trim(),
    descripcion: formulario.descripcion.trim(),
    precio_base: Number(formulario.precio_base),
    capacidad: Number(formulario.capacidad),
    direccion_exacta: formulario.direccion_exacta.trim(),
    latitud: Number(formulario.latitud),
    longitud: Number(formulario.longitud),
    normas: formulario.normas.trim()
  }
  if (esActividad.value) {
    datos.dificultad = formulario.dificultad
    datos.requisitos_participante = formulario.requisitos_participante.trim()
    datos.equipo_incluido = formulario.equipo_incluido.trim()
    datos.guia_incluido = formulario.guia_incluido
    datos.tiene_seguro = formulario.tiene_seguro
    datos.detalle_seguridad = formulario.detalle_seguridad.trim()
  } else {
    datos.hora_entrada = formulario.hora_entrada
    datos.hora_salida = formulario.hora_salida
  }
  return datos
}

async function enviar() {
  error.value = validar()
  if (error.value || enviando.value) {
    return
  }
  enviando.value = true
  try {
    const creada = await crearPublicacion(sesion.token, cuerpo())
    router.push({ name: 'mis-publicaciones', query: { nueva: creada.titulo } })
  } catch (problema) {
    if (problema.estado === 401) {
      router.replace({ name: 'iniciar-sesion', query: { redirigir: route.fullPath } })
      return
    }
    error.value = problema.error || 'No pudimos enviar la publicación. Intenta de nuevo.'
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
      <h1 class="titulo-pagina">Publicar</h1>
      <p class="texto-secundario">Un administrador revisará tu publicación antes de que salga al público.</p>

      <p v-if="cargando" class="texto-secundario estado-carga">Cargando…</p>

      <div v-else-if="errorCarga" class="tarjeta-blanca estado-carga">
        <p class="texto-error">{{ errorCarga }}</p>
        <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
      </div>

      <form v-else class="formulario" novalidate @submit.prevent="enviar">
        <p v-if="avisoRnt" class="aviso-rnt" role="status">{{ avisoRnt }}</p>

        <section class="tarjeta-blanca">
          <h2 class="subtitulo">¿Qué vas a publicar?</h2>
          <FiltrosRapidos
            :opciones="Object.keys(tipos)"
            :seleccionado="tipoVisible"
            @seleccionar="formulario.tipo = tipos[$event]"
          />

          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Municipio</span>
            <select v-model="formulario.id_municipio">
              <option value="" disabled>Elige el municipio</option>
              <option v-for="municipio in municipios" :key="municipio.id_municipio" :value="municipio.id_municipio">
                {{ municipio.nombre }}, {{ municipio.departamento }}
              </option>
            </select>
          </label>

          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Categoría</span>
            <input v-model="formulario.categoria" type="text" list="sugerencias-categoria" maxlength="60" />
          </label>
          <datalist id="sugerencias-categoria">
            <option v-for="categoria in sugerencias[formulario.tipo]" :key="categoria" :value="categoria"></option>
          </datalist>
        </section>

        <section class="tarjeta-blanca">
          <h2 class="subtitulo">Descripción</h2>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Título</span>
            <input v-model="formulario.titulo" type="text" maxlength="120" />
          </label>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Descripción</span>
            <textarea v-model="formulario.descripcion" maxlength="2000"></textarea>
          </label>
          <div class="fila-campos">
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Precio por {{ esActividad ? 'persona' : 'noche' }}</span>
              <input v-model="formulario.precio_base" type="number" min="1" step="1000" inputmode="numeric" />
            </label>
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">{{ esActividad ? 'Personas por salida' : 'Huéspedes' }}</span>
              <input v-model="formulario.capacidad" type="number" min="1" step="1" inputmode="numeric" />
            </label>
          </div>
        </section>

        <section class="tarjeta-blanca">
          <h2 class="subtitulo">Ubicación</h2>
          <p class="texto-secundario ayuda">
            La dirección exacta solo la verán los turistas con una reserva confirmada.
          </p>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Dirección exacta</span>
            <input v-model="formulario.direccion_exacta" type="text" maxlength="200" />
          </label>
          <div class="fila-campos">
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Latitud</span>
              <input v-model="formulario.latitud" type="number" step="0.0001" placeholder="4.6371" />
            </label>
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Longitud</span>
              <input v-model="formulario.longitud" type="number" step="0.0001" placeholder="-75.5704" />
            </label>
          </div>
          <p class="texto-secundario ayuda">
            Puedes copiarlas de un mapa: haz clic derecho sobre el lugar y copia los dos números.
          </p>
        </section>

        <section v-if="!esActividad" class="tarjeta-blanca">
          <h2 class="subtitulo">Horarios</h2>
          <div class="fila-campos">
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Hora de entrada</span>
              <input v-model="formulario.hora_entrada" type="time" />
            </label>
            <label class="campo-borde">
              <span class="campo-borde-etiqueta">Hora de salida</span>
              <input v-model="formulario.hora_salida" type="time" />
            </label>
          </div>
        </section>

        <section v-else class="tarjeta-blanca">
          <h2 class="subtitulo">Datos de la actividad</h2>
          <p class="etiqueta-grupo">Dificultad</p>
          <FiltrosRapidos
            :opciones="Object.keys(dificultades)"
            :seleccionado="dificultadVisible"
            @seleccionar="formulario.dificultad = dificultades[$event]"
          />
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Requisitos para participar</span>
            <input v-model="formulario.requisitos_participante" type="text" placeholder="Ej.: mayores de 12 años" />
          </label>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Equipo incluido</span>
            <input v-model="formulario.equipo_incluido" type="text" placeholder="Ej.: casco y chaleco" />
          </label>
          <label class="casilla">
            <input v-model="formulario.guia_incluido" type="checkbox" />
            <span class="casilla-cuadro"><IconoBase nombre="check" :tamano="16" /></span>
            Incluye guía
          </label>
          <label class="casilla">
            <input v-model="formulario.tiene_seguro" type="checkbox" />
            <span class="casilla-cuadro"><IconoBase nombre="check" :tamano="16" /></span>
            Incluye seguro
          </label>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Detalle de seguridad</span>
            <textarea v-model="formulario.detalle_seguridad" maxlength="1000"></textarea>
          </label>
        </section>

        <section class="tarjeta-blanca">
          <h2 class="subtitulo">Normas del lugar</h2>
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Normas</span>
            <textarea
              v-model="formulario.normas"
              maxlength="2000"
              placeholder="Ej.: No se permiten mascotas. Silencio después de las 10 p. m."
            ></textarea>
          </label>
        </section>

        <p v-if="error" class="texto-error error-envio" role="alert">{{ error }}</p>

        <button type="submit" class="boton boton-primario boton-enviar" :disabled="enviando">
          {{ enviando ? 'Enviando…' : 'Enviar a revisión' }}
        </button>
      </form>
    </main>

    <BarraInferiorTurista activo="publicar" />
  </div>
</template>

<style scoped>
.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-4);
  margin-top: var(--espacio-4);
}

.subtitulo {
  margin-bottom: var(--espacio-3);
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.ayuda {
  margin-top: var(--espacio-2);
  font-size: var(--texto-sm);
}

.etiqueta-grupo {
  margin-bottom: var(--espacio-2);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
}

.casilla {
  margin-top: var(--espacio-2);
}

.aviso-rnt {
  padding: var(--espacio-3) var(--espacio-4);
  border-radius: var(--radio-sm);
  background: var(--estado-pendiente-fondo);
  color: var(--estado-pendiente-texto);
  font-size: var(--texto-sm);
}

.error-envio {
  padding: var(--espacio-3) var(--espacio-4);
  border-radius: var(--radio-sm);
  background: var(--estado-cancelada-fondo);
}

.boton-enviar {
  width: 100%;
}

.estado-carga {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-3);
  margin-top: var(--espacio-4);
  padding: var(--espacio-8) var(--espacio-4);
}

@media (min-width: 1024px) {
  .boton-enviar {
    width: auto;
    align-self: flex-end;
  }
}
</style>
