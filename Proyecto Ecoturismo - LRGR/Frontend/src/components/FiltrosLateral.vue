<script setup>
import IconoBase from './IconoBase.vue'
import { formatearPrecio } from '../utilidades/formato.js'

const props = defineProps({
  filtros: { type: Object, required: true },
  tipos: { type: Array, required: true },
  categorias: { type: Array, required: true },
  rangoPrecio: { type: Object, required: true }
})

const emit = defineEmits(['actualizar', 'limpiar'])

function cambiarTipo(tipo) {
  const nuevoTipo = props.filtros.tipo === tipo ? 'Todos' : tipo
  emit('actualizar', { ...props.filtros, tipo: nuevoTipo })
}

function cambiarCategoria(categoria) {
  const seleccionadas = props.filtros.categorias.includes(categoria)
    ? props.filtros.categorias.filter((item) => item !== categoria)
    : [...props.filtros.categorias, categoria]
  emit('actualizar', { ...props.filtros, categorias: seleccionadas })
}

function cambiarMinimo(evento) {
  const valor = Math.min(Number(evento.target.value), props.filtros.precioMaximo)
  emit('actualizar', { ...props.filtros, precioMinimo: valor })
}

function cambiarMaximo(evento) {
  const valor = Math.max(Number(evento.target.value), props.filtros.precioMinimo)
  emit('actualizar', { ...props.filtros, precioMaximo: valor })
}
</script>

<template>
  <aside class="filtros-lateral">
    <h2 class="titulo">Filtros</h2>

    <fieldset class="grupo">
      <legend>Tipo</legend>
      <div class="chips">
        <button
          v-for="tipo in tipos"
          :key="tipo"
          type="button"
          class="chip"
          :class="{ seleccionado: filtros.tipo === tipo }"
          :aria-pressed="filtros.tipo === tipo"
          @click="cambiarTipo(tipo)"
        >
          <IconoBase v-if="filtros.tipo === tipo" nombre="check" :tamano="18" />
          {{ tipo }}
        </button>
      </div>
    </fieldset>

    <fieldset class="grupo">
      <legend>Categoría</legend>
      <label v-for="categoria in categorias" :key="categoria" class="casilla">
        <input
          type="checkbox"
          :checked="filtros.categorias.includes(categoria)"
          @change="cambiarCategoria(categoria)"
        />
        <span class="casilla-cuadro"><IconoBase nombre="check" :tamano="16" /></span>
        {{ categoria }}
      </label>
    </fieldset>

    <fieldset class="grupo">
      <legend>Precio por noche</legend>
      <p class="rango-texto">{{ formatearPrecio(filtros.precioMinimo) }} – {{ formatearPrecio(filtros.precioMaximo) }}</p>
      <label class="deslizador">
        <span>Mínimo</span>
        <input
          type="range"
          :min="rangoPrecio.minimo"
          :max="rangoPrecio.maximo"
          step="10000"
          :value="filtros.precioMinimo"
          @input="cambiarMinimo"
        />
      </label>
      <label class="deslizador">
        <span>Máximo</span>
        <input
          type="range"
          :min="rangoPrecio.minimo"
          :max="rangoPrecio.maximo"
          step="10000"
          :value="filtros.precioMaximo"
          @input="cambiarMaximo"
        />
      </label>
    </fieldset>

    <button type="button" class="limpiar" @click="emit('limpiar')">Limpiar filtros</button>
  </aside>
</template>

<style scoped>
.filtros-lateral {
  padding: var(--espacio-6);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
}

.titulo {
  margin-bottom: var(--espacio-5);
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.grupo {
  margin: 0 0 var(--espacio-6);
  padding: 0;
  border: none;
}

.grupo legend {
  margin-bottom: var(--espacio-3);
  padding: 0;
  font-size: var(--texto-sm);
  color: var(--color-texto);
}

.chips {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--espacio-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--espacio-1);
  min-height: 34px;
  padding: 0 var(--espacio-3);
  border: 1px solid var(--color-borde-fuerte);
  border-radius: var(--radio-sm);
  background: var(--color-superficie);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
}

.chip.seleccionado {
  border-color: var(--color-primario-suave);
  background: var(--color-primario-suave);
  color: var(--color-primario-oscuro);
}

.rango-texto {
  margin-bottom: var(--espacio-2);
  font-weight: var(--peso-medio);
}

.deslizador {
  display: flex;
  flex-direction: column;
  font-size: var(--texto-xs);
  color: var(--color-texto-secundario);
}

.deslizador input {
  accent-color: var(--color-primario);
}

.limpiar {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primario);
  font-weight: var(--peso-medio);
}

.limpiar:hover {
  text-decoration: underline;
}
</style>
