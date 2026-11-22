<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EncabezadoPrincipal from '../components/EncabezadoPrincipal.vue'
import BarraInferiorTurista from '../components/BarraInferiorTurista.vue'
import { iniciarSesion } from '../datos/servicios.js'
import { guardarSesion, inicioSegunRol } from '../estado/sesion.js'

const route = useRoute()
const router = useRouter()

const formulario = reactive({ correo: '', contrasena: '' })
const enviando = ref(false)
const error = ref('')

function destinoDespues() {
  const redirigir = route.query.redirigir
  return typeof redirigir === 'string' && redirigir.startsWith('/') ? redirigir : inicioSegunRol()
}

async function enviar() {
  error.value = ''
  if (!formulario.correo.trim() || !formulario.contrasena) {
    error.value = 'Escribe tu correo y tu contraseña.'
    return
  }
  enviando.value = true
  try {
    const respuesta = await iniciarSesion({ correo: formulario.correo, contrasena: formulario.contrasena })
    guardarSesion(respuesta.token, respuesta.usuario)
    router.replace(destinoDespues())
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
        <h1 class="titulo-pagina">Iniciar sesión</h1>
        <p class="texto-secundario">Entra para reservar y ver tus reservas.</p>

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Correo</span>
          <input v-model="formulario.correo" type="email" autocomplete="email" />
        </label>

        <label class="campo-borde">
          <span class="campo-borde-etiqueta">Contraseña</span>
          <input v-model="formulario.contrasena" type="password" autocomplete="current-password" />
        </label>

        <p v-if="error" class="texto-error" role="alert">{{ error }}</p>

        <button type="submit" class="boton boton-primario boton-ancho" :disabled="enviando">
          {{ enviando ? 'Entrando…' : 'Iniciar sesión' }}
        </button>

        <p class="pie-formulario">
          ¿No tienes cuenta?
          <RouterLink :to="{ name: 'crear-cuenta', query: route.query }">Crear cuenta</RouterLink>
        </p>
      </form>

      <div class="ayuda-prueba">
        <p><strong>Usuarios de prueba</strong></p>
        <p>Turista: ana@ecoturismo.test</p>
        <p>Anfitriona: laura@ecoturismo.test</p>
        <p>Administrador: admin@ecoturismo.test</p>
        <p>Contraseña: Prueba123*</p>
      </div>
    </main>

    <BarraInferiorTurista activo="perfil" />
  </div>
</template>

<style scoped>
.contenedor-angosto {
  max-width: 440px;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  padding: var(--espacio-6) var(--espacio-5);
}

.formulario .boton-ancho {
  width: 100%;
  margin-top: var(--espacio-4);
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

.ayuda-prueba {
  margin-top: var(--espacio-4);
  padding: var(--espacio-4);
  border: 1px dashed var(--color-primario-borde);
  border-radius: var(--radio-md);
  background: var(--color-primario-fondo);
  font-size: var(--texto-sm);
  color: var(--color-primario-oscuro);
}
</style>
