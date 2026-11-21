<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import FiltrosRapidos from '../components/FiltrosRapidos.vue'
import IconoBase from '../components/IconoBase.vue'
import { registrarCuenta, iniciarSesion } from '../datos/cuentaPrueba.js'
import { guardarSesion } from '../estado/sesion.js'

const route = useRoute()
const router = useRouter()

const roles = { Turista: 'turista', Anfitrión: 'anfitrion' }

const formulario = reactive({
  nombre: '',
  correo: '',
  contrasena: '',
  telefono: '',
  rol: 'turista',
  numero_rnt: '',
  acepta_datos: false
})

const enviando = ref(false)
const error = ref('')

const rolVisible = computed(() => Object.keys(roles).find((texto) => roles[texto] === formulario.rol))

function validar() {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/.test(formulario.nombre.trim())) {
    return 'El nombre solo admite letras y espacios.'
  }
  if (!/^\S+@\S+\.\S+$/.test(formulario.correo.trim())) {
    return 'Escribe un correo válido.'
  }
  if (formulario.contrasena.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (!/^\d{7,15}$/.test(formulario.telefono)) {
    return 'El teléfono debe tener de 7 a 15 números, sin espacios.'
  }
  if (formulario.rol === 'anfitrion' && !formulario.numero_rnt.trim()) {
    return 'Escribe tu número de RNT.'
  }
  if (!formulario.acepta_datos) {
    return 'Debes aceptar la política de tratamiento de datos.'
  }
  return ''
}

async function enviar() {
  error.value = validar()
  if (error.value) {
    return
  }
  const datos = {
    nombre: formulario.nombre.trim(),
    correo: formulario.correo.trim(),
    contrasena: formulario.contrasena,
    telefono: formulario.telefono,
    rol: formulario.rol,
    acepta_datos: formulario.acepta_datos
  }
  if (formulario.rol === 'anfitrion') {
    datos.numero_rnt = formulario.numero_rnt.trim()
  }
  enviando.value = true
  try {
    await registrarCuenta(datos)
    const respuesta = await iniciarSesion({ correo: datos.correo, contrasena: datos.contrasena })
    guardarSesion(respuesta.token, respuesta.usuario)
    const redirigir = route.query.redirigir
    router.replace(typeof redirigir === 'string' && redirigir.startsWith('/') ? redirigir : { name: 'perfil' })
  } catch (problema) {
    error.value = problema.error || 'No pudimos conectar. Intenta de nuevo.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="pagina-con-barra">
    <EncabezadoPrincipal />

    <main class="contenedor-pagina contenedor-angosto">
      <form class="tarjeta-blanca formulario" novalidate @submit.prevent="enviar">
        <h1 class="titulo-pagina">Crear cuenta</h1>
        <p class="texto-secundario">Reserva experiencias o publica tu alojamiento.</p>

        <p class="etiqueta-grupo">Quiero entrar como</p>
        <FiltrosRapidos
          :opciones="Object.keys(roles)"
          :seleccionado="rolVisible"
          @seleccionar="formulario.rol = roles[$event]"
        />

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Nombre completo</span>
          <input v-model="formulario.nombre" type="text" autocomplete="name" />
        </label>

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Correo</span>
          <input v-model="formulario.correo" type="email" autocomplete="email" />
        </label>

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Contraseña</span>
          <input v-model="formulario.contrasena" type="password" autocomplete="new-password" />
        </label>
        <p class="nota">Mínimo 8 caracteres.</p>

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Teléfono</span>
          <input v-model="formulario.telefono" type="tel" inputmode="numeric" autocomplete="tel" />
        </label>

        <template v-if="formulario.rol === 'anfitrion'">
          <label class="campo-borde">
            <span class="campo-borde-etiqueta">Número de RNT</span>
            <input v-model="formulario.numero_rnt" type="text" inputmode="numeric" />
          </label>
          <p class="nota">Podrás publicar cuando un administrador apruebe tu RNT.</p>
        </template>

        <label class="casilla aceptar">
          <input v-model="formulario.acepta_datos" type="checkbox" />
          <span class="casilla-cuadro"><IconoBase nombre="check" :tamano="16" /></span>
          Acepto la política de tratamiento de datos
        </label>

        <p v-if="error" class="texto-error" role="alert">{{ error }}</p>

        <button type="submit" class="boton boton-primario boton-ancho" :disabled="enviando">
          {{ enviando ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>

        <p class="pie-formulario">
          ¿Ya tienes cuenta?
          <RouterLink :to="{ name: 'iniciar-sesion', query: route.query }">Iniciar sesión</RouterLink>
        </p>
      </form>
    </main>

    <BarraInferiorTurista activo="perfil" />
  </div>
</template>

<style scoped>
.contenedor-angosto {
  max-width: 480px;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  padding: var(--espacio-6) var(--espacio-5);
}

.etiqueta-grupo {
  margin-top: var(--espacio-3);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
}

.nota {
  font-size: var(--texto-xs);
  color: var(--color-texto-secundario);
}

.aceptar {
  margin-top: var(--espacio-2);
}

.formulario .boton-ancho {
  width: 100%;
  margin-top: var(--espacio-3);
}

.pie-formulario {
  margin-top: var(--espacio-2);
  text-align: center;
  color: var(--color-texto-secundario);
}

.pie-formulario a {
  color: var(--color-primario);
  font-weight: var(--peso-medio);
}
</style>
