<script setup>
import TarjetaPublicacion from './TarjetaPublicacion.vue'

defineProps({
  publicaciones: { type: Array, required: true },
  titulo: { type: String, default: '' },
  activa: { type: Number, default: null }
})

const emit = defineEmits(['enfocar'])
</script>

<template>
  <section class="lista-resultados">
    <h1 class="titulo">{{ titulo }}</h1>

    <div v-if="publicaciones.length" class="cuadricula">
      <TarjetaPublicacion
        v-for="publicacion in publicaciones"
        :key="publicacion.id"
        :publicacion="publicacion"
        :activa="publicacion.id === activa"
        @enfocar="emit('enfocar', $event)"
      />
    </div>

    <p v-else class="vacio">No encontramos planes con esos filtros. Prueba cambiar la búsqueda.</p>
  </section>
</template>

<style scoped>
.titulo {
  margin-bottom: var(--espacio-2);
  font-size: var(--texto-md);
  font-weight: var(--peso-normal);
  color: var(--color-texto-secundario);
}

.cuadricula {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--espacio-4);
}

.vacio {
  padding: var(--espacio-8) var(--espacio-4);
  text-align: center;
  color: var(--color-texto-secundario);
  background: var(--color-superficie);
  border: 1px dashed var(--color-borde);
  border-radius: var(--radio-md);
}

@media (min-width: 640px) {
  .cuadricula {
    grid-template-columns: repeat(2, 1fr);
    align-items: start;
  }
}

@media (min-width: 1024px) {
  .titulo {
    margin-bottom: var(--espacio-4);
    font-size: var(--texto-xl);
    font-weight: var(--peso-medio);
    color: var(--color-texto);
  }
}
</style>
