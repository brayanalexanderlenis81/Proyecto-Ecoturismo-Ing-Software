import fincaElRoble from '../assets/imagenes/finca-el-roble.jpg'
import glampingBosqueNiebla from '../assets/imagenes/glamping-bosque-niebla.jpg'
import glampingMiradorValle from '../assets/imagenes/glamping-mirador-valle.jpg'
import caminataCocora from '../assets/imagenes/caminata-cocora.jpg'

export const busquedaInicial = {
  destino: '',
  personas: 2
}

export const tipos = ['Alojamiento', 'Actividad']

export const categorias = ['Casa', 'Finca', 'Hotel rural', 'Glamping']

export const rangoPrecio = {
  minimo: 50000,
  maximo: 400000
}

export const tarifaServicio = 0.1

export const contactoEmergenciaPerfil = {
  nombre: 'Ana Ruiz',
  telefono: '300 000 0000'
}

export const publicaciones = [
  {
    id: 1,
    nombre: 'Finca El Roble',
    tipo: 'Alojamiento',
    categoria: 'Finca',
    ciudad: 'Salento',
    departamento: 'Quindío',
    precio: 280000,
    unidadPrecio: 'noche',
    calificacion: 4.8,
    totalResenas: 23,
    destacado: true,
    imagenes: [fincaElRoble, glampingMiradorValle, caminataCocora],
    anfitrion: { nombre: 'Luz Marina', titulo: 'Anfitriona', verificado: true, rnt: '123456' },
    descripcion:
      'Casa campesina entre cafetales, a 10 minutos del parque principal. Tiene dos habitaciones, cocina equipada y una terraza con vista a las montañas.',
    capacidad: 'Hasta 4 huéspedes · 2 habitaciones',
    servicios: ['wifi', 'parqueadero', 'cocina', 'desayuno incluido', 'zona BBQ'],
    reglas: [
      'No se permiten fiestas ni eventos.',
      'Silencio desde las 10:00 p. m.',
      'Mascotas solo con aviso previo.'
    ],
    resenas: [
      {
        id: 1,
        autor: 'Camila R.',
        fecha: 'Octubre de 2026',
        texto: 'Muy tranquila y con una vista increíble. Luz Marina nos recibió con café de la finca.'
      }
    ],
    cercanos: [
      { id: 1, nombre: 'Café de la Plaza', tipo: 'Cafetería', distancia: '1,2 km' },
      { id: 2, nombre: 'Restaurante El Fogón', tipo: 'Restaurante', distancia: '2,5 km' }
    ],
    mapa: { x: 45, y: 38 }
  },
  {
    id: 2,
    nombre: 'Glamping Bosque de Niebla',
    tipo: 'Alojamiento',
    categoria: 'Glamping',
    ciudad: 'Salento',
    departamento: 'Quindío',
    precio: 350000,
    unidadPrecio: 'noche',
    calificacion: 4.9,
    totalResenas: 41,
    destacado: false,
    imagenes: [glampingBosqueNiebla],
    anfitrion: { nombre: 'Andrés Gómez', titulo: 'Anfitrión', verificado: true, rnt: '234567' },
    descripcion:
      'Domo geodésico en medio del bosque de niebla, con terraza de madera, hamaca y desayuno típico servido en la habitación.',
    capacidad: 'Hasta 2 huéspedes · 1 habitación',
    servicios: ['wifi', 'desayuno incluido', 'jacuzzi', 'parqueadero'],
    reglas: ['No se permiten fiestas ni eventos.', 'Silencio desde las 9:00 p. m.', 'No se admiten mascotas.'],
    resenas: [
      {
        id: 1,
        autor: 'Julián P.',
        fecha: 'Septiembre de 2026',
        texto: 'Despertar entre la niebla fue mágico. Todo muy limpio y el anfitrión muy atento.'
      }
    ],
    cercanos: [{ id: 1, nombre: 'Mirador de Salento', tipo: 'Mirador', distancia: '3,0 km' }],
    mapa: { x: 70, y: 52 }
  },
  {
    id: 3,
    nombre: 'Finca Los Cafetales',
    tipo: 'Alojamiento',
    categoria: 'Finca',
    ciudad: 'Filandia',
    departamento: 'Quindío',
    precio: 230000,
    unidadPrecio: 'noche',
    calificacion: 4.6,
    totalResenas: 17,
    destacado: false,
    imagenes: [],
    anfitrion: { nombre: 'Rosa Elena', titulo: 'Anfitriona', verificado: true, rnt: '345678' },
    descripcion:
      'Finca cafetera tradicional con recorrido por el proceso del café, piscina y amplias zonas verdes.',
    capacidad: 'Hasta 6 huéspedes · 3 habitaciones',
    servicios: ['wifi', 'piscina', 'cocina', 'parqueadero'],
    reglas: ['No se permiten fiestas ni eventos.', 'Silencio desde las 10:00 p. m.'],
    resenas: [],
    cercanos: [{ id: 1, nombre: 'Mirador de Filandia', tipo: 'Mirador', distancia: '2,0 km' }],
    mapa: { x: 22, y: 20 }
  },
  {
    id: 4,
    nombre: 'Glamping Mirador del Valle',
    tipo: 'Alojamiento',
    categoria: 'Glamping',
    ciudad: 'Salento',
    departamento: 'Quindío',
    precio: 390000,
    unidadPrecio: 'noche',
    calificacion: 4.7,
    totalResenas: 30,
    destacado: false,
    imagenes: [glampingMiradorValle],
    anfitrion: { nombre: 'Carlos Ruiz', titulo: 'Anfitrión', verificado: true, rnt: '456789' },
    descripcion:
      'Cabaña de madera con balcón panorámico sobre el valle. Ideal para ver el atardecer en pareja.',
    capacidad: 'Hasta 2 huéspedes · 1 habitación',
    servicios: ['wifi', 'desayuno incluido', 'chimenea'],
    reglas: ['No se permiten fiestas ni eventos.', 'No se admiten mascotas.'],
    resenas: [],
    cercanos: [{ id: 1, nombre: 'Restaurante El Fogón', tipo: 'Restaurante', distancia: '4,1 km' }],
    mapa: { x: 34, y: 70 }
  },
  {
    id: 5,
    nombre: 'Caminata al Valle de Cocora',
    tipo: 'Actividad',
    categoria: 'Senderismo',
    ciudad: 'Salento',
    departamento: 'Quindío',
    precio: 90000,
    unidadPrecio: 'persona',
    calificacion: 4.7,
    totalResenas: 58,
    destacado: false,
    imagenes: [caminataCocora],
    anfitrion: { nombre: 'Jorge Patiño', titulo: 'Guía', verificado: true, rnt: '567890' },
    descripcion:
      'Recorrido guiado de 5 horas entre palmas de cera, ríos y bosque de niebla. Incluye refrigerio y seguro.',
    capacidad: 'Grupos de hasta 10 personas · 5 horas',
    servicios: ['guía local', 'refrigerio', 'seguro', 'transporte desde Salento'],
    reglas: ['Usar ropa y calzado adecuados.', 'No dejar basura en el sendero.'],
    resenas: [],
    cercanos: [{ id: 1, nombre: 'Café de la Plaza', tipo: 'Cafetería', distancia: '11 km' }],
    mapa: { x: 80, y: 85 }
  }
]
