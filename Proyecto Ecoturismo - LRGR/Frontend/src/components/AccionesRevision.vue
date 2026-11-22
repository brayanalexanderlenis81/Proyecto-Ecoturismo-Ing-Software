<script setup>
import { ref } from 'vue'

defineProps({
  ocupada: { type: Boolean, default: false },
  etiquetaMotivo: { type: String, default: 'Motivo del rechazo' }
})

const emit = defineEmits(['aprobar', 'rechazar'])

const rechazando = ref(false)
const motivo = ref('')
const error = ref('')

function confirmarRechazo() {
  if (!motivo.value.trim()) {
    error.value = 'Escribe el motivo para poder rechazar.'
    return
  }
  error.value = ''
  emit('rechazar', motivo.value.trim())
}

function cancelar() {
  rechazando.value = false
  motivo.value = ''
  error.value = ''
}
</script>

<template>
  <div class="acciones-revision">
    <div v-if="!rechazando" class="botones">
      <button type="button" class="boton boton-contorno boton-rechazar" :disabled="ocupada" @click="rechazando = true">
        Rechazar
      </button>
      <button type="button" class="boton boton-primario" :disabled="ocupada" @click="emit('aprobar')">
        {{ ocupada ? 'Guardando…' : 'Aprobar' }}
      </button>
    </div>

    <div v-else class="rechazo">
      <label class="campo-borde">
        <span class="campo-borde-etiqueta">{{ etiquetaMotivo }}</span>
        <textarea v-model="motivo" maxlength="500"></textarea>
      </label>
      <p v-if="error" class="texto-error">{{ error }}</p>
      <div class="botones">
        <button type="button" class="boton boton-contorno" :disabled="ocupada" @click="cancelar">Cancelar</button>
        <button type="button" class="boton boton-peligro" :disabled="ocupada" @click="confirmarRechazo">
          {{ ocupada ? 'Guardando…' : 'Confirmar rechazo' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.acciones-revision {
  margin-top: var(--espacio-4);
  padding-top: var(--espacio-3);
  border-top: 1px solid var(--color-borde);
}

.botones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--espacio-2);
}

.botones .boton {
  min-height: 40px;
  padding: 0 var(--espacio-4);
  font-size: var(--texto-sm);
}

.rechazo {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
}

.rechazo .campo-borde {
  margin-top: var(--espacio-3);
}

.boton-rechazar {
  color: var(--estado-cancelada-texto);
}

.boton-peligro {
  background: var(--estado-cancelada-texto);
  color: var(--color-superficie);
}
</style>
