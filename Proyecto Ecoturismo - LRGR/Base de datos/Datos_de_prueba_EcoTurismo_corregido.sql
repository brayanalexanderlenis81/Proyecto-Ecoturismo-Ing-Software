-- Eco Turismo Experiencial - Datos de prueba.
-- Correr en pgAdmin, en el Query Tool de la base ecoturismo, DESPUÉS de instalar la estructura.
-- Todo va en una sola transacción: si algo falla, no se guarda nada.
-- Si la base ya tiene datos (por ejemplo, municipios o servicios), los respeta y no los repite.
-- Todos los usuarios de prueba tienen la contraseña: Prueba123*
-- (en la tabla queda guardada cifrada con bcrypt, como lo exige la base).
-- Las fechas se calculan desde el día en que se corre el archivo, así siempre quedan en el futuro.
BEGIN;
SET LOCAL search_path = ecoturismo, public;
SET LOCAL TIME ZONE 'America/Bogota';

-- Si los datos de prueba ya estaban cargados, se detiene sin cambiar nada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM usuario WHERE correo IN ('admin@ecoturismo.test', 'laura@ecoturismo.test',
             'carlos@ecoturismo.test', 'ana@ecoturismo.test', 'andres@ecoturismo.test')) THEN
    RAISE EXCEPTION 'Los datos de prueba ya estaban cargados. No se hizo ningun cambio.';
  END IF;
END $$;

-- 1. Municipios (si alguno ya existe, se deja como está).
INSERT INTO municipio (nombre, departamento) VALUES
  ('Guatavita', 'Cundinamarca'),
  ('Villa de Leyva', 'Boyacá'),
  ('Salento', 'Quindío'),
  ('San Gil', 'Santander'),
  ('Santa Marta', 'Magdalena')
ON CONFLICT (nombre, departamento) DO NOTHING;

-- 2. Usuarios: 1 administrador, 2 anfitriones y 2 turistas.
INSERT INTO usuario (nombre, correo, contrasena_hash, telefono_privado) VALUES
  ('Administrador Plataforma', 'admin@ecoturismo.test',  '$2b$10$RvlKfcgtpF8xu0oyRc1c.uI3JYi0SahbUZcJsBXcpngzXlSUBQ.2i', '3000000001'),
  ('Laura Gómez',              'laura@ecoturismo.test',  '$2b$10$RvlKfcgtpF8xu0oyRc1c.uI3JYi0SahbUZcJsBXcpngzXlSUBQ.2i', '3001112233'),
  ('Carlos Rodríguez',         'carlos@ecoturismo.test', '$2b$10$RvlKfcgtpF8xu0oyRc1c.uI3JYi0SahbUZcJsBXcpngzXlSUBQ.2i', '3104445566'),
  ('Ana Martínez',             'ana@ecoturismo.test',    '$2b$10$RvlKfcgtpF8xu0oyRc1c.uI3JYi0SahbUZcJsBXcpngzXlSUBQ.2i', '3157778899'),
  ('Andrés Pérez',             'andres@ecoturismo.test', '$2b$10$RvlKfcgtpF8xu0oyRc1c.uI3JYi0SahbUZcJsBXcpngzXlSUBQ.2i', '3201234567');

-- Cada usuario necesita su rol y su autorización de datos (si falta alguno, la base no guarda el usuario).
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
  ((SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'),  (SELECT id_rol FROM rol WHERE nombre = 'administrador')),
  ((SELECT id_usuario FROM usuario WHERE correo = 'laura@ecoturismo.test'),  (SELECT id_rol FROM rol WHERE nombre = 'anfitrion')),
  ((SELECT id_usuario FROM usuario WHERE correo = 'carlos@ecoturismo.test'), (SELECT id_rol FROM rol WHERE nombre = 'anfitrion')),
  ((SELECT id_usuario FROM usuario WHERE correo = 'ana@ecoturismo.test'),    (SELECT id_rol FROM rol WHERE nombre = 'turista')),
  ((SELECT id_usuario FROM usuario WHERE correo = 'andres@ecoturismo.test'), (SELECT id_rol FROM rol WHERE nombre = 'turista'));

INSERT INTO consentimiento (id_usuario, version_politica)
SELECT id_usuario, 'v1' FROM usuario
WHERE correo IN ('admin@ecoturismo.test', 'laura@ecoturismo.test', 'carlos@ecoturismo.test',
                 'ana@ecoturismo.test', 'andres@ecoturismo.test');

-- 3. Perfiles de anfitrión, con el RNT activo y verificado por el administrador.
INSERT INTO perfil_anfitrion (id_usuario, numero_rnt, estado_rnt, estado_verificacion, id_verificador, verificado_en) VALUES
  ((SELECT id_usuario FROM usuario WHERE correo = 'laura@ecoturismo.test'),  '900101', 'activo', 'aprobado',
   (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now()),
  ((SELECT id_usuario FROM usuario WHERE correo = 'carlos@ecoturismo.test'), '900102', 'activo', 'aprobado',
   (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now());

-- 4. Publicaciones: 4 alojamientos y 2 actividades.
--    Cinco están aprobadas. La casa del árbol queda "en revisión" para mostrar que
--    la búsqueda pública solo enseña lo que el administrador ya aprobó.
--    Alojamiento: precio por noche. Actividad: precio por persona.
INSERT INTO publicacion (id_anfitrion, id_municipio, tipo, categoria, titulo, descripcion, precio_base, capacidad,
                         direccion_exacta, latitud_exacta, longitud_exacta, normas, version_normas,
                         estado_moderacion, id_moderador, moderada_en) VALUES
  ((SELECT id_usuario FROM usuario WHERE correo = 'laura@ecoturismo.test'),
   (SELECT id_municipio FROM municipio WHERE nombre = 'Guatavita' AND departamento = 'Cundinamarca'),
   'alojamiento', 'Cabaña', 'Cabaña frente al embalse de Tominé',
   'Cabaña de madera con chimenea y vista al embalse, a 10 minutos del pueblo.',
   180000, 4, 'Vereda Potrero Largo, kilómetro 3', 4.933300, -73.833300,
   'No se permiten fiestas. Silencio después de las 10 p. m.', 'v1',
   'aprobada', (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now()),

  ((SELECT id_usuario FROM usuario WHERE correo = 'laura@ecoturismo.test'),
   (SELECT id_municipio FROM municipio WHERE nombre = 'Villa de Leyva' AND departamento = 'Boyacá'),
   'alojamiento', 'Glamping', 'Glamping en las afueras de Villa de Leyva',
   'Domo para dos personas con cama doble, baño privado y vista a las montañas.',
   250000, 2, 'Vía a Santa Sofía, kilómetro 2', 5.633300, -73.525000,
   'No se permiten fiestas. Silencio después de las 10 p. m.', 'v1',
   'aprobada', (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now()),

  ((SELECT id_usuario FROM usuario WHERE correo = 'carlos@ecoturismo.test'),
   (SELECT id_municipio FROM municipio WHERE nombre = 'Salento' AND departamento = 'Quindío'),
   'alojamiento', 'Finca', 'Finca cafetera cerca del Valle de Cocora',
   'Casa campestre en una finca cafetera, con recorrido por los cultivos incluido.',
   320000, 6, 'Vereda Cocora, finca La Esperanza', 4.637500, -75.570800,
   'No se permiten fiestas. Silencio después de las 10 p. m.', 'v1',
   'aprobada', (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now()),

  ((SELECT id_usuario FROM usuario WHERE correo = 'carlos@ecoturismo.test'),
   (SELECT id_municipio FROM municipio WHERE nombre = 'Salento' AND departamento = 'Quindío'),
   'actividad', 'Senderismo', 'Caminata por el Valle de Cocora',
   'Recorrido guiado de cinco horas entre palmas de cera, con parada en una reserva natural.',
   60000, 12, 'Punto de encuentro: parque principal de Salento', 4.638300, -75.487000,
   'Llegar 15 minutos antes. Seguir siempre las indicaciones del guía.', 'v1',
   'aprobada', (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now()),

  ((SELECT id_usuario FROM usuario WHERE correo = 'laura@ecoturismo.test'),
   (SELECT id_municipio FROM municipio WHERE nombre = 'San Gil' AND departamento = 'Santander'),
   'actividad', 'Deportes de aventura', 'Rafting en el río Fonce',
   'Descenso en balsa por el río Fonce con instructores certificados.',
   90000, 8, 'Punto de encuentro: malecón del río Fonce', 6.555000, -73.133600,
   'Llegar 15 minutos antes. Seguir siempre las indicaciones del guía.', 'v1',
   'aprobada', (SELECT id_usuario FROM usuario WHERE correo = 'admin@ecoturismo.test'), now()),

  ((SELECT id_usuario FROM usuario WHERE correo = 'carlos@ecoturismo.test'),
   (SELECT id_municipio FROM municipio WHERE nombre = 'Santa Marta' AND departamento = 'Magdalena'),
   'alojamiento', 'Cabaña', 'Casa del árbol en Minca',
   'Casa en lo alto de un árbol, rodeada de selva y con vista a la Sierra Nevada.',
   210000, 3, 'Vereda Minca, sector El Campano', 11.143000, -74.117000,
   'No se permiten fiestas. Silencio después de las 10 p. m.', 'v1',
   'en_revision', NULL, NULL);

-- Lista de las 6 publicaciones de prueba, para no confundirlas con las que ya tenía la base.
-- Es temporal: se borra sola al terminar el archivo.
CREATE TEMP TABLE pub_prueba ON COMMIT DROP AS
SELECT p.id_publicacion, p.titulo, p.tipo
FROM publicacion p JOIN usuario u ON u.id_usuario = p.id_anfitrion
WHERE u.correo IN ('laura@ecoturismo.test', 'carlos@ecoturismo.test');

-- 5. Cada publicación necesita su detalle según el tipo (lo exige la base).
INSERT INTO alojamiento (id_publicacion, hora_entrada, hora_salida)
SELECT id_publicacion, '15:00', '11:00' FROM pub_prueba WHERE tipo = 'alojamiento';

INSERT INTO actividad (id_publicacion, dificultad, requisitos_participante, equipo_incluido,
                       guia_incluido, tiene_seguro, detalle_seguridad) VALUES
  ((SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Caminata por el Valle de Cocora'), 'media',
   'Buena condición física. Mayores de 12 años.', 'Bastones y botas pantaneras.', TRUE, TRUE,
   'Guía con curso de primeros auxilios y seguro de accidentes incluido.'),
  ((SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Rafting en el río Fonce'), 'alta',
   'Saber nadar. Mayores de 14 años.', 'Casco, chaleco salvavidas y remo.', TRUE, TRUE,
   'Instructores certificados y kayak de rescate durante todo el recorrido.');

-- 6. Servicios de los alojamientos (si alguno ya existe, se reutiliza).
INSERT INTO servicio (nombre) VALUES
  ('Wifi'), ('Parqueadero'), ('Chimenea'), ('Desayuno incluido'), ('Cocina equipada')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO publicacion_servicio (id_publicacion, id_servicio)
SELECT p.id_publicacion, s.id_servicio
FROM pub_prueba p
JOIN servicio s ON
     (p.titulo = 'Cabaña frente al embalse de Tominé'        AND s.nombre IN ('Wifi', 'Parqueadero', 'Chimenea'))
  OR (p.titulo = 'Glamping en las afueras de Villa de Leyva' AND s.nombre IN ('Wifi', 'Desayuno incluido'))
  OR (p.titulo = 'Finca cafetera cerca del Valle de Cocora'  AND s.nombre IN ('Wifi', 'Parqueadero', 'Cocina equipada', 'Desayuno incluido'))
  OR (p.titulo = 'Casa del árbol en Minca'                   AND s.nombre IN ('Desayuno incluido'));

-- 7. Salidas de las actividades (fechas y horas en que se puede reservar).
INSERT INTO salida_actividad (id_actividad, inicio, fin, capacidad_total) VALUES
  ((SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Caminata por el Valle de Cocora'),
   current_date + 7 + time '07:00',  current_date + 7 + time '12:00',  12),
  ((SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Caminata por el Valle de Cocora'),
   current_date + 14 + time '07:00', current_date + 14 + time '12:00', 12),
  ((SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Rafting en el río Fonce'),
   current_date + 8 + time '09:00',  current_date + 8 + time '12:00',  8),
  -- Salida con solo 2 cupos: sirve para mostrar que la base no deja vender más cupos de los que hay.
  ((SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Rafting en el río Fonce'),
   current_date + 9 + time '14:00',  current_date + 9 + time '17:00',  2);

-- 8. Una reserva ya pagada: Ana reserva 2 noches en la cabaña de Guatavita, dentro de 10 días.
--    Sirve para mostrar que la base no deja reservar fechas que ya están ocupadas.
--    La base calcula el subtotal (2 noches x $180.000 = $360.000).
--    La comisión de la plataforma (10 % = $36.000) la manda el backend.
SELECT crear_reserva(
  (SELECT id_usuario FROM usuario WHERE correo = 'ana@ecoturismo.test'),
  (SELECT id_publicacion FROM pub_prueba WHERE titulo = 'Cabaña frente al embalse de Tominé'),
  current_date + 10, current_date + 12, NULL, 2, 36000,
  'Pedro Martínez', '3109876543', 'v1');

-- Pago simulado aprobado: al aprobarse, la base confirma la reserva sola.
SELECT registrar_pago_simulado(
  (SELECT id_reserva FROM reserva
    WHERE id_turista = (SELECT id_usuario FROM usuario WHERE correo = 'ana@ecoturismo.test')),
  NULL, 'datos-prueba-pago-1', 'nequi', 'aprobado');

COMMIT;

-- Resumen: debe salir una sola fila con la versión de la base y lo que hay ahora.
-- Los números incluyen los datos que la base ya tenía antes.
SELECT
  obj_description('ecoturismo'::regnamespace, 'pg_namespace') AS version_de_la_base,
  (SELECT count(*) FROM ecoturismo.usuario)                        AS usuarios,
  (SELECT count(*) FROM ecoturismo.publicacion)                    AS publicaciones,
  (SELECT count(*) FROM ecoturismo.v_publicaciones_busqueda)       AS publicaciones_visibles,
  (SELECT count(*) FROM ecoturismo.salida_actividad)               AS salidas,
  (SELECT count(*) FROM ecoturismo.reserva
    WHERE estado_reserva = 'confirmada')                           AS reservas_confirmadas;
