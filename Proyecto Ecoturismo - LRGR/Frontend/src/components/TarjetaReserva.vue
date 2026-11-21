<script setup>
import { ref, computed } from 'vue'
import FormularioResena from './FormularioResena.vue'
import { formatearPrecio, formatearFecha, formatearFechaHora, formatearHora, textoPersonas } from '../utilidades/formato.js'

const props = defineProps({
  reserva: { type: Object, required: true },
  ocupada: { type: Boolean, default: false },
  resenada: { type: Boolean, default: false },
  mensaje: { type: String, default: '' },
  error: { type: String, default: '' }
})

const emit = defineEmits(['cancelar', 'resenar'])

const confirmandoCancelacion = ref(false)
const escribiendoResena = ref(false)

const nombresEstado = {
  pendiente: 'Pendiente de pago',
  confirmada: 'Confirmada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
  completada: 'Completada'
}

const estado = computed(() => props.reserva.estado_reserva)

const esActividad = computed(() => props.reserva.tipo === 'actividad')

const textoFechas = computed(() => {
  if (esActividad.value) {
    return formatearFechaHora(props.reserva.inicio) + ' – ' + formatearHora(props.reserva.fin)
  }
  return formatearFecha(props.reserva.fecha_entrada) + ' – ' + formatearFecha(props.reserva.fecha_salida)
})

const puedeCancelar = computed(() => estado.value === 'pendiente' || estado.value === 'confirmada')

const puedeResenar = computed(() => estado.value === 'completada' && !props.resenada)

const muestraDireccion = computed(
  () => (estado.value === 'confirmada' || estado.value === 'completada') && Boolean(props.reserva.direccion_exacta)
)

function confirmarCancelacion() {
  confirmandoCancelacion.value = false
  emit('cancelar', props.reserva.id_reserva)
}

function enviarResena(resena) {
  emit('resenar', { id: props.reserva.id_reserva, resena })
}
</script>

<template>
  <article class="tarjeta-reserva tarjeta-blanca">
    <header class="cabecera">
      <div>
        <h2 class="titulo">{{ reserva.titulo }}</h2>
        <p class="texto-secundario lugar">
          {{ esActividad ? 'Actividad' : 'Alojamiento' }} · {{ reserva.municipio }} · Reserva #{{ reserva.id_reserva }}
        </p>
      </div>
      <span class="etiqueta-estado" :class="'estado-' + estado">{{ nombresEstado[estado] }}</span>
    </header>

    <dl class="datos">
      <div class="fila">
        <dt>{{ esActividad ? 'Salida' : 'Fechas' }}</dt>
        <dd>{{ textoFechas }}</dd>
      </div>
      <div class="fila">
        <dt>Personas</dt>
        <dd>{{ textoPersonas(reserva.personas) }}</dd>
      </div>
      <div class="fila">
        <dt>Total (COP)</dt>
        <dd class="total">{{ formatearPrecio(Number(reserva.total)) }}</dd>
      </div>
    </dl>

    <p v-if="estado === 'pendiente' && reserva.expira_en" class="aviso aviso-pendiente">
      Paga antes de las {{ formatearHora(reserva.expira_en) }} o se liberan las fechas.
    </p>

    <div v-if="muestraDireccion" class="direccion">
      <p class="direccion-titulo">Dirección exacta</p>
      <p>{{ reserva.direccion_exacta }}</p>
    </div>
    <p v-else-if="puedeCancelar" class="aviso">La dirección exacta aparece cuando se confirme el pago.</p>

    <p v-if="mensaje" class="mensaje" role="status">{{ mensaje }}</p>
    <p v-if="error" class="texto-error" role="alert">{{ error }}</p>

    <div v-if="confirmandoCancelacion" class="confirmar-cancelacion">
      <p>¿Seguro que quieres cancelar esta reserva? Las fechas quedarán libres para otros.</p>
      <div class="acciones">
        <button type="button" class="boton boton-contorno" @click="confirmandoCancelacion = false">No, volver</button>
        <button type="button" class="boton boton-peligro" :disabled="ocupada" @click="confirmarCancelacion">
          Sí, cancelar
        </button>
      </div>
    </div>

    <FormularioResena
      v-else-if="escribiendoResena && !resenada"
      :enviando="ocupada"
      @enviar="enviarResena"
      @cerrar="escribiendoResena = false"
    />

    <div v-else class="acciones">
      <RouterLink :to="{ name: 'detalle', params: { id: Number(reserva.id_publicacion) } }" class="boton boton-contorno">
        Ver lugar
      </RouterLink>
      <button v-if="puedeCancelar" type="button" class="boton boton-contorno boton-cancelar" :disabled="ocupada" @click="confirmandoCancelacion = true">
        {{ ocupada ? 'Cancelando…' : 'Cancelar reserva' }}
      </button>
      <button v-if="puedeResenar" type="button" class="boton boton-primario" @click="escribiendoResena = true">
        Dejar reseña
      </button>
    </div>
  </article>
</template>

<style scoped>
.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--espacio-3);
}

.titulo {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.lugar {
  font-size: var(--texto-sm);
}

.datos {
  margin: var(--espacio-3) 0 0;
  padding-top: var(--espacio-3);
  border-top: 1px solid var(--color-borde);
}

.fila {
  display: flex;
  justify-content: space-between;
  gap: var(--espacio-3);
  padding: 2px 0;
}

.fila dt {
  color: var(--color-texto-secundario);
}

.fila dd {
  margin: 0;
  text-align: right;
  font-weight: var(--peso-medio);
}

.total {
  font-weight: var(--peso-fuerte);
}

.aviso {
  margin-top: var(--espacio-3);
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.aviso-pendiente {
  padding: var(--espacio-2) var(--espacio-3);
  border-radius: var(--radio-sm);
  background: var(--estado-pendiente-fondo);
  color: var(--estado-pendiente-texto);
}

.direccion {
  margin-top: var(--espacio-3);
  padding: var(--espacio-3);
  border: 1px solid var(--color-primario-borde);
  border-radius: var(--radio-sm);
  background: var(--color-primario-fondo);
}

.direccion-titulo {
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  color: var(--color-primario-oscuro);
}

.mensaje {
  margin-top: var(--espacio-3);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  color: var(--color-primario);
}

.texto-error {
  margin-top: var(--espacio-3);
}

.confirmar-cancelacion {
  margin-top: var(--espacio-3);
  padding-top: var(--espacio-3);
  border-top: 1px solid var(--color-borde);
  font-size: var(--texto-sm);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--espacio-2);
  margin-top: var(--espacio-4);
}

.acciones .boton {
  min-height: 40px;
  padding: 0 var(--espacio-4);
  font-size: var(--texto-sm);
}

.boton-cancelar {
  color: var(--estado-cancelada-texto);
}

.boton-peligro {
  background: var(--estado-cancelada-texto);
  color: var(--color-superficie);
}
</style>
