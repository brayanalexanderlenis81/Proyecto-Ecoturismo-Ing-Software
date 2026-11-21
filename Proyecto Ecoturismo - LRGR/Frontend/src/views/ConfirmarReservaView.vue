<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmarReserva from '../components/ConfirmarReserva.vue'
import { buscarPublicacion, contactoEmergenciaPerfil, tarifaServicio } from '../datos/publicaciones.js'
import { busqueda } from '../estado/busqueda.js'
import { formatearPrecio } from '../utilidades/formato.js'

const props = defineProps({
  id: { type: String, required: true }
})

const router = useRouter()

const publicacion = computed(() => buscarPublicacion(props.id))
const reservaEnviada = ref(null)

function volver() {
  router.push({ name: 'detalle', params: { id: props.id } })
}

function continuar(reserva) {
  reservaEnviada.value = reserva
}
</script>

<template>
  <div class="pagina-confirmar">
    <div v-if="reservaEnviada" class="mensaje">
      <h1>¡Fechas apartadas!</h1>
      <p>Tienes 15 minutos para pagar {{ formatearPrecio(reservaEnviada.total) }} y confirmar tu reserva.</p>
      <RouterLink :to="{ name: 'resultados' }" class="boton boton-primario">Volver a explorar</RouterLink>
    </div>

    <ConfirmarReserva
      v-else-if="publicacion"
      :publicacion="publicacion"
      :busqueda="busqueda"
      :contacto-inicial="contactoEmergenciaPerfil"
      :tarifa-servicio="tarifaServicio"
      @volver="volver"
      @continuar="continuar"
    />

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
