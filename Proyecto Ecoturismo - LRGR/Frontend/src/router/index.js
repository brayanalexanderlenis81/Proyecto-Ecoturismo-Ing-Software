import { createRouter, createWebHistory } from 'vue-router'
import ResultadosView from '../views/ResultadosView.vue'
import DetalleView from '../views/DetalleView.vue'
import ConfirmarReservaView from '../views/ConfirmarReservaView.vue'
import IniciarSesionView from '../views/IniciarSesionView.vue'
import CrearCuentaView from '../views/CrearCuentaView.vue'
import MisReservasView from '../views/MisReservasView.vue'
import PerfilView from '../views/PerfilView.vue'
import MisPublicacionesView from '../views/MisPublicacionesView.vue'
import PublicarView from '../views/PublicarView.vue'
import SalidasView from '../views/SalidasView.vue'
import PanelAdminView from '../views/PanelAdminView.vue'
import { haySesion, tieneRol } from '../estado/sesion.js'

const routes = [
  { path: '/', redirect: '/resultados' },
  { path: '/resultados', name: 'resultados', component: ResultadosView },
  { path: '/publicacion/:id', name: 'detalle', component: DetalleView, props: true },
  {
    path: '/publicacion/:id/reservar',
    name: 'confirmar-reserva',
    component: ConfirmarReservaView,
    props: true,
    meta: { requiereSesion: true, roles: ['turista'] }
  },
  { path: '/iniciar-sesion', name: 'iniciar-sesion', component: IniciarSesionView, meta: { soloSinSesion: true } },
  { path: '/crear-cuenta', name: 'crear-cuenta', component: CrearCuentaView, meta: { soloSinSesion: true } },
  {
    path: '/mis-reservas',
    name: 'mis-reservas',
    component: MisReservasView,
    meta: { requiereSesion: true, roles: ['turista'] }
  },
  { path: '/perfil', name: 'perfil', component: PerfilView, meta: { requiereSesion: true } },
  {
    path: '/anfitrion/publicaciones',
    name: 'mis-publicaciones',
    component: MisPublicacionesView,
    meta: { requiereSesion: true, roles: ['anfitrion'] }
  },
  {
    path: '/anfitrion/publicar',
    name: 'publicar',
    component: PublicarView,
    meta: { requiereSesion: true, roles: ['anfitrion'] }
  },
  {
    path: '/anfitrion/publicaciones/:id/salidas',
    name: 'salidas',
    component: SalidasView,
    props: true,
    meta: { requiereSesion: true, roles: ['anfitrion'] }
  },
  {
    path: '/admin',
    name: 'panel-admin',
    component: PanelAdminView,
    meta: { requiereSesion: true, roles: ['administrador'] }
  },
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
  if (destino.meta.roles && !destino.meta.roles.some(tieneRol)) {
    return { name: 'resultados' }
  }
  if (destino.meta.soloSinSesion && haySesion()) {
    return { name: 'perfil' }
  }
  return true
})

export default router
