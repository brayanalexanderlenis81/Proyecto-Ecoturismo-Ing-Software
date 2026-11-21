<script setup>
import IconoBase from './IconoBase.vue'

defineProps({
  opciones: { type: Array, required: true },
  seleccionado: { type: String, default: '' }
})

const emit = defineEmits(['seleccionar'])
</script>

<template>
  <div class="filtros-rapidos" role="group" aria-label="Filtros rápidos">
    <button
      v-for="opcion in opciones"
      :key="opcion"
      type="button"
      class="chip"
      :class="{ seleccionado: opcion === seleccionado }"
      :aria-pressed="opcion === seleccionado"
      @click="emit('seleccionar', opcion)"
    >
      <IconoBase v-if="opcion === seleccionado" nombre="check" :tamano="18" />
      {{ opcion }}
    </button>
  </div>
</template>

<style scoped>
.filtros-rapidos {
  display: flex;
  gap: var(--espacio-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--espacio-1);
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 var(--espacio-3);
  white-space: nowrap;
  border: 1px solid var(--color-borde-fuerte);
  border-radius: var(--radio-sm);
  background: var(--color-superficie);
  font-size: var(--texto-md);
  font-weight: var(--peso-medio);
  color: var(--color-texto);
}

.chip:hover {
  background: var(--color-primario-fondo);
}

.chip.seleccionado {
  border-color: var(--color-primario-suave);
  background: var(--color-primario-suave);
  color: var(--color-primario-oscuro);
}
</style>
