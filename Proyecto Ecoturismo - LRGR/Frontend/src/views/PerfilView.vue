<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import IconoBase from '../components/IconoBase.vue'
import { obtenerPerfil } from '../datos/cuentaPrueba.js'
import { sesion, cerrarSesion } from '../estado/sesion.js'

const router = useRouter()

const perfil = ref(null)
const cargando = ref(true)
const error = ref('')

const nombresRol = {
  turista: 'Turista',
  anfitrion: 'Anfitrión',
  administrador: 'Administrador'
}

const verificacion = {
  pendiente: { texto: 'RNT en revisión', clase: 'estado-pendiente', detalle: 'Podrás publicar cuando un administrador apruebe tu RNT.' },
  aprobado: { texto: 'RNT aprobado', clase: 'estado-confirmada', detalle: 'Ya puedes publicar alojamientos y actividades.' },
  rechazado: { texto: 'RNT rechazado', clase: 'estado-cancelada', detalle: 'Revisa el motivo y vuelve a enviar tus datos.' }
}

const iniciales = computed(() =>
  perfil.value
    ? perfil.value.nombre
        .split(' ')
        .slice(0, 2)
        .map((parte) => parte.charAt(0))
        .join('')
        .toUpperCase()
    : ''
)

const esAnfitrion = computed(() => perfil.value && perfil.value.roles.includes('anfitrion'))

const esTurista = computed(() => perfil.value && perfil.value.roles.includes('turista'))

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    perfil.value = await obtenerPerfil(sesion.token)
  } catch (problema) {
    if (problema.estado === 401) {
      cerrarSesion()
      router.replace({ name: 'iniciar-sesion', query: { redirigir: '/perfil' } })
      return
    }
    error.value = problema.error || 'No pudimos conectar. Intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}

function salir() {
  cerrarSesion()
  router.push({ name: 'resultados' })
}

onMounted(cargar)
</script>

<template>
  <div class="pagina-con-barra">
    <EncabezadoPrincipal />

    <main class="contenedor-pagina">
      <h1 class="titulo-pagina">Perfil</h1>

      <p v-if="cargando" class="texto-secundario aviso-carga">Cargando tu perfil…</p>

      <div v-else-if="error" class="tarjeta-blanca aviso-carga">
        <p class="texto-error">{{ error }}</p>
        <button type="button" class="boton boton-contorno" @click="cargar">Reintentar</button>
      </div>

      <div v-else-if="perfil" class="secciones">
        <section class="tarjeta-blanca cabecera">
          <span class="avatar" aria-hidden="true">{{ iniciales }}</span>
          <div>
            <p class="nombre">{{ perfil.nombre }}</p>
            <div class="roles">
              <span v-for="rol in perfil.roles" :key="rol" class="rol">{{ nombresRol[rol] || rol }}</span>
            </div>
          </div>
        </section>

        <section class="tarjeta-blanca">
          <h2 class="subtitulo">Datos de la cuenta</h2>
          <dl class="datos">
            <div class="fila">
              <dt>Correo</dt>
              <dd>{{ perfil.correo }}</dd>
            </div>
            <div class="fila">
              <dt>Teléfono</dt>
              <dd>{{ perfil.telefono }}</dd>
            </div>
            <div class="fila">
              <dt>Estado de la cuenta</dt>
              <dd class="capital">{{ perfil.estado_cuenta }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="esAnfitrion" class="tarjeta-blanca">
          <h2 class="subtitulo">Verificación de anfitrión</h2>
          <div class="fila">
            <span class="texto-secundario">RNT {{ perfil.numero_rnt }}</span>
            <span v-if="verificacion[perfil.estado_verificacion]" class="etiqueta-estado" :class="verificacion[perfil.estado_verificacion].clase">
              {{ verificacion[perfil.estado_verificacion].texto }}
            </span>
          </div>
          <p v-if="verificacion[perfil.estado_verificacion]" class="texto-secundario detalle">
            {{ verificacion[perfil.estado_verificacion].detalle }}
          </p>
          <p v-if="perfil.observacion_verificacion" class="observacion">
            Motivo: {{ perfil.observacion_verificacion }}
          </p>
        </section>

        <nav class="tarjeta-blanca enlaces">
          <RouterLink v-if="esTurista" :to="{ name: 'mis-reservas' }" class="enlace">
            <IconoBase nombre="calendario" />
            Mis reservas
          </RouterLink>
          <RouterLink :to="{ name: 'resultados' }" class="enlace">
            <IconoBase nombre="brujula" />
            Explorar planes
          </RouterLink>
        </nav>

        <button type="button" class="boton boton-contorno salir" @click="salir">Cerrar sesión</button>
      </div>
    </main>

    <BarraInferiorTurista activo="perfil" />
  </div>
</template>

<style scoped>
.secciones {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-4);
  margin-top: var(--espacio-4);
}

.aviso-carga {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espacio-3);
  margin-top: var(--espacio-4);
  padding: var(--espacio-8) var(--espacio-4);
}

.cabecera {
  display: flex;
  align-items: center;
  gap: var(--espacio-4);
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radio-total);
  background: var(--color-primario-suave);
  color: var(--color-primario-oscuro);
  font-size: var(--texto-xl);
  font-weight: var(--peso-fuerte);
}

.nombre {
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-1);
  margin-top: var(--espacio-1);
}

.rol {
  padding: 2px var(--espacio-2);
  border: 1px solid var(--color-borde-fuerte);
  border-radius: var(--radio-sm);
  font-size: var(--texto-xs);
  font-weight: var(--peso-medio);
}

.subtitulo {
  margin-bottom: var(--espacio-3);
  font-size: var(--texto-lg);
  font-weight: var(--peso-medio);
}

.datos {
  margin: 0;
}

.fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-3);
  padding: var(--espacio-1) 0;
}

.fila dt {
  color: var(--color-texto-secundario);
}

.fila dd {
  margin: 0;
  min-width: 0;
  text-align: right;
  font-weight: var(--peso-medio);
  overflow-wrap: anywhere;
}

.capital {
  text-transform: capitalize;
}

.detalle {
  margin-top: var(--espacio-2);
  font-size: var(--texto-sm);
}

.observacion {
  margin-top: var(--espacio-2);
  padding: var(--espacio-2) var(--espacio-3);
  border-radius: var(--radio-sm);
  background: var(--estado-cancelada-fondo);
  color: var(--estado-cancelada-texto);
  font-size: var(--texto-sm);
}

.enlaces {
  display: flex;
  flex-direction: column;
  padding: var(--espacio-1) var(--espacio-4);
}

.enlace {
  display: flex;
  align-items: center;
  gap: var(--espacio-3);
  min-height: 52px;
  color: var(--color-texto);
  font-weight: var(--peso-medio);
  text-decoration: none;
}

.enlace + .enlace {
  border-top: 1px solid var(--color-borde);
}

.enlace:hover {
  color: var(--color-primario);
}

.salir {
  align-self: stretch;
}

@media (min-width: 1024px) {
  .salir {
    align-self: flex-start;
  }
}
</style>
