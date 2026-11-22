<script setup>
import { ref } from 'vue'

defineProps({
  ocupada: { type: Boolean, default: false },
  reservasActivas: { type: Number, default: 0 }
})

const emit = defineEmits(['retirar'])

const retirando = ref(false)
const motivo = ref('')
const error = ref('')

function confirmarRetiro() {
  if (!motivo.value.trim()) {
    error.value = 'Escribe el motivo para poder retirarla.'
    return
  }
  error.value = ''
  emit('retirar', motivo.value.trim())
}

function cancelar() {
  retirando.value = false
  motivo.value = ''
  error.value = ''
}
</script>

<template>
  <div class="accion-retirar">
    <div v-if="!retirando" class="botones">
      <button type="button" class="boton boton-contorno boton-retirar" :disabled="ocupada" @click="retirando = true">
        Retirar
      </button>
    </div>

    <div v-else class="retiro">
      <p v-if="reservasActivas > 0" class="aviso-reservas" role="status">
        Esta publicación tiene
        {{ reservasActivas === 1 ? '1 reserva activa' : reservasActivas + ' reservas activas' }}. Se van a
        conservar, pero las que siguen pendientes de pago ya no se podrán confirmar.
      </p>
      <label class="campo-borde">
        <span class="campo-borde-etiqueta">Motivo del retiro (lo verá el anfitrión)</span>
        <textarea v-model="motivo" maxlength="500"></textarea>
      </label>
      <p v-if="error" class="texto-error">{{ error }}</p>
      <div class="botones">
        <button type="button" class="boton boton-contorno" :disabled="ocupada" @click="cancelar">Cancelar</button>
        <button type="button" class="boton boton-peligro" :disabled="ocupada" @click="confirmarRetiro">
          {{ ocupada ? 'Guardando…' : 'Confirmar retiro' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accion-retirar {
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

.retiro {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
}

.retiro .campo-borde {
  margin-top: var(--espacio-3);
}

.aviso-reservas {
  padding: var(--espacio-3) var(--espacio-4);
  border-radius: var(--radio-sm);
  background: var(--estado-pendiente-fondo);
  color: var(--estado-pendiente-texto);
  font-size: var(--texto-sm);
}

.boton-retirar {
  color: var(--estado-cancelada-texto);
}

.boton-peligro {
  background: var(--estado-cancelada-texto);
  color: var(--color-superficie);
}
</style>
