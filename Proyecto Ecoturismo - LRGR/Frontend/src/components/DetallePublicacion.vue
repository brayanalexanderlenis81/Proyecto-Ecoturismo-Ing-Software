<script setup>
import { ref, computed } from 'vue'
import IconoBase from './IconoBase.vue'
import {
  formatearPrecio,
  formatearCalificacion,
  formatearRangoFechas,
  textoPersonas
} from '../utilidades/formato.js'

const props = defineProps({
  publicacion: { type: Object, required: true },
  busqueda: { type: Object, required: true }
})

const emit = defineEmits(['volver', 'reservar', 'editar-fechas'])

const fotoActual = ref(0)
const verTodasResenas = ref(false)

const resenasVisibles = computed(() =>
  verTodasResenas.value ? props.publicacion.resenas : props.publicacion.resenas.slice(0, 1)
)

const textoServicios = computed(() => props.publicacion.servicios.join(', '))

function cambiarFoto(evento) {
  const galeria = evento.target
  fotoActual.value = Math.round(galeria.scrollLeft / galeria.clientWidth)
}
</script>

<template>
  <article class="detalle">
    <div class="galeria-contenedor">
      <div v-if="publicacion.imagenes.length" class="galeria" @scroll="cambiarFoto">
        <img
          v-for="(imagen, indice) in publicacion.imagenes"
          :key="imagen"
          :src="imagen"
          :alt="publicacion.nombre + ' foto ' + (indice + 1)"
        />
      </div>
      <div v-else class="galeria galeria-vacia">Sin fotos por ahora</div>

      <button type="button" class="boton-volver" aria-label="Volver" @click="emit('volver')">
        <IconoBase nombre="atras" />
      </button>

      <span v-if="publicacion.imagenes.length > 1" class="contador">
        {{ fotoActual + 1 }} / {{ publicacion.imagenes.length }}
      </span>
    </div>

    <div class="cuerpo">
      <div class="principal">
        <section class="seccion encabezado">
          <h1 class="nombre">{{ publicacion.nombre }}</h1>
          <p class="subtitulo">{{ publicacion.tipo }} · {{ publicacion.categoria }} · {{ publicacion.ciudad }}, {{ publicacion.departamento }}</p>
          <a href="#resenas" class="calificacion">
            <IconoBase nombre="estrella" :tamano="18" class="estrella" />
            <span>{{ formatearCalificacion(publicacion.calificacion) }} · {{ publicacion.totalResenas }} reseñas</span>
          </a>
        </section>

        <section class="seccion anfitrion">
          <p class="anfitrion-nombre">{{ publicacion.anfitrion.titulo }}: {{ publicacion.anfitrion.nombre }}</p>
          <p v-if="publicacion.anfitrion.verificado" class="texto-verificado">
            Anfitrión verificado · RNT {{ publicacion.anfitrion.rnt }}
          </p>
        </section>

        <section class="seccion">
          <h2 class="subtitulo-seccion">Sobre este lugar</h2>
          <p class="parrafo">{{ publicacion.descripcion }}</p>
          <p class="parrafo-corto">{{ publicacion.capacidad }}</p>
          <p class="parrafo">Servicios: {{ textoServicios }}.</p>
        </section>

        <section class="seccion">
          <div class="seguridad">
            <h2 class="subtitulo-seccion">Seguridad</h2>
            <h3 class="reglas-titulo">Reglas del lugar</h3>
            <ul class="reglas">
              <li v-for="regla in publicacion.reglas" :key="regla">{{ regla }}</li>
            </ul>
            <p class="nota">La dirección exacta y el teléfono del anfitrión aparecen cuando se confirme la reserva.</p>
          </div>
        </section>

        <section id="resenas" class="seccion">
          <h2 class="subtitulo-seccion">
            Reseñas · {{ formatearCalificacion(publicacion.calificacion) }} ({{ publicacion.totalResenas }})
          </h2>
          <div v-if="resenasVisibles.length" class="resenas">
            <div v-for="resena in resenasVisibles" :key="resena.id" class="resena">
              <p class="resena-autor">{{ resena.autor }}</p>
              <p class="resena-fecha">{{ resena.fecha }}</p>
              <p class="resena-texto">{{ resena.texto }}</p>
            </div>
          </div>
          <p v-else class="parrafo">Aún no hay reseñas escritas.</p>
          <button
            v-if="publicacion.totalResenas > 1"
            type="button"
            class="boton boton-contorno boton-ancho"
            @click="verTodasResenas = !verTodasResenas"
          >
            {{ verTodasResenas ? 'Ver menos reseñas' : 'Ver las ' + publicacion.totalResenas + ' reseñas' }}
          </button>
        </section>

        <section class="seccion">
          <h2 class="subtitulo-seccion">Cerca de aquí</h2>
          <p class="parrafo-secundario">Negocios locales a menos de 20 km</p>
          <ul class="cercanos">
            <li v-for="lugar in publicacion.cercanos" :key="lugar.id">
              <p class="cercano-nombre">{{ lugar.nombre }}</p>
              <p class="cercano-detalle">{{ lugar.tipo }} · {{ lugar.distancia }}</p>
            </li>
          </ul>
        </section>
      </div>

      <aside class="barra-reserva">
        <div class="barra-info">
          <p class="barra-precio">
            <strong>{{ formatearPrecio(publicacion.precio) }}</strong>
            <span> / {{ publicacion.unidadPrecio }}</span>
          </p>
          <button type="button" class="barra-fechas" @click="emit('editar-fechas')">
            {{ formatearRangoFechas(busqueda.fechaInicio, busqueda.fechaFin) }} · {{ textoPersonas(busqueda.personas) }}
          </button>
        </div>
        <button type="button" class="boton boton-primario boton-reservar" @click="emit('reservar')">Reservar</button>
      </aside>
    </div>
  </article>
</template>

<style scoped>
.detalle {
  background: var(--color-superficie);
  padding-bottom: 96px;
}

.galeria-contenedor {
  position: relative;
}

.galeria {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  aspect-ratio: 360 / 258;
  background: var(--color-mapa);
}

.galeria::-webkit-scrollbar {
  display: none;
}

.galeria img {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  scroll-snap-align: start;
}

.galeria-vacia {
  align-items: center;
  justify-content: center;
  color: var(--color-texto-secundario);
}

.boton-volver {
  position: absolute;
  top: var(--espacio-3);
  left: var(--espacio-3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radio-total);
  background: var(--color-superficie);
  box-shadow: var(--sombra-suave);
}

.contador {
  position: absolute;
  right: var(--espacio-3);
  bottom: var(--espacio-3);
  padding: 2px var(--espacio-2);
  border-radius: var(--radio-total);
  background: rgba(0, 0, 0, 0.6);
  color: var(--color-superficie);
  font-size: var(--texto-xs);
}

.seccion {
  padding: var(--espacio-5) var(--espacio-4);
  border-bottom: 1px solid var(--color-borde);
}

.nombre {
  font-size: var(--texto-xl);
  font-weight: var(--peso-fuerte);
}

.subtitulo {
  margin-top: var(--espacio-1);
  color: var(--color-texto-secundario);
}

.calificacion {
  display: inline-flex;
  align-items: center;
  gap: var(--espacio-1);
  margin-top: 2px;
  font-weight: var(--peso-medio);
}

.estrella {
  color: var(--color-estrella);
}

.anfitrion {
  padding-top: var(--espacio-4);
  padding-bottom: var(--espacio-4);
}

.anfitrion-nombre {
  font-weight: var(--peso-medio);
}

.subtitulo-seccion {
  margin-bottom: var(--espacio-3);
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.parrafo {
  line-height: 1.55;
  color: var(--color-texto-secundario);
}

.parrafo + .parrafo,
.parrafo-corto,
.parrafo-corto + .parrafo {
  margin-top: var(--espacio-3);
}

.parrafo-secundario {
  margin-top: calc(var(--espacio-2) * -1);
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.seguridad {
  padding: var(--espacio-5) var(--espacio-4);
  background: var(--color-primario-fondo);
  border: 1px solid var(--color-primario-borde);
  border-radius: var(--radio-sm);
}

.seguridad .subtitulo-seccion {
  color: var(--color-primario-oscuro);
}

.reglas-titulo {
  font-size: var(--texto-md);
  font-weight: var(--peso-medio);
}

.reglas {
  margin: var(--espacio-1) 0 var(--espacio-3);
  padding-left: var(--espacio-5);
  line-height: 1.6;
}

.nota {
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.resenas {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-3);
  margin-bottom: var(--espacio-3);
}

.resena {
  padding: var(--espacio-4);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-sm);
}

.resena-autor {
  font-weight: var(--peso-medio);
}

.resena-fecha {
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.resena-texto {
  margin-top: var(--espacio-2);
  line-height: 1.55;
  color: var(--color-texto-secundario);
}

.boton-ancho {
  width: 100%;
}

.cercanos {
  margin: var(--espacio-3) 0 0;
  padding: 0;
  list-style: none;
}

.cercanos li {
  padding: var(--espacio-3) 0;
}

.cercanos li + li {
  border-top: 1px solid var(--color-borde);
}

.cercano-nombre {
  font-weight: var(--peso-medio);
}

.cercano-detalle {
  font-size: var(--texto-sm);
  color: var(--color-texto-secundario);
}

.barra-reserva {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-3);
  padding: var(--espacio-3) var(--espacio-4);
  background: var(--color-superficie);
  border-top: 1px solid var(--color-borde);
}

.barra-precio strong {
  font-size: var(--texto-lg);
  font-weight: var(--peso-fuerte);
}

.barra-precio span {
  color: var(--color-texto-secundario);
}

.barra-fechas {
  padding: 0;
  border: none;
  background: none;
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  text-decoration: underline;
}

.boton-reservar {
  flex-shrink: 0;
  min-width: 120px;
}

@media (min-width: 1024px) {
  .detalle {
    max-width: 1120px;
    margin: 0 auto;
    padding: var(--espacio-6);
    background: transparent;
  }

  .galeria {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-auto-rows: 1fr;
    gap: var(--espacio-2);
    overflow: hidden;
    aspect-ratio: 1120 / 440;
    border-radius: var(--radio-lg);
  }

  .galeria img:first-child {
    grid-row: span 2;
  }

  .galeria img:only-child {
    grid-column: span 2;
  }

  .contador {
    display: none;
  }

  .cuerpo {
    display: grid;
    grid-template-columns: 1fr 340px;
    align-items: start;
    gap: var(--espacio-8);
    margin-top: var(--espacio-6);
  }

  .principal {
    background: var(--color-superficie);
    border: 1px solid var(--color-borde);
    border-radius: var(--radio-md);
  }

  .principal .seccion:last-child {
    border-bottom: none;
  }

  .seccion {
    padding: var(--espacio-6);
  }

  .nombre {
    font-size: var(--texto-2xl);
  }

  .barra-reserva {
    position: sticky;
    top: var(--espacio-6);
    flex-direction: column;
    align-items: stretch;
    gap: var(--espacio-4);
    padding: var(--espacio-6);
    border: 1px solid var(--color-borde);
    border-radius: var(--radio-md);
    box-shadow: var(--sombra-media);
  }
}
</style>
