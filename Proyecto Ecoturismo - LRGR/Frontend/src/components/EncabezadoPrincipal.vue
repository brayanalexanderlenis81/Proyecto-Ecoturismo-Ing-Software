<script setup>
import Buscador from './Buscador.vue'
import IconoBase from './IconoBase.vue'
import { haySesion, primerNombre } from '../estado/sesion.js'

defineProps({
  busqueda: { type: Object, default: null }
})

const emit = defineEmits(['buscar', 'abrir-filtros'])
</script>

<template>
  <header class="encabezado" :class="{ 'sin-buscador': !busqueda }">
    <RouterLink :to="{ name: 'resultados' }" class="logo">Eco Turismo Experiencial</RouterLink>

    <template v-if="busqueda">
      <Buscador :busqueda="busqueda" @buscar="emit('buscar', $event)" />

      <button type="button" class="boton-icono boton-filtros" aria-label="Filtros" @click="emit('abrir-filtros')">
        <IconoBase nombre="ajustes" />
      </button>
    </template>

    <nav class="cuenta" aria-label="Cuenta">
      <template v-if="haySesion()">
        <RouterLink :to="{ name: 'mis-reservas' }" class="boton boton-contorno">Mis reservas</RouterLink>
        <RouterLink :to="{ name: 'perfil' }" class="boton boton-primario">
          <IconoBase nombre="perfil" :tamano="20" />
          {{ primerNombre() }}
        </RouterLink>
      </template>
      <template v-else>
        <RouterLink :to="{ name: 'iniciar-sesion' }" class="boton boton-contorno">Iniciar sesión</RouterLink>
        <RouterLink :to="{ name: 'crear-cuenta' }" class="boton boton-primario">Crear cuenta</RouterLink>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.encabezado {
  display: flex;
  align-items: flex-start;
  gap: var(--espacio-3);
  padding: var(--espacio-4) var(--espacio-4) var(--espacio-3);
  background: var(--color-superficie);
}

.logo,
.cuenta {
  display: none;
}

.sin-buscador {
  align-items: center;
  padding: var(--espacio-4);
  border-bottom: 1px solid var(--color-borde);
}

.sin-buscador .logo {
  display: block;
}

.logo {
  flex-shrink: 0;
  color: var(--color-primario);
  font-size: var(--texto-lg);
  font-weight: var(--peso-fuerte);
  text-decoration: none;
}

.boton-filtros {
  margin-top: 4px;
  flex-shrink: 0;
  border-color: var(--color-borde-fuerte);
}

@media (min-width: 1024px) {
  .encabezado {
    align-items: center;
    justify-content: space-between;
    gap: var(--espacio-8);
    padding: var(--espacio-3) var(--espacio-6);
    border-bottom: 1px solid var(--color-borde);
  }

  .sin-buscador {
    min-height: 77px;
  }

  .logo {
    display: block;
  }

  .boton-filtros {
    display: none;
  }

  .cuenta {
    display: flex;
    gap: var(--espacio-2);
    flex-shrink: 0;
  }
}
</style>
