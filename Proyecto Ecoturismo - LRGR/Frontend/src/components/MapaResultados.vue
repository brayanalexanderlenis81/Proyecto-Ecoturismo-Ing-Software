<script setup>
import { formatearPrecio } from '../utilidades/formato.js'

defineProps({
  publicaciones: { type: Array, required: true },
  activa: { type: Number, default: null }
})

const emit = defineEmits(['enfocar'])
</script>

<template>
  <section class="mapa" aria-label="Mapa de resultados">
    <p class="titulo">Mapa</p>
    <RouterLink
      v-for="publicacion in publicaciones"
      :key="publicacion.id"
      :to="{ name: 'detalle', params: { id: publicacion.id } }"
      class="marcador"
      :class="{ activo: publicacion.id === activa }"
      :style="{ left: publicacion.mapa.x + '%', top: publicacion.mapa.y + '%' }"
      :aria-label="publicacion.nombre + ', ' + formatearPrecio(publicacion.precio)"
      @mouseenter="emit('enfocar', publicacion.id)"
      @focus="emit('enfocar', publicacion.id)"
    >
      {{ formatearPrecio(publicacion.precio) }}
    </RouterLink>
  </section>
</template>

<style scoped>
.mapa {
  position: relative;
  min-height: 480px;
  height: 100%;
  overflow: hidden;
  background: var(--color-mapa);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
}

.titulo {
  position: absolute;
  top: var(--espacio-8);
  left: 0;
  right: 0;
  text-align: center;
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.marcador {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: var(--espacio-3) var(--espacio-4);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-total);
  background: var(--color-superficie);
  box-shadow: var(--sombra-suave);
  font-size: var(--texto-sm);
  font-weight: var(--peso-fuerte);
  white-space: nowrap;
  text-decoration: none;
  color: var(--color-texto);
  transition: background 0.15s, color 0.15s;
}

.marcador:hover,
.marcador.activo {
  z-index: 1;
  background: var(--color-primario);
  border-color: var(--color-primario);
  color: var(--color-superficie);
}
</style>
