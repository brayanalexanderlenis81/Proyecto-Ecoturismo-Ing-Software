<script setup>
import { ref } from 'vue'
import IconoBase from './IconoBase.vue'

defineProps({
  enviando: { type: Boolean, default: false }
})

const emit = defineEmits(['enviar', 'cerrar'])

const calificacion = ref(0)
const comentario = ref('')
const error = ref('')

const textos = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente']

function enviar() {
  if (calificacion.value === 0) {
    error.value = 'Elige de 1 a 5 estrellas.'
    return
  }
  error.value = ''
  emit('enviar', { calificacion: calificacion.value, comentario: comentario.value.trim() })
}
</script>

<template>
  <form class="formulario-resena" @submit.prevent="enviar">
    <p class="titulo">¿Cómo te fue?</p>

    <div class="estrellas" role="group" aria-label="Calificación">
      <button
        v-for="numero in 5"
        :key="numero"
        type="button"
        class="estrella"
        :class="{ llena: numero <= calificacion }"
        :aria-label="numero + ' de 5'"
        :aria-pressed="numero === calificacion"
        @click="calificacion = numero"
      >
        <IconoBase nombre="estrella" :tamano="30" />
      </button>
      <span class="texto-calificacion">{{ textos[calificacion] }}</span>
    </div>

    <label class="campo-borde">
      <span class="campo-borde-etiqueta">Comentario</span>
      <textarea v-model="comentario" maxlength="500" placeholder="Cuéntales a otros viajeros tu experiencia"></textarea>
    </label>

    <p v-if="error" class="texto-error">{{ error }}</p>

    <div class="acciones">
      <button type="button" class="boton boton-contorno" @click="emit('cerrar')">Cancelar</button>
      <button type="submit" class="boton boton-primario" :disabled="enviando">
        {{ enviando ? 'Enviando…' : 'Enviar reseña' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.formulario-resena {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  margin-top: var(--espacio-3);
  padding-top: var(--espacio-4);
  border-top: 1px solid var(--color-borde);
}

.titulo {
  font-weight: var(--peso-medio);
}

.estrellas {
  display: flex;
  align-items: center;
  gap: var(--espacio-1);
}

.estrella {
  display: flex;
  padding: 2px;
  border: none;
  background: none;
  color: var(--color-borde);
}

.estrella.llena {
  color: var(--color-estrella);
}

.texto-calificacion {
  margin-left: var(--espacio-2);
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.acciones {
  display: flex;
  justify-content: flex-end;
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}
</style>
