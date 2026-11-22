<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import DetallePublicacion from '../components/DetallePublicacion.vue'
import { obtenerPublicacion } from '../datos/servicios.js'
import { busqueda, actualizarBusqueda } from '../estado/busqueda.js'

const props = defineProps({
  id: { type: String, required: true }
})

const router = useRouter()

const publicacion = ref(null)
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  publicacion.value = null
  try {
    publicacion.value = await obtenerPublicacion(props.id)
  } catch (problema) {
    error.value = problema.estado === 404 || problema.estado === 400 ? '' : problema.error || 'No pudimos cargar esta publicación.'
  } finally {
    cargando.value = false
  }
}

watch(() => props.id, cargar, { immediate: true })

function volver() {
  router.push({ name: 'resultados' })
}

function buscar(nuevaBusqueda) {
  actualizarBusqueda(nuevaBusqueda)
  router.push({ name: 'resultados' })
}

function reservar() {
  router.push({ name: 'confirmar-reserva', params: { id: props.id } })
}
</script>

<template>
  <div class="pagina-detalle">
    <div class="solo-computador">
      <EncabezadoPrincipal :busqueda="busqueda" @buscar="buscar" />
    </div>

    <p v-if="cargando" class="no-encontrado texto-secundario">Cargando…</p>

    <DetallePublicacion
      v-else-if="publicacion"
      :publicacion="publicacion"
      :busqueda="busqueda"
      @volver="volver"
      @reservar="reservar"
      @editar-fechas="volver"
    />

    <div v-else-if="error" class="no-encontrado">
      <p class="texto-error">{{ error }}</p>
      <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
    </div>

    <div v-else class="no-encontrado">
      <p>No encontramos esta publicación.</p>
      <RouterLink :to="{ name: 'resultados' }" class="boton boton-primario">Volver a resultados</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.pagina-detalle {
  min-height: 100vh;
  background: var(--color-superficie);
}

.no-encontrado {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-4);
  padding: var(--espacio-10) var(--espacio-4);
  text-align: center;
}

@media (min-width: 1024px) {
  .pagina-detalle {
    background: var(--color-fondo);
  }
}
</style>
