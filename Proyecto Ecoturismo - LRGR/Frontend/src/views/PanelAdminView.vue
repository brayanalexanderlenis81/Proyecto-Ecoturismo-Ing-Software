<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import FiltrosRapidos from '../components/FiltrosRapidos.vue'
import AccionesRevision from '../components/AccionesRevision.vue'
import {
  obtenerPublicacionesEnRevision,
  decidirPublicacion,
  obtenerAnfitrionesPendientes,
  decidirAnfitrion
} from '../datos/servicios.js'
import { sesion } from '../estado/sesion.js'
import { formatearPrecio, formatearDia } from '../utilidades/formato.js'

const route = useRoute()
const router = useRouter()

const pestanas = { Publicaciones: 'publicaciones', Anfitriones: 'anfitriones' }

const publicaciones = ref([])
const anfitriones = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const ocupada = ref('')
const mensaje = ref('')
const errores = reactive({})

const pestana = computed(() => (route.query.pestana === 'anfitriones' ? 'anfitriones' : 'publicaciones'))

const pestanaVisible = computed(() => Object.keys(pestanas).find((texto) => pestanas[texto] === pestana.value))

function cambiarPestana(texto) {
  mensaje.value = ''
  router.replace({ name: 'panel-admin', query: pestanas[texto] === 'anfitriones' ? { pestana: 'anfitriones' } : {} })
}

function manejarError(problema, clave) {
  if (problema.estado === 401) {
    router.replace({ name: 'iniciar-sesion', query: { redirigir: route.fullPath } })
    return
  }
  const texto = problema.error || 'No pudimos conectar. Intenta de nuevo.'
  if (clave) {
    errores[clave] = texto
  } else {
    errorCarga.value = texto
  }
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    const [listaPublicaciones, listaAnfitriones] = await Promise.all([
      obtenerPublicacionesEnRevision(sesion.token),
      obtenerAnfitrionesPendientes(sesion.token)
    ])
    publicaciones.value = listaPublicaciones
    anfitriones.value = listaAnfitriones
  } catch (problema) {
    manejarError(problema)
  } finally {
    cargando.value = false
  }
}

async function revisarPublicacion(publicacion, decision, motivo) {
  const clave = 'p' + publicacion.id_publicacion
  ocupada.value = clave
  errores[clave] = ''
  mensaje.value = ''
  try {
    const cuerpo = decision === 'rechazada' ? { decision, motivo } : { decision }
    await decidirPublicacion(sesion.token, publicacion.id_publicacion, cuerpo)
    publicaciones.value = publicaciones.value.filter((item) => item.id_publicacion !== publicacion.id_publicacion)
    mensaje.value = (decision === 'aprobada' ? 'Aprobaste' : 'Rechazaste') + ' «' + publicacion.titulo + '».'
  } catch (problema) {
    manejarError(problema, clave)
  } finally {
    ocupada.value = ''
  }
}

async function revisarAnfitrion(anfitrion, decision, motivo) {
  const clave = 'a' + anfitrion.id_usuario
  ocupada.value = clave
  errores[clave] = ''
  mensaje.value = ''
  try {
    const cuerpo = decision === 'rechazado' ? { decision, motivo } : { decision }
    await decidirAnfitrion(sesion.token, anfitrion.id_usuario, cuerpo)
    anfitriones.value = anfitriones.value.filter((item) => item.id_usuario !== anfitrion.id_usuario)
    mensaje.value =
      (decision === 'aprobado' ? 'Aprobaste el RNT de ' : 'Rechazaste el RNT de ') + anfitrion.nombre + '.'
  } catch (problema) {
    manejarError(problema, clave)
  } finally {
    ocupada.value = ''
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina-con-barra">
    <EncabezadoPrincipal />

    <main class="contenedor-pagina">
      <h1 class="titulo-pagina">Panel de administración</h1>

      <div class="pestanas">
        <FiltrosRapidos :opciones="Object.keys(pestanas)" :seleccionado="pestanaVisible" @seleccionar="cambiarPestana" />
      </div>

      <p v-if="mensaje" class="aviso-exito" role="status">{{ mensaje }}</p>

      <p v-if="cargando" class="texto-secundario estado-lista">Cargando…</p>

      <div v-else-if="errorCarga" class="tarjeta-blanca estado-lista">
        <p class="texto-error">{{ errorCarga }}</p>
        <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
      </div>

      <template v-else-if="pestana === 'publicaciones'">
        <p class="texto-secundario contador">
          {{ publicaciones.length === 1 ? '1 publicación espera' : publicaciones.length + ' publicaciones esperan' }}
          revisión
        </p>

        <div v-if="publicaciones.length" class="lista">
          <article v-for="publicacion in publicaciones" :key="publicacion.id_publicacion" class="tarjeta-blanca">
            <header class="cabecera">
              <div>
                <h2 class="titulo">{{ publicacion.titulo }}</h2>
                <p class="texto-secundario detalle">
                  {{ publicacion.categoria }} · {{ publicacion.municipio }}, {{ publicacion.departamento }}
                </p>
              </div>
              <span class="etiqueta-estado estado-pendiente">
                {{ publicacion.tipo === 'actividad' ? 'Actividad' : 'Alojamiento' }}
              </span>
            </header>

            <dl class="datos">
              <div class="fila">
                <dt>Anfitrión</dt>
                <dd>{{ publicacion.anfitrion }}</dd>
              </div>
              <div class="fila">
                <dt>Enviada</dt>
                <dd>{{ formatearDia(publicacion.creada_en) }}</dd>
              </div>
              <div class="fila">
                <dt>Precio</dt>
                <dd>
                  {{ formatearPrecio(Number(publicacion.precio_base)) }} /
                  {{ publicacion.tipo === 'actividad' ? 'persona' : 'noche' }}
                </dd>
              </div>
              <div class="fila">
                <dt>Capacidad</dt>
                <dd>{{ publicacion.capacidad }} personas</dd>
              </div>
            </dl>

            <p class="bloque-texto">{{ publicacion.descripcion }}</p>
            <p class="bloque-texto"><strong>Dirección exacta:</strong> {{ publicacion.direccion_exacta }}</p>
            <p class="bloque-texto"><strong>Normas:</strong> {{ publicacion.normas }}</p>

            <p v-if="errores['p' + publicacion.id_publicacion]" class="texto-error error-tarjeta">
              {{ errores['p' + publicacion.id_publicacion] }}
            </p>

            <AccionesRevision
              :ocupada="ocupada === 'p' + publicacion.id_publicacion"
              etiqueta-motivo="Motivo del rechazo (lo verá el anfitrión)"
              @aprobar="revisarPublicacion(publicacion, 'aprobada')"
              @rechazar="revisarPublicacion(publicacion, 'rechazada', $event)"
            />
          </article>
        </div>
        <p v-else class="tarjeta-blanca estado-lista texto-secundario">No hay publicaciones esperando revisión.</p>
      </template>

      <template v-else>
        <p class="texto-secundario contador">
          {{ anfitriones.length === 1 ? '1 anfitrión espera' : anfitriones.length + ' anfitriones esperan' }}
          la verificación del RNT
        </p>

        <div v-if="anfitriones.length" class="lista">
          <article v-for="anfitrion in anfitriones" :key="anfitrion.id_usuario" class="tarjeta-blanca">
            <header class="cabecera">
              <div>
                <h2 class="titulo">{{ anfitrion.nombre }}</h2>
                <p class="texto-secundario detalle">{{ anfitrion.correo }}</p>
              </div>
              <span class="etiqueta-estado estado-pendiente">RNT pendiente</span>
            </header>

            <dl class="datos">
              <div class="fila">
                <dt>Número de RNT</dt>
                <dd>{{ anfitrion.numero_rnt }}</dd>
              </div>
              <div class="fila">
                <dt>Estado del RNT</dt>
                <dd class="capital">{{ anfitrion.estado_rnt }}</dd>
              </div>
            </dl>

            <p v-if="errores['a' + anfitrion.id_usuario]" class="texto-error error-tarjeta">
              {{ errores['a' + anfitrion.id_usuario] }}
            </p>

            <AccionesRevision
              :ocupada="ocupada === 'a' + anfitrion.id_usuario"
              etiqueta-motivo="Observación (lo verá el anfitrión)"
              @aprobar="revisarAnfitrion(anfitrion, 'aprobado')"
              @rechazar="revisarAnfitrion(anfitrion, 'rechazado', $event)"
            />
          </article>
        </div>
        <p v-else class="tarjeta-blanca estado-lista texto-secundario">No hay anfitriones esperando verificación.</p>
      </template>
    </main>

    <BarraInferiorTurista activo="panel" />
  </div>
</template>

<style scoped>
.pestanas {
  margin: var(--espacio-4) 0;
}

.aviso-exito {
  margin-bottom: var(--espacio-4);
  padding: var(--espacio-3) var(--espacio-4);
  border: 1px solid var(--color-primario-borde);
  border-radius: var(--radio-sm);
  background: var(--color-primario-fondo);
  color: var(--color-primario-oscuro);
  font-size: var(--texto-sm);
}

.contador {
  margin-bottom: var(--espacio-3);
  font-size: var(--texto-sm);
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
  overflow-wrap: anywhere;
}

.datos {
  margin: var(--espacio-3) 0 0;
  padding-top: var(--espacio-3);
  border-top: 1px solid var(--color-borde);
}

.fila {
  display: flex;
  justify-content: space-between;
  gap: var(--espacio-3);
  padding: 2px 0;
}

.fila dt {
  color: var(--color-texto-secundario);
}

.fila dd {
  margin: 0;
  text-align: right;
  font-weight: var(--peso-medio);
}

.capital {
  text-transform: capitalize;
}

.bloque-texto {
  margin-top: var(--espacio-3);
  font-size: var(--texto-sm);
  line-height: 1.5;
  color: var(--color-texto-secundario);
}

.bloque-texto strong {
  color: var(--color-texto);
  font-weight: var(--peso-medio);
}

.error-tarjeta {
  margin-top: var(--espacio-3);
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
