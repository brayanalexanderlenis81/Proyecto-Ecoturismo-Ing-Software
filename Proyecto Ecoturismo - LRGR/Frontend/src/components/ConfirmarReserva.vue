<script setup>
import { ref, reactive, computed } from 'vue'
import IconoBase from './IconoBase.vue'
import ImagenPublicacion from './ImagenPublicacion.vue'
import {
  formatearPrecio,
  formatearRangoFechas,
  formatearFechaHora,
  formatearHora,
  calcularNoches,
  textoPersonas
} from '../utilidades/formato.js'

const props = defineProps({
  publicacion: { type: Object, required: true },
  busqueda: { type: Object, required: true },
  contactoInicial: { type: Object, required: true },
  tarifaServicio: { type: Number, required: true },
  salidas: { type: Array, default: () => [] },
  enviando: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['volver', 'continuar'])

const contacto = reactive({ ...props.contactoInicial })
const aceptaReglas = ref(false)
const verReglas = ref(false)
const intentoEnviar = ref(false)

const esActividad = computed(() => props.publicacion.tipo === 'Actividad')

const primeraConCupo = props.salidas.find((salida) => salida.cuposDisponibles >= props.busqueda.personas)
const salidaId = ref(primeraConCupo ? primeraConCupo.id : null)

const salidaElegida = computed(() => props.salidas.find((salida) => salida.id === salidaId.value) || null)

const textoSalida = computed(() =>
  salidaElegida.value
    ? formatearFechaHora(salidaElegida.value.inicio) + ' – ' + formatearHora(salidaElegida.value.fin)
    : 'Elige una salida'
)

const salidaValida = computed(
  () => !esActividad.value || (salidaElegida.value !== null && salidaElegida.value.cuposDisponibles >= props.busqueda.personas)
)

const noches = computed(() => calcularNoches(props.busqueda.fechaInicio, props.busqueda.fechaFin))

const textoNoches = computed(() => (noches.value === 1 ? '1 noche' : noches.value + ' noches'))

const esPorNoche = computed(() => props.publicacion.unidadPrecio === 'noche')

const cantidad = computed(() => (esPorNoche.value ? noches.value : props.busqueda.personas))

const textoCantidad = computed(() => (esPorNoche.value ? textoNoches.value : textoPersonas(props.busqueda.personas)))

const subtotal = computed(() => props.publicacion.precio * cantidad.value)

const tarifa = computed(() => Math.round(subtotal.value * props.tarifaServicio))

const total = computed(() => subtotal.value + tarifa.value)

const contactoValido = computed(() => contacto.nombre.trim() !== '' && contacto.telefono.replace(/\D/g, '').length >= 7)

const puedeContinuar = computed(() => contactoValido.value && aceptaReglas.value && salidaValida.value)

function continuar() {
  intentoEnviar.value = true
  if (!puedeContinuar.value || props.enviando) {
    return
  }
  emit('continuar', {
    publicacionId: props.publicacion.id,
    fechaInicio: props.busqueda.fechaInicio,
    fechaFin: props.busqueda.fechaFin,
    personas: props.busqueda.personas,
    idSalida: esActividad.value && salidaElegida.value ? salidaElegida.value.id : null,
    total: total.value,
    contactoEmergencia: { ...contacto }
  })
}
</script>

<template>
  <section class="confirmar">
    <header class="cabecera">
      <button type="button" class="volver" aria-label="Volver" @click="emit('volver')">
        <IconoBase nombre="atras" />
      </button>
      <h1>Confirmar reserva</h1>
    </header>

    <div class="contenido">
      <div class="tarjeta">
        <div class="resumen">
          <ImagenPublicacion
            class="miniatura"
            :src="publicacion.imagenes[0] || ''"
            :alt="publicacion.nombre"
            :tipo="publicacion.tipo"
            :tamano-icono="32"
          />
          <div>
            <p class="resumen-nombre">{{ publicacion.nombre }}</p>
            <p class="texto-gris">{{ publicacion.categoria }} · {{ publicacion.ciudad }}, {{ publicacion.departamento }}</p>
          </div>
        </div>
        <dl class="datos">
          <div v-if="esActividad" class="fila">
            <dt>Salida</dt>
            <dd>{{ textoSalida }}</dd>
          </div>
          <div v-else class="fila">
            <dt>Fechas</dt>
            <dd>{{ formatearRangoFechas(busqueda.fechaInicio, busqueda.fechaFin, true) }} · {{ textoNoches }}</dd>
          </div>
          <div class="fila">
            <dt>Personas</dt>
            <dd>{{ textoPersonas(busqueda.personas) }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="esActividad" class="tarjeta tarjeta-amplia">
        <h2 class="titulo-tarjeta">Elige la salida</h2>
        <p v-if="salidas.length === 0" class="texto-gris">Esta actividad no tiene salidas abiertas por ahora.</p>
        <label
          v-for="salida in salidas"
          :key="salida.id"
          class="salida"
          :class="{ elegida: salida.id === salidaId, llena: salida.cuposDisponibles < busqueda.personas }"
        >
          <input
            v-model="salidaId"
            type="radio"
            name="salida"
            :value="salida.id"
            :disabled="salida.cuposDisponibles < busqueda.personas"
          />
          <span class="salida-texto">
            <span>{{ formatearFechaHora(salida.inicio) }} – {{ formatearHora(salida.fin) }}</span>
            <span class="texto-gris salida-cupos">
              {{ salida.cuposDisponibles === 1 ? '1 cupo libre' : salida.cuposDisponibles + ' cupos libres' }}
            </span>
          </span>
        </label>
        <p v-if="intentoEnviar && !salidaValida" class="texto-error error">Elige una salida con cupos para {{ textoPersonas(busqueda.personas) }}.</p>
      </div>

      <div class="tarjeta tarjeta-amplia">
        <h2 class="titulo-tarjeta">Detalle del precio</h2>
        <div class="fila fila-precio">
          <span>{{ formatearPrecio(publicacion.precio) }} × {{ textoCantidad }}</span>
          <span>{{ formatearPrecio(subtotal) }}</span>
        </div>
        <div class="fila fila-precio">
          <span>Tarifa de servicio</span>
          <span>{{ formatearPrecio(tarifa) }}</span>
        </div>
        <div class="fila total">
          <span>Total (COP)</span>
          <span>{{ formatearPrecio(total) }}</span>
        </div>
      </div>

      <div class="tarjeta tarjeta-amplia">
        <h2 class="titulo-tarjeta">Contacto de emergencia</h2>
        <p class="texto-gris ayuda">Lo tomamos de tu perfil. Si lo cambias aquí, solo cambia para esta reserva.</p>

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Nombre</span>
          <input v-model="contacto.nombre" type="text" autocomplete="name" />
        </label>
        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Teléfono</span>
          <input v-model="contacto.telefono" type="tel" autocomplete="tel" />
        </label>
        <p v-if="intentoEnviar && !contactoValido" class="texto-error error">Escribe un nombre y un teléfono válidos.</p>
      </div>

      <div class="tarjeta">
        <div class="aceptar">
          <label class="casilla">
            <input v-model="aceptaReglas" type="checkbox" />
            <span class="casilla-cuadro"><IconoBase nombre="check" :tamano="16" /></span>
            Acepto las reglas del lugar
          </label>
          <button type="button" class="ver-reglas" @click="verReglas = !verReglas">
            {{ verReglas ? 'Ocultar' : 'Ver reglas' }}
          </button>
        </div>
        <ul v-if="verReglas" class="reglas">
          <li v-for="regla in publicacion.reglas" :key="regla">{{ regla }}</li>
        </ul>
        <p v-if="intentoEnviar && !aceptaReglas" class="texto-error error">Debes aceptar las reglas para continuar.</p>
      </div>

      <p class="texto-gris aviso">
        Al continuar, {{ esActividad ? 'tus cupos quedan apartados' : 'tus fechas quedan apartadas' }} por 15 minutos mientras pagas.
      </p>

      <p v-if="error" class="texto-error aviso" role="alert">{{ error }}</p>
    </div>

    <div class="pie">
      <button type="button" class="boton boton-primario continuar" :disabled="enviando" @click="continuar">
        {{ enviando ? 'Procesando…' : 'Continuar al pago' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.confirmar {
  min-height: 100vh;
  padding-bottom: 112px;
  background: var(--color-fondo);
}

.cabecera {
  display: flex;
  align-items: center;
  gap: var(--espacio-3);
  padding: var(--espacio-3) var(--espacio-4);
  background: var(--color-superficie);
  border-bottom: 1px solid var(--color-borde);
}

.cabecera h1 {
  font-size: var(--texto-xl);
  font-weight: var(--peso-medio);
}

.volver {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radio-total);
  background: transparent;
}

.volver:hover {
  background: var(--color-fondo);
}

.contenido {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-4);
  padding: var(--espacio-4);
}

.tarjeta {
  padding: var(--espacio-3);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
}

.tarjeta-amplia {
  padding: var(--espacio-4);
}

.resumen {
  display: flex;
  align-items: center;
  gap: var(--espacio-3);
  padding-bottom: var(--espacio-3);
  border-bottom: 1px solid var(--color-borde);
}

.miniatura {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: var(--radio-sm);
}

.resumen-nombre {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.texto-gris {
  color: var(--color-texto-secundario);
}

.datos {
  margin: var(--espacio-2) 0 0;
}

.fila {
  display: flex;
  justify-content: space-between;
  gap: var(--espacio-3);
  padding: 2px 0;
}

.datos dt {
  color: var(--color-texto-secundario);
}

.datos dd {
  margin: 0;
  text-align: right;
  font-weight: var(--peso-medio);
}

.salida {
  display: flex;
  align-items: center;
  gap: var(--espacio-3);
  margin-top: var(--espacio-2);
  padding: var(--espacio-3);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-sm);
  cursor: pointer;
}

.salida.elegida {
  border-color: var(--color-primario);
  background: var(--color-primario-fondo);
}

.salida.llena {
  opacity: 0.55;
  cursor: not-allowed;
}

.salida input {
  accent-color: var(--color-primario);
}

.salida-texto {
  display: flex;
  flex-direction: column;
}

.salida-cupos {
  font-size: var(--texto-sm);
}

.titulo-tarjeta {
  margin-bottom: var(--espacio-2);
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.fila-precio {
  padding: var(--espacio-1) 0;
  color: var(--color-texto-secundario);
}

.total {
  margin-top: var(--espacio-2);
  padding-top: var(--espacio-3);
  border-top: 1px solid var(--color-borde);
  font-size: var(--texto-lg);
  font-weight: var(--peso-fuerte);
}

.ayuda {
  margin-bottom: var(--espacio-4);
  font-size: var(--texto-sm);
}

.aceptar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-2);
}

.ver-reglas {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primario);
  font-weight: var(--peso-medio);
  text-decoration: underline;
}

.reglas {
  margin: var(--espacio-2) 0 0;
  padding-left: var(--espacio-6);
  font-size: var(--texto-sm);
  line-height: 1.6;
  color: var(--color-texto-secundario);
}

.error {
  margin-top: var(--espacio-2);
}

.aviso {
  padding: 0 var(--espacio-1);
  font-size: var(--texto-sm);
}

.pie {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--espacio-4);
  background: var(--color-superficie);
  border-top: 1px solid var(--color-borde);
}

.continuar {
  width: 100%;
}

@media (min-width: 1024px) {
  .confirmar {
    padding-bottom: var(--espacio-10);
  }

  .cabecera {
    padding: var(--espacio-4) var(--espacio-6);
  }

  .contenido,
  .pie {
    max-width: 640px;
    margin: 0 auto;
  }

  .contenido {
    padding: var(--espacio-6) 0 var(--espacio-4);
  }

  .pie {
    position: static;
    padding: 0;
    background: transparent;
    border: none;
  }
}
</style>
