<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import FiltrosRapidos from '../components/FiltrosRapidos.vue'
import FiltrosLateral from '../components/FiltrosLateral.vue'
import ListaResultados from '../components/ListaResultados.vue'
import MapaResultados from '../components/MapaResultados.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import IconoBase from '../components/IconoBase.vue'
import { tipos, categorias, rangoPrecio } from '../datos/publicaciones.js'
import { buscarPublicaciones } from '../datos/servicios.js'
import { busqueda, actualizarBusqueda } from '../estado/busqueda.js'

const route = useRoute()
const router = useRouter()

const rango = reactive({ ...rangoPrecio })

const filtros = reactive({
  tipo: 'Todos',
  categorias: [],
  precioMinimo: rango.minimo,
  precioMaximo: rango.maximo
})

const publicaciones = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const activa = ref(null)
const filtrosAbiertos = ref(false)

const vistaMapa = computed(() => route.query.vista === 'mapa')

const categoriasDisponibles = computed(() => [
  ...new Set([...categorias, ...publicaciones.value.map((publicacion) => publicacion.categoria)])
])

const resultados = computed(() =>
  publicaciones.value.filter((publicacion) => {
    const coincideTipo = filtros.tipo === 'Todos' || publicacion.tipo === filtros.tipo
    const coincideCategoria = filtros.categorias.length === 0 || filtros.categorias.includes(publicacion.categoria)
    const coincidePrecio = publicacion.precio >= filtros.precioMinimo && publicacion.precio <= filtros.precioMaximo
    return coincideTipo && coincideCategoria && coincidePrecio
  })
)

const titulo = computed(() => {
  const lugar = busqueda.destino.split(',')[0].trim() || 'todos los destinos'
  const cantidad = resultados.value.length
  return cantidad === 1 ? '1 plan en ' + lugar : cantidad + ' planes en ' + lugar
})

function ajustarRango() {
  const precios = publicaciones.value.map((publicacion) => publicacion.precio)
  const mayor = precios.length ? Math.ceil(Math.max(...precios) / 50000) * 50000 : 0
  const nuevoMaximo = Math.max(rangoPrecio.maximo, mayor)
  if (filtros.precioMaximo === rango.maximo) {
    filtros.precioMaximo = nuevoMaximo
  }
  rango.maximo = nuevoMaximo
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    publicaciones.value = await buscarPublicaciones({ destino: busqueda.destino, personas: busqueda.personas })
    ajustarRango()
  } catch (problema) {
    publicaciones.value = []
    errorCarga.value = problema.error || 'No pudimos cargar los planes. Intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}

watch(() => [busqueda.destino, busqueda.personas], cargar, { immediate: true })

function actualizarFiltros(nuevosFiltros) {
  Object.assign(filtros, nuevosFiltros)
}

function limpiarFiltros() {
  Object.assign(filtros, { tipo: 'Todos', categorias: [], precioMinimo: rango.minimo, precioMaximo: rango.maximo })
}

function seleccionarTipo(tipo) {
  filtros.tipo = tipo
}

function cambiarVista() {
  const query = vistaMapa.value ? {} : { vista: 'mapa' }
  router.push({ name: 'resultados', query })
}
</script>

<template>
  <div class="pagina-resultados">
    <EncabezadoPrincipal :busqueda="busqueda" @buscar="actualizarBusqueda" @abrir-filtros="filtrosAbiertos = true" />

    <div class="filtros-celular">
      <FiltrosRapidos :opciones="['Todos', ...tipos]" :seleccionado="filtros.tipo" @seleccionar="seleccionarTipo" />
    </div>

    <main class="contenido" :class="{ 'con-mapa': vistaMapa }">
      <div class="columna-filtros" :class="{ abierto: filtrosAbiertos }">
        <div class="panel-filtros">
          <button type="button" class="cerrar-filtros" aria-label="Cerrar filtros" @click="filtrosAbiertos = false">
            <IconoBase nombre="cerrar" />
          </button>
          <FiltrosLateral
            :filtros="filtros"
            :tipos="tipos"
            :categorias="categoriasDisponibles"
            :rango-precio="rango"
            @actualizar="actualizarFiltros"
            @limpiar="limpiarFiltros"
          />
        </div>
      </div>

      <div class="columna-lista">
        <p v-if="cargando" class="aviso-carga">Buscando planes…</p>
        <div v-else-if="errorCarga" class="aviso-carga tarjeta-blanca">
          <p class="texto-error">{{ errorCarga }}</p>
          <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
        </div>
        <ListaResultados
          v-else
          :publicaciones="resultados"
          :titulo="titulo"
          :activa="activa"
          @enfocar="activa = $event"
        />
      </div>

      <div class="columna-mapa">
        <MapaResultados :publicaciones="resultados" :activa="activa" @enfocar="activa = $event" />
      </div>
    </main>

    <button type="button" class="boton boton-primario boton-vista" @click="cambiarVista">
      <IconoBase :nombre="vistaMapa ? 'lista' : 'mapa'" />
      {{ vistaMapa ? 'Ver lista' : 'Ver en el mapa' }}
    </button>

    <BarraInferiorTurista :activo="vistaMapa ? 'mapa' : 'explorar'" />
  </div>
</template>

<style scoped>
.pagina-resultados {
  min-height: 100vh;
  padding-bottom: calc(var(--alto-barra-inferior) + 88px);
}

.filtros-celular {
  padding: 0 var(--espacio-4) var(--espacio-3);
  background: var(--color-superficie);
  border-bottom: 1px solid var(--color-borde);
}

.contenido {
  padding: var(--espacio-4);
}

.aviso-carga {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-3);
  padding: var(--espacio-8) var(--espacio-4);
  text-align: center;
  color: var(--color-texto-secundario);
}

.columna-filtros {
  display: none;
}

.columna-filtros.abierto {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.4);
}

.panel-filtros {
  position: relative;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.panel-filtros :deep(.filtros-lateral) {
  border-radius: var(--radio-lg) var(--radio-lg) 0 0;
}

.cerrar-filtros {
  position: absolute;
  top: var(--espacio-4);
  right: var(--espacio-4);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radio-total);
  background: var(--color-fondo);
}

.columna-mapa {
  display: none;
}

.con-mapa .columna-lista {
  display: none;
}

.con-mapa .columna-mapa {
  display: block;
  height: calc(100vh - 260px);
}

.boton-vista {
  position: fixed;
  left: 50%;
  bottom: calc(var(--alto-barra-inferior) + var(--espacio-4));
  z-index: 5;
  transform: translateX(-50%);
  box-shadow: var(--sombra-media);
}

@media (min-width: 1024px) {
  .pagina-resultados {
    padding-bottom: var(--espacio-8);
  }

  .filtros-celular,
  .boton-vista,
  .cerrar-filtros {
    display: none;
  }

  .contenido,
  .contenido.con-mapa {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr) minmax(280px, 0.6fr);
    align-items: start;
    gap: var(--espacio-6);
    max-width: var(--ancho-maximo);
    margin: 0 auto;
    padding: var(--espacio-6);
  }

  .columna-filtros,
  .columna-filtros.abierto {
    position: static;
    display: block;
    background: none;
  }

  .panel-filtros {
    max-height: none;
    overflow: visible;
  }

  .panel-filtros :deep(.filtros-lateral) {
    border-radius: var(--radio-md);
  }

  .con-mapa .columna-lista,
  .columna-mapa,
  .con-mapa .columna-mapa {
    display: block;
  }

  .columna-mapa,
  .con-mapa .columna-mapa {
    position: sticky;
    top: var(--espacio-6);
    height: calc(100vh - 160px);
  }
}
</style>
