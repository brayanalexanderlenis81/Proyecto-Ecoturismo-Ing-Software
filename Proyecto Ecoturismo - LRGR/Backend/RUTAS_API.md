# Rutas de la API de Eco Turismo Experiencial

Versión del 20 de noviembre de 2026, con todas las rutas del Sprint 3.

## Datos generales

- **Dirección base:** `http://127.0.0.1:3000`
- El backend acepta peticiones del frontend en `http://localhost:5173` y `http://127.0.0.1:5173`, que son los de Vite.
- Todas las respuestas vienen en JSON. Los errores siempre llegan así: `{ "error": "mensaje" }`.
- Los ids y los precios llegan como texto, por ejemplo `"180000.00"`. Para hacer cuentas, conviértelos con `Number()`.
- Las fechas de entrada y salida van y vienen como `"AAAA-MM-DD"`. Las horas (`inicio`, `fin`, `expira_en`, `creada_en`) llegan en hora UTC con una `Z` al final, que va 5 horas adelante de Colombia. Para mostrarlas: `new Date(valor).toLocaleString("es-CO")`.
- Una ruta que no existe responde `404` con `"Esa ruta no existe."`. Si la base de datos se cae, las listas responden `503` con `"La base de datos no responde. Intenta en unos minutos."`.

### Sesión y roles

- Las rutas marcadas con 🔒 necesitan el token del inicio de sesión en este encabezado:

  ```
  Authorization: Bearer EL_TOKEN
  ```

- El token dura 2 horas. Si falta o venció, la ruta responde `401` con `"Inicia sesión para continuar."`: ahí el front debe mandar a la pantalla de inicio de sesión.
- Los roles vienen en `usuario.roles` al iniciar sesión: `"turista"`, `"anfitrion"` o `"administrador"`. Con eso el front decide qué pantallas mostrar. Si alguien entra a una ruta que no es de su rol, la respuesta es `403`.

## 1. Cuentas

### `POST /api/registro`

```json
{
  "nombre": "Camila Torres",
  "correo": "camila@ecoturismo.test",
  "contrasena": "Segura2026",
  "telefono": "3001234567",
  "rol": "turista",
  "acepta_datos": true
}
```

- `rol` puede ser `"turista"` o `"anfitrion"`. El de anfitrión necesita además `"numero_rnt"`.
- La contraseña debe tener al menos 8 caracteres. El nombre solo admite letras y espacios, y el teléfono, de 7 a 15 números.
- `acepta_datos` tiene que ser `true` (aceptar la política de tratamiento de datos).

Respuestas: `201` con `{ "id_usuario", "nombre", "correo", "rol" }`; `400` si algún dato no cumple; `409` si el correo o el RNT ya están registrados.

Un anfitrión nuevo queda con el RNT **pendiente**: puede iniciar sesión, pero no puede publicar hasta que un administrador se lo apruebe.

### `POST /api/login`

```json
{ "correo": "camila@ecoturismo.test", "contrasena": "Segura2026" }
```

Respuesta `200`:

```json
{
  "token": "eyJhbGciOi…",
  "usuario": { "id_usuario": "13", "nombre": "Camila Torres", "roles": ["turista"] }
}
```

Errores: `401` con `"Correo o contraseña incorrectos."`; `403` si la cuenta está suspendida; `429` después de 10 intentos fallidos en 15 minutos.

### 🔒 `GET /api/perfil`

Datos de la cuenta que inició sesión: `id_usuario`, `nombre`, `correo`, `telefono`, `estado_cuenta` y `roles`. Si es anfitrión, también `numero_rnt`, `estado_verificacion` (`pendiente`, `aprobado` o `rechazado`) y `observacion_verificacion`, que es el motivo si se lo rechazaron. Para los demás roles esos tres llegan en `null`.

Sirve para que el anfitrión vea si ya le aprobaron el RNT y, por lo tanto, si ya puede publicar.

## 2. Búsqueda y detalle (públicas)

### `GET /api/alojamientos` y `GET /api/actividades`

Listas de publicaciones aprobadas. Cada elemento trae `id_publicacion`, `tipo`, `categoria`, `titulo`, `descripcion`, `precio_base`, `capacidad`, `municipio`, `departamento`, `latitud_aproximada`, `longitud_aproximada` (para el mapa con Leaflet), `calificacion` (promedio de reseñas, o `null`) y `destacado`.

- En alojamientos, `precio_base` es **por noche**. En actividades, **por persona**.
- Filtros opcionales, que se pueden combinar:
  - `q`: texto que se busca en el título, la descripción y el municipio.
  - `id_municipio`: el id que sale de `GET /api/municipios`.
  - `precio_max`: precio máximo.
  - `personas`: muestra solo lo que tiene capacidad para esa cantidad.

  Ejemplo: `GET /api/alojamientos?q=leyva&personas=2&precio_max=300000`

### `GET /api/publicaciones/:id`

Detalle de una publicación aprobada: todo lo de la lista, más `normas`, `version_normas`, `servicios` (lista de nombres) e `imagenes` (lista de rutas).

- Si es alojamiento, trae `hora_entrada` y `hora_salida`.
- Si es actividad, trae `dificultad`, `requisitos_participante`, `equipo_incluido`, `guia_incluido`, `tiene_seguro` y `detalle_seguridad`.
- Los campos del otro tipo llegan en `null`.
- No trae la dirección exacta: esa solo se ve en "mis reservas" cuando la reserva está pagada.

Errores: `404` si no existe o no está aprobada; `400` si el id no es un número.

### `GET /api/actividades/:id/salidas`

Salidas abiertas y futuras de una actividad, con los cupos que quedan:

```json
[
  {
    "id_salida": "6",
    "inicio": "2026-11-27T14:00:00.000Z",
    "fin": "2026-11-27T17:00:00.000Z",
    "capacidad_total": 8,
    "cupos_disponibles": 6
  }
]
```

### `GET /api/publicaciones/:id/resenas`

Reseñas visibles de una publicación, la más reciente primero. Cada una trae `id_resena`, `calificacion` (1 a 5), `comentario`, `creada_en` y `turista` (solo el primer nombre).

### `GET /api/municipios`

Lista de `{ "id_municipio", "nombre", "departamento" }` para los formularios y el filtro de búsqueda.

## 3. Turista

### 🔒 `POST /api/reservas`

Para un alojamiento:

```json
{
  "id_publicacion": 5,
  "fecha_entrada": "2027-02-15",
  "fecha_salida": "2027-02-17",
  "personas": 2,
  "emergencia_nombre": "Pedro Martínez",
  "emergencia_telefono": "3109876543",
  "version_normas": "v1"
}
```

- Para una actividad no van las fechas, sino `"id_salida"`, que sale de la lista de salidas.
- `version_normas` es la que trae el detalle de la publicación: el turista acepta esas normas antes de reservar.
- El turista sale del token; no se manda.

Respuesta `201`: la reserva queda apartada **15 minutos** mientras se paga.

```json
{
  "id_reserva": "23",
  "estado_reserva": "pendiente",
  "subtotal": "500000.00",
  "comision": "50000.00",
  "total": "550000.00",
  "expira_en": "2026-11-20T23:01:43.000Z"
}
```

Errores: `409` con `"Esas fechas ya están reservadas."`; `400` con el mensaje de la base (por ejemplo `"No hay cupos suficientes para esa salida."`); `404` si la publicación no existe.

### 🔒 `POST /api/pagos`

```json
{
  "id_reserva": 23,
  "clave_idempotencia": "pago-reserva-23",
  "medio": "nequi",
  "resultado": "aprobado"
}
```

- `medio`: `"tarjeta"`, `"pse"` o `"nequi"`. `resultado` simula la pasarela: `"aprobado"` o `"rechazado"`.
- `clave_idempotencia`: una por cada intento de pago. Si el mismo intento se manda dos veces (por ejemplo, por un doble clic), se repite la clave y no se cobra doble.

Respuesta `201` con `id_pago`, `estado_pago`, `medio`, `valor`, `referencia_pasarela`, `id_reserva` y `estado_reserva`. Si salió aprobado, la reserva queda `"confirmada"`.

Errores: `404` si la reserva no es del usuario; `400` con `"Solo se paga una reserva pendiente y vigente."` si ya venció o ya estaba pagada.

### 🔒 `GET /api/mis-reservas`

Reservas del usuario, la más reciente primero. Cada una trae `id_reserva`, `estado_reserva`, `id_publicacion`, `titulo`, `tipo`, `municipio`, `fecha_entrada` y `fecha_salida` (alojamientos), `inicio` y `fin` (actividades), `personas`, `subtotal`, `comision`, `total`, `expira_en` y `direccion_exacta`.

- `estado_reserva` puede ser `pendiente`, `confirmada`, `expirada`, `cancelada` o `completada`.
- `direccion_exacta` solo llega cuando la reserva está confirmada o completada. En los demás casos llega en `null`.

### 🔒 `POST /api/reservas/:id/cancelar`

Sin cuerpo. Respuesta `200` con `{ "id_reserva", "estado_reserva": "cancelada" }`. Al cancelar, las fechas o los cupos quedan libres para otros.

- Una reserva pagada solo se cancela antes de la fecha de llegada o antes de que empiece la actividad (si no, `400` con el motivo).
- `404` si la reserva no es del usuario o ya no se puede cancelar.

### 🔒 `POST /api/reservas/:id/resena`

```json
{ "calificacion": 5, "comentario": "Los instructores fueron muy pacientes." }
```

- Solo se reseña una reserva pagada cuya experiencia ya terminó (si no, `400` con `"La experiencia aun no ha terminado."`).
- Una reseña por reserva (`409` si se repite).

Respuesta `201` con `id_resena`, `calificacion`, `comentario` y `creada_en`. El promedio de la publicación se actualiza solo.

## 4. Anfitrión

### 🔒 `POST /api/publicaciones`

```json
{
  "tipo": "alojamiento",
  "id_municipio": 7,
  "categoria": "Cabaña",
  "titulo": "Cabaña entre viñedos",
  "descripcion": "Cabaña de madera para cuatro personas, rodeada de viñedos.",
  "precio_base": 220000,
  "capacidad": 4,
  "direccion_exacta": "Vereda Sopotá, kilómetro 4",
  "latitud": 5.6412,
  "longitud": -73.5401,
  "normas": "No se permiten mascotas. Silencio después de las 10 p. m.",
  "hora_entrada": "15:00",
  "hora_salida": "11:00"
}
```

- Para una actividad, en vez de `hora_entrada` y `hora_salida` van `dificultad` (`"baja"`, `"media"` o `"alta"`), `requisitos_participante`, `equipo_incluido`, `guia_incluido` (`true` o `false`), `tiene_seguro` (`true` o `false`) y `detalle_seguridad`.
- La latitud y la longitud tienen que quedar dentro de Colombia. En el formulario se pueden tomar de un clic en el mapa.

Respuesta `201` con `{ "id_publicacion", "titulo", "tipo", "estado_moderacion": "en_revision" }`. No sale al público hasta que un administrador la apruebe.

Errores: `403` si no es anfitrión; `400` con `"Falta el dato: …"` o `"El anfitrion debe estar activo y tener el RNT verificado."`.

### 🔒 `GET /api/anfitrion/publicaciones`

Publicaciones del anfitrión con `estado_moderacion` (`en_revision`, `aprobada` o `rechazada`) y `motivo` cuando se la rechazaron.

### 🔒 `POST /api/anfitrion/publicaciones/:id/salidas`

Crea una salida para una actividad propia. Sin salidas, una actividad no se puede reservar.

```json
{
  "inicio": "2026-12-05T09:00:00-05:00",
  "fin": "2026-12-05T12:00:00-05:00",
  "capacidad_total": 6
}
```

Respuesta `201` con la salida. Errores: `404` si la actividad no es suya; `409` si ya hay una salida a esa hora; `400` si la salida no es a futuro, si el fin va antes del inicio o si la capacidad pasa la de la actividad.

## 5. Administrador

### 🔒 `GET /api/admin/publicaciones`

Publicaciones en revisión, con dirección exacta, normas, municipio y nombre del anfitrión.

### 🔒 `PATCH /api/admin/publicaciones/:id`

```json
{ "decision": "aprobada" }
```

```json
{ "decision": "rechazada", "motivo": "Faltan fotos del lugar." }
```

Respuesta `200` con `{ "id_publicacion", "titulo", "estado_moderacion", "motivo" }`. Para rechazar, el motivo es obligatorio. `404` si ya no está en revisión.

### 🔒 `GET /api/admin/anfitriones`

Anfitriones con el RNT pendiente: `id_usuario`, `nombre`, `correo`, `numero_rnt`, `estado_rnt` y `estado_verificacion`.

### 🔒 `PATCH /api/admin/anfitriones/:id`

```json
{ "decision": "aprobado" }
```

```json
{ "decision": "rechazado", "motivo": "El RNT no aparece en el Registro Nacional de Turismo." }
```

Respuesta `200`. Al aprobarlo, el anfitrión ya puede publicar.

## 6. Estado del sistema

### `GET /api/salud`

`200` con `{ "backend": "funcionando", "base_de_datos": "funcionando" }`, o `503` con `"base_de_datos": "sin conexión"` si la base no responde.

## 7. Usuarios de los datos de prueba

Todos tienen la contraseña `Prueba123*`.

| Correo | Rol |
| --- | --- |
| `admin@ecoturismo.test` | administrador |
| `laura@ecoturismo.test` | anfitriona (RNT aprobado) |
| `carlos@ecoturismo.test` | anfitrión (RNT aprobado) |
| `ana@ecoturismo.test` | turista |
| `andres@ecoturismo.test` | turista |

## 8. Recorridos de las pantallas

- **Turista:** lista o mapa → detalle (normas y `version_normas`) → elegir fechas o salida y contacto de emergencia → reservar → pagar antes de 15 minutos → mis reservas (ahí aparece la dirección exacta) → cancelar o reseñar.
- **Anfitrión:** registro con RNT → espera la aprobación del RNT → publicar → mis publicaciones (ver si se la aprobaron) → crear salidas para sus actividades.
- **Administrador:** anfitriones pendientes → aprobar o rechazar el RNT; publicaciones en revisión → aprobar o rechazar con motivo.
