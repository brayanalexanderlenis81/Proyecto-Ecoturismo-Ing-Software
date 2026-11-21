<script setup>
import { computed } from 'vue'
import IconoBase from './IconoBase.vue'
import { haySesion } from '../estado/sesion.js'

defineProps({
  activo: { type: String, default: 'explorar' }
})

const opciones = computed(() => [
  { clave: 'explorar', texto: 'Explorar', icono: 'brujula', ruta: { name: 'resultados' } },
  { clave: 'mapa', texto: 'Mapa', icono: 'mapa', ruta: { name: 'resultados', query: { vista: 'mapa' } } },
  { clave: 'reservas', texto: 'Mis reservas', icono: 'calendario', ruta: { name: 'mis-reservas' } },
  haySesion()
    ? { clave: 'perfil', texto: 'Perfil', icono: 'perfil', ruta: { name: 'perfil' } }
    : { clave: 'perfil', texto: 'Ingresar', icono: 'perfil', ruta: { name: 'iniciar-sesion' } }
])
</script>

<template>
  <nav class="barra-inferior" aria-label="Navegación principal">
    <RouterLink
      v-for="opcion in opciones"
      :key="opcion.clave"
      :to="opcion.ruta"
      class="opcion"
      :class="{ activa: opcion.clave === activo }"
      :aria-current="opcion.clave === activo ? 'page' : null"
    >
      <span class="icono"><IconoBase :nombre="opcion.icono" /></span>
      <span class="texto">{{ opcion.texto }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.barra-inferior {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: var(--alto-barra-inferior);
  background: var(--color-superficie);
  border-top: 1px solid var(--color-borde);
}

.opcion {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-texto);
}

.icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 30px;
  border-radius: var(--radio-total);
}

.texto {
  font-size: var(--texto-xs);
}

.activa .icono {
  background: var(--color-primario-suave);
  color: var(--color-primario-oscuro);
}

.activa .texto {
  font-weight: var(--peso-fuerte);
  color: var(--color-primario-oscuro);
}

@media (min-width: 1024px) {
  .barra-inferior {
    display: none;
  }
}
</style>
