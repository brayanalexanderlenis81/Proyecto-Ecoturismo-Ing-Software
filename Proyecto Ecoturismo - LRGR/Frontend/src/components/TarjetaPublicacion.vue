<script setup>
import IconoBase from './IconoBase.vue'
import { formatearPrecio, formatearCalificacion, textoSubtitulo } from '../utilidades/formato.js'

defineProps({
  publicacion: { type: Object, required: true },
  activa: { type: Boolean, default: false }
})

const emit = defineEmits(['enfocar'])
</script>

<template>
  <RouterLink
    :to="{ name: 'detalle', params: { id: publicacion.id } }"
    class="tarjeta"
    :class="{ activa }"
    @mouseenter="emit('enfocar', publicacion.id)"
    @focus="emit('enfocar', publicacion.id)"
  >
    <div v-if="publicacion.imagenes.length" class="foto">
      <img :src="publicacion.imagenes[0]" :alt="publicacion.nombre" loading="lazy" />
      <span v-if="publicacion.destacado" class="insignia">Destacado</span>
    </div>

    <div class="contenido">
      <div class="fila-titulo">
        <h3 class="nombre">{{ publicacion.nombre }}</h3>
        <span class="calificacion">
          <IconoBase nombre="estrella" :tamano="16" class="estrella" />
          {{ formatearCalificacion(publicacion.calificacion) }} ({{ publicacion.totalResenas }})
        </span>
      </div>
      <p class="lugar">{{ textoSubtitulo(publicacion) }}</p>
      <p v-if="publicacion.anfitrion.verificado" class="texto-verificado">Anfitrión verificado</p>
      <p class="precio">
        <strong>{{ formatearPrecio(publicacion.precio) }}</strong>
        <span> / {{ publicacion.unidadPrecio }}</span>
      </p>
    </div>
  </RouterLink>
</template>

<style scoped>
.tarjeta {
  display: block;
  overflow: hidden;
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.tarjeta:hover,
.tarjeta.activa {
  box-shadow: var(--sombra-media);
  border-color: var(--color-primario-borde);
}

.foto {
  position: relative;
  aspect-ratio: 16 / 8.5;
  background: var(--color-mapa);
}

.foto img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.insignia {
  position: absolute;
  top: var(--espacio-3);
  left: var(--espacio-3);
  padding: var(--espacio-1) var(--espacio-2);
  border-radius: var(--radio-sm);
  background: var(--color-destacado-fondo);
  color: var(--color-destacado-texto);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
}

.contenido {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--espacio-4);
}

.fila-titulo {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--espacio-2);
}

.nombre {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.calificacion {
  display: inline-flex;
  align-items: center;
  gap: var(--espacio-1);
  flex-shrink: 0;
  font-size: var(--texto-sm);
}

.estrella {
  color: var(--color-estrella);
}

.lugar {
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.precio {
  margin-top: var(--espacio-2);
}

.precio strong {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.precio span {
  color: var(--color-texto-secundario);
}
</style>
