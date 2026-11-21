<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import DetallePublicacion from '../components/DetallePublicacion.vue'
import { buscarPublicacion } from '../datos/publicaciones.js'
import { busqueda, actualizarBusqueda } from '../estado/busqueda.js'

const props = defineProps({
  id: { type: String, required: true }
})

const router = useRouter()

const publicacion = computed(() => buscarPublicacion(props.id))

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

    <DetallePublicacion
      v-if="publicacion"
      :publicacion="publicacion"
      :busqueda="busqueda"
      @volver="volver"
      @reservar="reservar"
      @editar-fechas="volver"
    />

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
