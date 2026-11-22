<script setup>
import { ref, reactive, computed, watch } from 'vue'
import IconoBase from './IconoBase.vue'
import { formatearRangoFechas, textoPersonas, sumarDias } from '../utilidades/formato.js'

const props = defineProps({
  busqueda: { type: Object, required: true }
})

const emit = defineEmits(['buscar'])

const abierto = ref(false)
const fechasAbiertas = ref(false)
const formulario = reactive({ ...props.busqueda })

watch(
  () => props.busqueda,
  (valor) => Object.assign(formulario, valor),
  { deep: true }
)

const textoFechas = computed(() => formatearRangoFechas(formulario.fechaInicio, formulario.fechaFin))

const opcionesPersonas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function cambiarInicio() {
  if (formulario.fechaFin <= formulario.fechaInicio) {
    formulario.fechaFin = sumarDias(formulario.fechaInicio, 1)
  }
}

function buscar() {
  abierto.value = false
  fechasAbiertas.value = false
  emit('buscar', { ...formulario })
}
</script>

<template>
  <div class="buscador" :class="{ abierto }">
    <button type="button" class="resumen" @click="abierto = !abierto">
      <IconoBase nombre="buscar" />
      <span class="resumen-texto">
        <strong>{{ busqueda.destino || '¿A dónde vas?' }}</strong>
        <span>{{ formatearRangoFechas(busqueda.fechaInicio, busqueda.fechaFin) }} · {{ textoPersonas(busqueda.personas) }}</span>
      </span>
    </button>

    <form class="formulario" @submit.prevent="buscar">
      <label class="campo">
        <span class="etiqueta">Destino</span>
        <input v-model="formulario.destino" type="text" placeholder="¿A dónde vas?" />
      </label>

      <div class="campo campo-fechas">
        <span class="etiqueta">Fechas</span>
        <button type="button" class="valor-boton" @click="fechasAbiertas = !fechasAbiertas">{{ textoFechas }}</button>
        <div v-if="fechasAbiertas" class="selector-fechas">
          <label>
            Llegada
            <input v-model="formulario.fechaInicio" type="date" @change="cambiarInicio" />
          </label>
          <label>
            Salida
            <input v-model="formulario.fechaFin" type="date" :min="formulario.fechaInicio" />
          </label>
        </div>
      </div>

      <label class="campo">
        <span class="etiqueta">Personas</span>
        <select v-model.number="formulario.personas">
          <option v-for="opcion in opcionesPersonas" :key="opcion" :value="opcion">{{ textoPersonas(opcion) }}</option>
        </select>
      </label>

      <button type="submit" class="boton-buscar" aria-label="Buscar">
        <IconoBase nombre="buscar" />
        <span class="texto-buscar">Buscar</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.buscador {
  position: relative;
  flex: 1;
  min-width: 0;
}

.resumen {
  display: flex;
  align-items: center;
  gap: var(--espacio-4);
  width: 100%;
  min-height: 56px;
  padding: var(--espacio-2) var(--espacio-4);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde-fuerte);
  border-radius: var(--radio-md);
  text-align: left;
}

.resumen-texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.resumen-texto strong {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.resumen-texto span {
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.formulario {
  display: none;
  flex-direction: column;
  gap: var(--espacio-3);
  margin-top: var(--espacio-2);
  padding: var(--espacio-4);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-media);
}

.abierto .formulario {
  display: flex;
}

.campo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.etiqueta {
  font-size: var(--texto-xs);
  color: var(--color-texto-secundario);
}

.campo input,
.campo select,
.valor-boton {
  width: 100%;
  padding: var(--espacio-1) 0;
  border: none;
  border-bottom: 1px solid var(--color-borde);
  background: transparent;
  font-size: var(--texto-md);
  text-align: left;
}

.campo input:focus,
.campo select:focus,
.valor-boton:focus {
  outline: none;
  border-bottom-color: var(--color-primario);
}

.selector-fechas {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
  padding: var(--espacio-3);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-sm);
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.selector-fechas label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.boton-buscar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--espacio-2);
  min-height: 48px;
  border: none;
  border-radius: var(--radio-total);
  background: var(--color-primario);
  color: var(--color-superficie);
  font-weight: var(--peso-medio);
}

@media (min-width: 1024px) {
  .buscador {
    max-width: 700px;
  }

  .resumen {
    display: none;
  }

  .formulario {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0;
    margin: 0;
    padding: var(--espacio-2) var(--espacio-2) var(--espacio-2) var(--espacio-6);
    border-color: var(--color-borde-fuerte);
    box-shadow: none;
  }

  .campo {
    flex: 1;
    min-width: 0;
    padding-right: var(--espacio-4);
  }

  .campo + .campo {
    padding-left: var(--espacio-4);
    border-left: 1px solid var(--color-borde);
  }

  .campo input,
  .campo select,
  .valor-boton {
    border-bottom: none;
    padding: 0;
  }

  .campo select {
    appearance: none;
    cursor: pointer;
  }

  .selector-fechas {
    position: absolute;
    top: calc(100% + var(--espacio-4));
    left: 0;
    z-index: 20;
    min-width: 220px;
    box-shadow: var(--sombra-media);
  }

  .boton-buscar {
    width: 48px;
    height: 48px;
    padding: 0;
    flex-shrink: 0;
  }

  .texto-buscar {
    display: none;
  }
}
</style>
