import { createRouter, createWebHistory } from 'vue-router'
import ResultadosView from '../views/ResultadosView.vue'
import DetalleView from '../views/DetalleView.vue'
import ConfirmarReservaView from '../views/ConfirmarReservaView.vue'
import IniciarSesionView from '../views/IniciarSesionView.vue'
import CrearCuentaView from '../views/CrearCuentaView.vue'
import MisReservasView from '../views/MisReservasView.vue'
import PerfilView from '../views/PerfilView.vue'
import { haySesion } from '../estado/sesion.js'

const routes = [
  { path: '/', redirect: '/resultados' },
  { path: '/resultados', name: 'resultados', component: ResultadosView },
  { path: '/publicacion/:id', name: 'detalle', component: DetalleView, props: true },
  {
    path: '/publicacion/:id/reservar',
    name: 'confirmar-reserva',
    component: ConfirmarReservaView,
    props: true,
    meta: { requiereSesion: true }
  },
  { path: '/iniciar-sesion', name: 'iniciar-sesion', component: IniciarSesionView, meta: { soloSinSesion: true } },
  { path: '/crear-cuenta', name: 'crear-cuenta', component: CrearCuentaView, meta: { soloSinSesion: true } },
  { path: '/mis-reservas', name: 'mis-reservas', component: MisReservasView, meta: { requiereSesion: true } },
  { path: '/perfil', name: 'perfil', component: PerfilView, meta: { requiereSesion: true } },
  { path: '/:pathMatch(.*)*', redirect: '/resultados' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((destino) => {
  if (destino.meta.requiereSesion && !haySesion()) {
    return { name: 'iniciar-sesion', query: { redirigir: destino.fullPath } }
  }
  if (destino.meta.soloSinSesion && haySesion()) {
    return { name: 'perfil' }
  }
  return true
})

export default router
