<script setup>
import { ref, watch } from 'vue'
import IconoBase from './IconoBase.vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  tipo: { type: String, default: 'Alojamiento' },
  tamanoIcono: { type: Number, default: 48 }
})

const fallo = ref(false)

watch(
  () => props.src,
  () => {
    fallo.value = false
  }
)
</script>

<template>
  <div class="imagen-publicacion">
    <img v-if="src && !fallo" :src="src" :alt="alt" loading="lazy" @error="fallo = true" />
    <div v-else class="respaldo" role="img" :aria-label="alt || tipo">
      <IconoBase :nombre="tipo === 'Actividad' ? 'montana' : 'casa'" :tamano="tamanoIcono" />
    </div>
  </div>
</template>

<style scoped>
.imagen-publicacion {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.imagen-publicacion img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.respaldo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--color-primario);
  color: var(--color-primario-suave);
}
</style>
