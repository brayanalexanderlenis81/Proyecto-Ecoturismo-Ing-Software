<script setup>
import { computed } from 'vue'
import IconoBase from './IconoBase.vue'
import { haySesion, tieneRol } from '../estado/sesion.js'

defineProps({
  activo: { type: String, default: 'explorar' }
})

const opciones = computed(() => {
  const sinSesion = !haySesion()
  const lista = [{ clave: 'explorar', texto: 'Explorar', icono: 'brujula', ruta: { name: 'resultados' } }]
  if (sinSesion || tieneRol('turista')) {
    lista.push({ clave: 'mapa', texto: 'Mapa', icono: 'mapa', ruta: { name: 'resultados', query: { vista: 'mapa' } } })
    lista.push({ clave: 'reservas', texto: 'Mis reservas', icono: 'calendario', ruta: { name: 'mis-reservas' } })
  }
  if (tieneRol('anfitrion')) {
    lista.push({ clave: 'publicaciones', texto: 'Publicaciones', icono: 'lista', ruta: { name: 'mis-publicaciones' } })
    lista.push({ clave: 'publicar', texto: 'Publicar', icono: 'mas', ruta: { name: 'publicar' } })
  }
  if (tieneRol('administrador')) {
    lista.push({ clave: 'panel', texto: 'Panel', icono: 'escudo', ruta: { name: 'panel-admin' } })
  }
  lista.push(
    sinSesion
      ? { clave: 'perfil', texto: 'Ingresar', icono: 'perfil', ruta: { name: 'iniciar-sesion' } }
      : { clave: 'perfil', texto: 'Perfil', icono: 'perfil', ruta: { name: 'perfil' } }
  )
  return lista
})
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
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
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
