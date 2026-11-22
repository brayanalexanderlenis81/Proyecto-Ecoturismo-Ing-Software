<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import FiltrosRapidos from '../components/FiltrosRapidos.vue'
import IconoBase from '../components/IconoBase.vue'
import { obtenerMisPublicaciones } from '../datos/servicios.js'
import { sesion } from '../estado/sesion.js'
import { formatearPrecio, formatearDia } from '../utilidades/formato.js'

const route = useRoute()
const router = useRouter()

const filtros = {
  Todas: '',
  'En revisión': 'en_revision',
  Aprobadas: 'aprobada',
  Rechazadas: 'rechazada'
}

const estados = {
  en_revision: { texto: 'En revisión', clase: 'estado-pendiente' },
  aprobada: { texto: 'Aprobada', clase: 'estado-confirmada' },
  rechazada: { texto: 'Rechazada', clase: 'estado-cancelada' }
}

const publicaciones = ref([])
const cargando = ref(true)
const error = ref('')
const filtro = ref('Todas')

const nueva = computed(() => (typeof route.query.nueva === 'string' ? route.query.nueva : ''))

const visibles = computed(() => {
  const estado = filtros[filtro.value]
  return estado ? publicaciones.value.filter((item) => item.estado_moderacion === estado) : publicaciones.value
})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    publicaciones.value = await obtenerMisPublicaciones(sesion.token)
  } catch (problema) {
    if (problema.estado === 401) {
      router.replace({ name: 'iniciar-sesion', query: { redirigir: route.fullPath } })
      return
    }
    error.value = problema.error || 'No pudimos cargar tus publicaciones.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina-con-barra">
    <EncabezadoPrincipal />

    <main class="contenedor-pagina">
      <div class="titulo-con-accion">
        <h1 class="titulo-pagina">Mis publicaciones</h1>
        <RouterLink :to="{ name: 'publicar' }" class="boton boton-primario boton-publicar">
          <IconoBase nombre="mas" :tamano="20" />
          Publicar
        </RouterLink>
      </div>

      <p v-if="nueva" class="aviso-exito" role="status">
        Enviaste «{{ nueva }}». Un administrador la revisará antes de que salga al público.
      </p>

      <div class="filtros">
        <FiltrosRapidos :opciones="Object.keys(filtros)" :seleccionado="filtro" @seleccionar="filtro = $event" />
      </div>

      <p v-if="cargando" class="texto-secundario estado-lista">Cargando tus publicaciones…</p>

      <div v-else-if="error" class="tarjeta-blanca estado-lista">
        <p class="texto-error">{{ error }}</p>
        <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
      </div>

      <div v-else-if="visibles.length" class="lista">
        <article v-for="publicacion in visibles" :key="publicacion.id_publicacion" class="tarjeta-blanca">
          <header class="cabecera">
            <div>
              <h2 class="titulo">{{ publicacion.titulo }}</h2>
              <p class="texto-secundario detalle">
                {{ publicacion.tipo === 'actividad' ? 'Actividad' : 'Alojamiento' }} ·
                {{ formatearPrecio(Number(publicacion.precio_base)) }} /
                {{ publicacion.tipo === 'actividad' ? 'persona' : 'noche' }}
              </p>
              <p class="texto-secundario detalle">Enviada el {{ formatearDia(publicacion.creada_en) }}</p>
            </div>
            <div class="etiquetas">
              <span class="etiqueta-estado" :class="estados[publicacion.estado_moderacion].clase">
                {{ estados[publicacion.estado_moderacion].texto }}
              </span>
              <span v-if="publicacion.pausada" class="etiqueta-estado estado-expirada">Pausada</span>
            </div>
          </header>

          <p v-if="publicacion.estado_moderacion === 'rechazada'" class="motivo">
            <strong>Motivo:</strong> {{ publicacion.motivo || 'El administrador no escribió un motivo.' }}
          </p>
          <p v-else-if="publicacion.estado_moderacion === 'en_revision'" class="texto-secundario nota">
            Un administrador la está revisando. Te avisaremos aquí cuando cambie su estado.
          </p>

          <div v-if="publicacion.estado_moderacion === 'aprobada'" class="acciones">
            <RouterLink
              :to="{ name: 'detalle', params: { id: Number(publicacion.id_publicacion) } }"
              class="boton boton-contorno"
            >
              Ver publicación
            </RouterLink>
            <RouterLink
              v-if="publicacion.tipo === 'actividad'"
              :to="{ name: 'salidas', params: { id: publicacion.id_publicacion } }"
              class="boton boton-primario"
            >
              Salidas
            </RouterLink>
          </div>
        </article>
      </div>

      <div v-else class="tarjeta-blanca estado-lista">
        <p class="texto-secundario">
          {{ publicaciones.length ? 'No tienes publicaciones con ese estado.' : 'Todavía no has publicado nada.' }}
        </p>
        <RouterLink :to="{ name: 'publicar' }" class="boton boton-primario">Crear mi primera publicación</RouterLink>
      </div>
    </main>

    <BarraInferiorTurista activo="publicaciones" />
  </div>
</template>

<style scoped>
.titulo-con-accion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-3);
}

.boton-publicar {
  min-height: 40px;
  padding: 0 var(--espacio-4);
}

.aviso-exito {
  margin-top: var(--espacio-4);
  padding: var(--espacio-3) var(--espacio-4);
  border: 1px solid var(--color-primario-borde);
  border-radius: var(--radio-sm);
  background: var(--color-primario-fondo);
  color: var(--color-primario-oscuro);
  font-size: var(--texto-sm);
}

.filtros {
  margin: var(--espacio-4) 0;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-4);
}

.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--espacio-3);
}

.titulo {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.detalle {
  font-size: var(--texto-sm);
}

.etiquetas {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--espacio-1);
}

.motivo {
  margin-top: var(--espacio-3);
  padding: var(--espacio-2) var(--espacio-3);
  border-radius: var(--radio-sm);
  background: var(--estado-cancelada-fondo);
  color: var(--estado-cancelada-texto);
  font-size: var(--texto-sm);
}

.nota {
  margin-top: var(--espacio-3);
  font-size: var(--texto-sm);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--espacio-2);
  margin-top: var(--espacio-4);
}

.acciones .boton {
  min-height: 40px;
  padding: 0 var(--espacio-4);
  font-size: var(--texto-sm);
}

.estado-lista {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-3);
  padding: var(--espacio-8) var(--espacio-4);
  text-align: center;
}
</style>
