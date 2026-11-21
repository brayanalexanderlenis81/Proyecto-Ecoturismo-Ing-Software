-- Eco Turismo Experiencial - Estructura para PostgreSQL 16 (versión 2).
-- Ejecutar conectado a la base ecoturismo, con el propietario de la base.
-- No contiene DROP ni borra información existente. Si ya existe el esquema,
-- la instalación se detiene: no se sustituyen tablas silenciosamente.
-- Versión 2: tipos de dato con validación (DOMAIN), RNT único, reglas de negocio
-- que faltaban, correcciones para cuentas suspendidas, pagos y cancelaciones,
-- protección de incidentes y reseñas, e índices ajustados.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA ecoturismo;
SET LOCAL search_path = ecoturismo, public;
SET LOCAL TIME ZONE 'America/Bogota';

-- 0. Tipos de dato con su regla incluida (DOMAIN): la regla se escribe una vez
--    y se reutiliza en cada columna que la necesite.
-- Nombres de personas: letras (con tildes, ñ, ü, ã, ç...) separadas por un espacio,
-- apóstrofo o guion. Ej.: "María José", "D'Angelo", "Jean-Pierre", "João".
CREATE DOMAIN nombre_persona AS VARCHAR(150)
    CONSTRAINT nombre_valido CHECK (char_length(VALUE) >= 2 AND VALUE ~
    '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÃÕãõÇçÄËÏÖäëïöÿ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÃÕãõÇçÄËÏÖäëïöÿ]+)*$');
-- Correos en minúscula, con la forma usuario@dominio.ext
CREATE DOMAIN correo_electronico AS VARCHAR(254)
    CONSTRAINT correo_valido CHECK (VALUE = lower(btrim(VALUE))
    AND VALUE ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$');
-- Teléfonos: solo dígitos (de 7 a 15), con + opcional al inicio. Ej.: 3001234567, +573001234567
CREATE DOMAIN telefono AS VARCHAR(16)
    CONSTRAINT telefono_valido CHECK (VALUE ~ '^\+?[0-9]{7,15}$');
-- Coordenadas dentro de un rectángulo que encierra a Colombia (incluye San Andrés).
-- Sirve para atrapar errores como invertir la latitud con la longitud.
CREATE DOMAIN latitud_colombia AS NUMERIC(9,6)
    CONSTRAINT latitud_en_colombia CHECK (VALUE BETWEEN -4.3 AND 16.0);
CREATE DOMAIN longitud_colombia AS NUMERIC(9,6)
    CONSTRAINT longitud_en_colombia CHECK (VALUE BETWEEN -82.0 AND -66.8);

-- 1. Cuentas, roles y autorización de datos.
CREATE TABLE usuario (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre nombre_persona NOT NULL,
    correo correo_electronico NOT NULL UNIQUE,
    contrasena_hash VARCHAR(60) NOT NULL
        CHECK (contrasena_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'),
    telefono_privado telefono,
    estado_cuenta VARCHAR(15) NOT NULL DEFAULT 'activa'
        CHECK (estado_cuenta IN ('activa','suspendida')),
    version_sesion INTEGER NOT NULL DEFAULT 1 CHECK (version_sesion > 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE rol (
    id_rol SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE
        CHECK (nombre IN ('turista','anfitrion','negocio_local','administrador'))
);

CREATE TABLE usuario_rol (
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_rol SMALLINT NOT NULL REFERENCES rol(id_rol),
    asignado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE consentimiento (
    id_consentimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    version_politica VARCHAR(30) NOT NULL CHECK (btrim(version_politica) <> ''),
    aceptado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (id_usuario, version_politica)
);

CREATE TABLE perfil_anfitrion (
    id_usuario BIGINT PRIMARY KEY REFERENCES usuario(id_usuario),
    numero_rnt VARCHAR(40) NOT NULL CHECK (btrim(numero_rnt) <> ''),
    estado_rnt VARCHAR(15) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_rnt IN ('pendiente','activo','inactivo')),
    estado_verificacion VARCHAR(15) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_verificacion IN ('pendiente','aprobado','rechazado')),
    id_verificador BIGINT REFERENCES usuario(id_usuario),
    verificado_en TIMESTAMPTZ,
    observacion_verificacion TEXT,
    CHECK (estado_verificacion <> 'aprobado' OR
        (estado_rnt = 'activo' AND id_verificador IS NOT NULL AND verificado_en IS NOT NULL)),
    CONSTRAINT rechazo_con_motivo CHECK (estado_verificacion <> 'rechazado'
        OR nullif(btrim(observacion_verificacion),'') IS NOT NULL)
);
-- Un RNT no se repite entre perfiles vigentes. Si a alguien se le rechaza por usar
-- un RNT ajeno, el dueño real todavía puede registrarlo.
CREATE UNIQUE INDEX rnt_unico ON perfil_anfitrion(numero_rnt)
    WHERE estado_verificacion <> 'rechazado';

-- 2. Oferta, ubicación, imágenes y servicios.
CREATE TABLE municipio (
    id_municipio BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CHECK (btrim(nombre) <> ''),
    departamento VARCHAR(100) NOT NULL CHECK (btrim(departamento) <> ''),
    UNIQUE (nombre, departamento)
);

CREATE TABLE publicacion (
    id_publicacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_anfitrion BIGINT NOT NULL REFERENCES perfil_anfitrion(id_usuario),
    id_municipio BIGINT NOT NULL REFERENCES municipio(id_municipio),
    tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('alojamiento','actividad')),
    categoria VARCHAR(60) NOT NULL CHECK (btrim(categoria) <> ''),
    titulo VARCHAR(160) NOT NULL CHECK (btrim(titulo) <> ''),
    descripcion TEXT NOT NULL CHECK (btrim(descripcion) <> ''),
    precio_base NUMERIC(14,2) NOT NULL CHECK (precio_base > 0),
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    direccion_exacta TEXT NOT NULL CHECK (btrim(direccion_exacta) <> ''),
    latitud_exacta latitud_colombia NOT NULL,
    longitud_exacta longitud_colombia NOT NULL,
    normas TEXT NOT NULL CHECK (btrim(normas) <> ''),
    version_normas VARCHAR(30) NOT NULL CHECK (btrim(version_normas) <> ''),
    estado_moderacion VARCHAR(15) NOT NULL DEFAULT 'en_revision'
        CHECK (estado_moderacion IN ('en_revision','aprobada','rechazada','oculta')),
    pausada BOOLEAN NOT NULL DEFAULT FALSE,
    id_moderador BIGINT REFERENCES usuario(id_usuario),
    moderada_en TIMESTAMPTZ,
    motivo TEXT,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK (estado_moderacion <> 'aprobada' OR
        (id_moderador IS NOT NULL AND moderada_en IS NOT NULL)),
    CHECK (estado_moderacion NOT IN ('rechazada','oculta') OR nullif(btrim(motivo),'') IS NOT NULL)
);

CREATE TABLE alojamiento (
    id_publicacion BIGINT PRIMARY KEY REFERENCES publicacion(id_publicacion),
    hora_entrada TIME,
    hora_salida TIME
);

CREATE TABLE actividad (
    id_publicacion BIGINT PRIMARY KEY REFERENCES publicacion(id_publicacion),
    dificultad VARCHAR(20) NOT NULL CHECK (dificultad IN ('baja','media','alta')),
    requisitos_participante TEXT NOT NULL,
    equipo_incluido TEXT NOT NULL,
    guia_incluido BOOLEAN NOT NULL,
    tiene_seguro BOOLEAN NOT NULL,
    detalle_seguridad TEXT NOT NULL CHECK (btrim(detalle_seguridad) <> '')
);

CREATE TABLE imagen_publicacion (
    id_imagen BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_publicacion BIGINT NOT NULL REFERENCES publicacion(id_publicacion),
    ruta_webp TEXT NOT NULL CHECK (btrim(ruta_webp) <> ''),
    ruta_miniatura TEXT NOT NULL CHECK (btrim(ruta_miniatura) <> ''),
    orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 8),
    UNIQUE (id_publicacion, orden)
);

CREATE TABLE servicio (
    id_servicio BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE CHECK (btrim(nombre) <> '')
);

CREATE TABLE publicacion_servicio (
    id_publicacion BIGINT NOT NULL REFERENCES publicacion(id_publicacion),
    id_servicio BIGINT NOT NULL REFERENCES servicio(id_servicio),
    PRIMARY KEY (id_publicacion, id_servicio)
);

CREATE TABLE salida_actividad (
    id_salida BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_actividad BIGINT NOT NULL REFERENCES actividad(id_publicacion),
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    capacidad_total INTEGER NOT NULL CHECK (capacidad_total > 0),
    estado_salida VARCHAR(12) NOT NULL DEFAULT 'abierta'
        CHECK (estado_salida IN ('abierta','cerrada')),
    CHECK (isfinite(inicio) AND isfinite(fin) AND fin > inicio),
    UNIQUE (id_actividad, inicio)
);

-- 3. Reservas, retenciones y cierres de calendario.
CREATE TABLE reserva (
    id_reserva BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_turista BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_publicacion BIGINT NOT NULL REFERENCES publicacion(id_publicacion),
    id_salida BIGINT REFERENCES salida_actividad(id_salida),
    fecha_entrada DATE,
    fecha_salida DATE,
    personas INTEGER NOT NULL CHECK (personas > 0),
    estado_reserva VARCHAR(15) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_reserva IN ('pendiente','confirmada','cancelada','expirada','completada')),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expira_en TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '15 minutes'),
    subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal > 0),
    comision NUMERIC(14,2) NOT NULL CHECK (comision >= 0),
    total NUMERIC(14,2) GENERATED ALWAYS AS (subtotal + comision) STORED,
    emergencia_nombre nombre_persona NOT NULL,
    emergencia_telefono telefono NOT NULL,
    version_normas_aceptadas VARCHAR(30) NOT NULL,
    normas_aceptadas_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK (isfinite(creada_en) AND isfinite(expira_en) AND expira_en > creada_en),
    CHECK (
      (id_salida IS NULL AND fecha_entrada IS NOT NULL AND fecha_salida IS NOT NULL
       AND isfinite(fecha_entrada) AND isfinite(fecha_salida) AND fecha_salida > fecha_entrada)
      OR (id_salida IS NOT NULL AND fecha_entrada IS NULL AND fecha_salida IS NULL)
    )
);

CREATE TABLE ocupacion_alojamiento (
    id_ocupacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alojamiento BIGINT NOT NULL REFERENCES alojamiento(id_publicacion),
    id_reserva BIGINT UNIQUE REFERENCES reserva(id_reserva),
    periodo_estancia DATERANGE NOT NULL,
    origen VARCHAR(10) NOT NULL CHECK (origen IN ('reserva','anfitrion')),
    estado_ocupacion VARCHAR(10) NOT NULL DEFAULT 'activa'
        CHECK (estado_ocupacion IN ('activa','liberada')),
    motivo TEXT,
    CHECK (NOT isempty(periodo_estancia) AND NOT lower_inf(periodo_estancia)
      AND NOT upper_inf(periodo_estancia) AND isfinite(lower(periodo_estancia))
      AND isfinite(upper(periodo_estancia))),
    CHECK ((origen = 'reserva' AND id_reserva IS NOT NULL)
        OR (origen = 'anfitrion' AND id_reserva IS NULL)),
    CONSTRAINT no_cruzar_alojamiento EXCLUDE USING gist
        (id_alojamiento WITH =, periodo_estancia WITH &&)
        WHERE (estado_ocupacion = 'activa')
);

-- 4. Negocios, planes y pagos simulados.
CREATE TABLE negocio_local (
    id_negocio BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_propietario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_municipio BIGINT NOT NULL REFERENCES municipio(id_municipio),
    nombre VARCHAR(150) NOT NULL CHECK (btrim(nombre) <> ''),
    categoria VARCHAR(60) NOT NULL CHECK (btrim(categoria) <> ''),
    descripcion TEXT NOT NULL CHECK (btrim(descripcion) <> ''),
    direccion TEXT NOT NULL CHECK (btrim(direccion) <> ''),
    latitud latitud_colombia NOT NULL,
    longitud longitud_colombia NOT NULL,
    telefono_comercial telefono NOT NULL,
    estado_moderacion VARCHAR(15) NOT NULL DEFAULT 'en_revision'
        CHECK (estado_moderacion IN ('en_revision','aprobada','rechazada','oculta')),
    id_moderador BIGINT REFERENCES usuario(id_usuario),
    motivo TEXT,
    CHECK (estado_moderacion <> 'aprobada' OR id_moderador IS NOT NULL),
    CHECK (estado_moderacion NOT IN ('rechazada','oculta') OR nullif(btrim(motivo),'') IS NOT NULL)
);

CREATE TABLE plan_visibilidad (
    id_plan BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CHECK (btrim(nombre) <> ''),
    tipo_plan VARCHAR(25) NOT NULL CHECK (tipo_plan IN ('premium_anfitrion','publicidad_negocio')),
    precio NUMERIC(14,2) NOT NULL CHECK (precio > 0),
    duracion_dias INTEGER NOT NULL CHECK (duracion_dias > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE contratacion_plan (
    id_contratacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_plan BIGINT NOT NULL REFERENCES plan_visibilidad(id_plan),
    id_anfitrion BIGINT REFERENCES perfil_anfitrion(id_usuario),
    id_negocio BIGINT REFERENCES negocio_local(id_negocio),
    inicio TIMESTAMPTZ,
    fin TIMESTAMPTZ,
    precio_pactado NUMERIC(14,2) NOT NULL CHECK (precio_pactado > 0),
    estado_contratacion VARCHAR(12) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_contratacion IN ('pendiente','activa','cancelada','vencida')),
    CHECK ((id_anfitrion IS NOT NULL) <> (id_negocio IS NOT NULL)),
    CHECK ((inicio IS NULL AND fin IS NULL)
        OR (inicio IS NOT NULL AND fin IS NOT NULL AND isfinite(inicio) AND isfinite(fin) AND fin > inicio)),
    CHECK (estado_contratacion <> 'activa' OR inicio IS NOT NULL)
);

CREATE TABLE pago (
    id_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva BIGINT REFERENCES reserva(id_reserva),
    id_contratacion BIGINT REFERENCES contratacion_plan(id_contratacion),
    clave_idempotencia VARCHAR(120) NOT NULL UNIQUE CHECK (btrim(clave_idempotencia) <> ''),
    referencia_pasarela VARCHAR(120) UNIQUE,
    medio VARCHAR(10) NOT NULL CHECK (medio IN ('tarjeta','pse','nequi')),
    estado_pago VARCHAR(12) NOT NULL CHECK (estado_pago IN ('pendiente','aprobado','rechazado')),
    valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    aprobado_en TIMESTAMPTZ,
    CHECK ((id_reserva IS NOT NULL) <> (id_contratacion IS NOT NULL)),
    CHECK (estado_pago <> 'aprobado' OR
      (aprobado_en IS NOT NULL AND nullif(btrim(referencia_pasarela),'') IS NOT NULL))
);

CREATE UNIQUE INDEX un_pago_aprobado_por_reserva ON pago(id_reserva)
    WHERE estado_pago = 'aprobado' AND id_reserva IS NOT NULL;
CREATE UNIQUE INDEX un_pago_aprobado_por_plan ON pago(id_contratacion)
    WHERE estado_pago = 'aprobado' AND id_contratacion IS NOT NULL;

-- 5. Reseñas y seguridad de las personas.
CREATE TABLE resena (
    id_resena BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva BIGINT NOT NULL UNIQUE REFERENCES reserva(id_reserva),
    calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT NOT NULL,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    estado_visibilidad VARCHAR(10) NOT NULL DEFAULT 'publica'
        CHECK (estado_visibilidad IN ('publica','oculta')),
    id_moderador BIGINT REFERENCES usuario(id_usuario),
    motivo_ocultacion TEXT,
    CHECK (estado_visibilidad <> 'oculta' OR
       (id_moderador IS NOT NULL AND nullif(btrim(motivo_ocultacion),'') IS NOT NULL))
);

CREATE TABLE incidente (
    id_incidente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva BIGINT NOT NULL REFERENCES reserva(id_reserva),
    id_reportante BIGINT NOT NULL REFERENCES usuario(id_usuario),
    id_administrador BIGINT REFERENCES usuario(id_usuario),
    tipo VARCHAR(60) NOT NULL CHECK (btrim(tipo) <> ''),
    descripcion TEXT NOT NULL CHECK (btrim(descripcion) <> ''),
    estado_incidente VARCHAR(15) NOT NULL DEFAULT 'abierto'
        CHECK (estado_incidente IN ('abierto','en_revision','resuelto')),
    reportado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolucion TEXT,
    resuelto_en TIMESTAMPTZ,
    CHECK (estado_incidente <> 'resuelto' OR
        (id_administrador IS NOT NULL AND resuelto_en IS NOT NULL
         AND nullif(btrim(resolucion),'') IS NOT NULL))
);

-- Índices de búsqueda y de claves foráneas utilizadas con frecuencia.
CREATE INDEX publicacion_busqueda ON publicacion(id_municipio,tipo,categoria,precio_base)
    WHERE estado_moderacion = 'aprobada' AND NOT pausada;
CREATE INDEX publicacion_anfitrion ON publicacion(id_anfitrion);
CREATE INDEX reserva_publicacion_estado ON reserva(id_publicacion,estado_reserva,expira_en);
CREATE INDEX reserva_turista ON reserva(id_turista,creada_en DESC);
CREATE INDEX reserva_salida ON reserva(id_salida,estado_reserva);
CREATE INDEX usuario_rol_por_rol ON usuario_rol(id_rol);
CREATE INDEX negocio_por_ubicacion ON negocio_local(id_municipio,estado_moderacion);
CREATE INDEX incidente_reserva ON incidente(id_reserva);
CREATE INDEX incidente_estado ON incidente(estado_incidente,reportado_en);
CREATE INDEX contratacion_anfitrion ON contratacion_plan(id_anfitrion,fin);
CREATE INDEX contratacion_negocio ON contratacion_plan(id_negocio,fin);
CREATE INDEX pago_creado ON pago(creado_en) WHERE estado_pago = 'aprobado';
CREATE INDEX pago_reserva ON pago(id_reserva);
CREATE INDEX pago_contratacion ON pago(id_contratacion);
CREATE INDEX negocio_propietario ON negocio_local(id_propietario);
CREATE INDEX servicio_publicaciones ON publicacion_servicio(id_servicio);
-- No se crean índices aparte para consentimiento(id_usuario) ni para
-- salida_actividad(id_actividad,inicio): sus UNIQUE ya crean uno que sirve para
-- esas búsquedas, y un índice repetido solo hace más lentas las escrituras.

-- Funciones auxiliares. La identidad de quien llama la valida la API en Node.
CREATE FUNCTION tiene_rol(p_usuario BIGINT,p_rol TEXT) RETURNS BOOLEAN
LANGUAGE SQL STABLE SET search_path = ecoturismo, public AS $$
 SELECT EXISTS (SELECT 1 FROM usuario u JOIN usuario_rol ur USING(id_usuario)
 JOIN rol r USING(id_rol) WHERE u.id_usuario=p_usuario
 AND u.estado_cuenta='activa' AND r.nombre=p_rol)
$$;

CREATE FUNCTION hoy_colombia() RETURNS DATE LANGUAGE SQL VOLATILE AS $$
 SELECT (clock_timestamp() AT TIME ZONE 'America/Bogota')::date
$$;

-- El registro se completa como una transacción: cuenta + rol + consentimiento.
CREATE FUNCTION comprobar_registro_completo() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE v_id BIGINT; v_ids BIGINT[];
BEGIN
 v_ids := CASE WHEN TG_OP='UPDATE' THEN ARRAY[OLD.id_usuario,NEW.id_usuario]
   WHEN TG_OP='DELETE' THEN ARRAY[OLD.id_usuario] ELSE ARRAY[NEW.id_usuario] END;
 FOREACH v_id IN ARRAY v_ids LOOP
 IF EXISTS(SELECT 1 FROM usuario WHERE id_usuario=v_id) THEN
   IF NOT EXISTS(SELECT 1 FROM usuario_rol WHERE id_usuario=v_id)
      OR NOT EXISTS(SELECT 1 FROM consentimiento WHERE id_usuario=v_id) THEN
     RAISE EXCEPTION 'El registro requiere al menos un rol y la autorizacion de datos.' USING ERRCODE='23514';
   END IF;
 END IF;
 END LOOP;
 RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER registro_usuario_completo AFTER INSERT ON usuario
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_registro_completo();
CREATE CONSTRAINT TRIGGER conservar_rol AFTER DELETE OR UPDATE ON usuario_rol
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_registro_completo();
CREATE CONSTRAINT TRIGGER conservar_consentimiento AFTER DELETE OR UPDATE ON consentimiento
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_registro_completo();

-- Suspender (o reactivar) la cuenta o cambiar la contraseña cierra las sesiones abiertas.
CREATE FUNCTION invalidar_sesion_suspendida() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.estado_cuenta IS DISTINCT FROM OLD.estado_cuenta
    OR NEW.contrasena_hash IS DISTINCT FROM OLD.contrasena_hash THEN
   NEW.version_sesion := OLD.version_sesion + 1;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER suspender_sesion BEFORE UPDATE ON usuario
FOR EACH ROW EXECUTE FUNCTION invalidar_sesion_suspendida();

CREATE FUNCTION validar_oferta() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
BEGIN
 -- Las cuentas se revisan al crear, al cambiar de responsable o al aprobar; no en
 -- cada edición. Así, si alguien queda suspendido, un administrador todavía puede
 -- ocultar, rechazar o inactivar lo que esa persona dejó publicado.
 IF TG_TABLE_NAME='perfil_anfitrion' THEN
   IF TG_OP='INSERT' OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario
      OR (NEW.estado_verificacion='aprobado' AND OLD.estado_verificacion<>'aprobado') THEN
     IF NOT tiene_rol(NEW.id_usuario,'anfitrion') THEN
       RAISE EXCEPTION 'La cuenta necesita el rol anfitrion.' USING ERRCODE='23514';
     END IF;
   END IF;
   IF NEW.id_verificador IS NOT NULL AND
      (TG_OP='INSERT' OR NEW.id_verificador IS DISTINCT FROM OLD.id_verificador
       OR NEW.estado_verificacion IS DISTINCT FROM OLD.estado_verificacion) THEN
     IF NOT tiene_rol(NEW.id_verificador,'administrador') THEN
       RAISE EXCEPTION 'El verificador debe ser administrador activo.' USING ERRCODE='23514';
     END IF;
   END IF;
 ELSIF TG_TABLE_NAME='publicacion' THEN
   IF TG_OP='INSERT' OR (NEW.estado_moderacion='aprobada' AND OLD.estado_moderacion<>'aprobada')
      OR (OLD.pausada AND NOT NEW.pausada) THEN
     IF NOT EXISTS(SELECT 1 FROM perfil_anfitrion h JOIN usuario u USING(id_usuario)
         WHERE h.id_usuario=NEW.id_anfitrion AND h.estado_rnt='activo'
         AND h.estado_verificacion='aprobado' AND u.estado_cuenta='activa') THEN
       RAISE EXCEPTION 'El anfitrion debe estar activo y tener el RNT verificado.' USING ERRCODE='23514';
     END IF;
   END IF;
   IF NEW.id_moderador IS NOT NULL AND
      (TG_OP='INSERT' OR NEW.id_moderador IS DISTINCT FROM OLD.id_moderador
       OR NEW.estado_moderacion IS DISTINCT FROM OLD.estado_moderacion) THEN
     IF NOT tiene_rol(NEW.id_moderador,'administrador') THEN
       RAISE EXCEPTION 'La moderacion requiere administrador activo.' USING ERRCODE='23514';
     END IF;
   END IF;
   IF TG_OP='UPDATE' AND (NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.id_anfitrion IS DISTINCT FROM OLD.id_anfitrion) THEN
     RAISE EXCEPTION 'No se cambia el tipo ni el propietario de una publicacion existente.' USING ERRCODE='23514';
   END IF;
   -- Los turistas aceptan una versión de las normas: si el texto cambia, la versión también.
   IF TG_OP='UPDATE' AND NEW.normas IS DISTINCT FROM OLD.normas
      AND NEW.version_normas IS NOT DISTINCT FROM OLD.version_normas THEN
     RAISE EXCEPTION 'Si cambian las normas, cambie tambien su version.' USING ERRCODE='23514';
   END IF;
 ELSIF TG_TABLE_NAME='negocio_local' THEN
   IF TG_OP='INSERT' OR NEW.id_propietario IS DISTINCT FROM OLD.id_propietario
      OR (NEW.estado_moderacion='aprobada' AND OLD.estado_moderacion<>'aprobada') THEN
     IF NOT tiene_rol(NEW.id_propietario,'negocio_local') THEN
       RAISE EXCEPTION 'El propietario necesita rol negocio_local activo.' USING ERRCODE='23514';
     END IF;
   END IF;
   IF NEW.id_moderador IS NOT NULL AND
      (TG_OP='INSERT' OR NEW.id_moderador IS DISTINCT FROM OLD.id_moderador
       OR NEW.estado_moderacion IS DISTINCT FROM OLD.estado_moderacion) THEN
     IF NOT tiene_rol(NEW.id_moderador,'administrador') THEN
       RAISE EXCEPTION 'La moderacion requiere administrador activo.' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_anfitrion BEFORE INSERT OR UPDATE ON perfil_anfitrion
FOR EACH ROW EXECUTE FUNCTION validar_oferta();
CREATE TRIGGER validar_publicacion BEFORE INSERT OR UPDATE ON publicacion
FOR EACH ROW EXECUTE FUNCTION validar_oferta();
CREATE TRIGGER validar_negocio BEFORE INSERT OR UPDATE ON negocio_local
FOR EACH ROW EXECUTE FUNCTION validar_oferta();

-- Especialización total y exclusiva: cada publicación tiene un solo subtipo.
CREATE FUNCTION comprobar_subtipo_publicacion() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE v_id BIGINT; v_ids BIGINT[]; v_tipo TEXT; v_a BOOLEAN; v_b BOOLEAN;
BEGIN
 v_ids := CASE WHEN TG_OP='UPDATE' THEN ARRAY[OLD.id_publicacion,NEW.id_publicacion]
   WHEN TG_OP='DELETE' THEN ARRAY[OLD.id_publicacion] ELSE ARRAY[NEW.id_publicacion] END;
 FOREACH v_id IN ARRAY v_ids LOOP
 SELECT tipo INTO v_tipo FROM publicacion WHERE id_publicacion=v_id;
 IF NOT FOUND THEN CONTINUE; END IF;
 SELECT EXISTS(SELECT 1 FROM alojamiento WHERE id_publicacion=v_id),
        EXISTS(SELECT 1 FROM actividad WHERE id_publicacion=v_id) INTO v_a,v_b;
 IF (v_tipo='alojamiento' AND (NOT v_a OR v_b))
    OR (v_tipo='actividad' AND (NOT v_b OR v_a)) THEN
   RAISE EXCEPTION 'La publicacion % necesita exactamente el subtipo %.',v_id,v_tipo USING ERRCODE='23514';
 END IF;
 END LOOP;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER publicacion_subtipo AFTER INSERT OR UPDATE ON publicacion
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_subtipo_publicacion();
CREATE CONSTRAINT TRIGGER alojamiento_subtipo AFTER INSERT OR UPDATE OR DELETE ON alojamiento
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_subtipo_publicacion();
CREATE CONSTRAINT TRIGGER actividad_subtipo AFTER INSERT OR UPDATE OR DELETE ON actividad
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_subtipo_publicacion();

-- Se llama antes de consultar o apartar disponibilidad de una publicación.
CREATE FUNCTION liberar_reservas_vencidas(p_publicacion BIGINT) RETURNS INTEGER
LANGUAGE plpgsql SET search_path = ecoturismo, public AS $$
DECLARE v_cantidad INTEGER;
BEGIN
 PERFORM 1 FROM publicacion WHERE id_publicacion=p_publicacion FOR UPDATE;
 UPDATE reserva SET estado_reserva='expirada'
 WHERE id_publicacion=p_publicacion AND estado_reserva='pendiente' AND expira_en<=clock_timestamp();
 GET DIAGNOSTICS v_cantidad = ROW_COUNT;
 RETURN v_cantidad;
END $$;

CREATE FUNCTION validar_reserva() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE p publicacion%ROWTYPE; s salida_actividad%ROWTYPE; v_ocupados BIGINT; v_fin TIMESTAMPTZ;
BEGIN
 SELECT * INTO p FROM publicacion WHERE id_publicacion=NEW.id_publicacion FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La publicacion no existe.' USING ERRCODE='23503'; END IF;
 IF TG_OP='INSERT' THEN
   PERFORM liberar_reservas_vencidas(NEW.id_publicacion);
   IF NEW.estado_reserva<>'pendiente' THEN
     RAISE EXCEPTION 'Toda reserva comienza pendiente de pago.' USING ERRCODE='23514';
   END IF;
   IF NOT tiene_rol(NEW.id_turista,'turista') THEN
     RAISE EXCEPTION 'Se requiere un turista activo.' USING ERRCODE='23514';
   END IF;
   IF p.estado_moderacion<>'aprobada' OR p.pausada OR NOT EXISTS(
     SELECT 1 FROM perfil_anfitrion h JOIN usuario u USING(id_usuario)
     WHERE h.id_usuario=p.id_anfitrion AND h.estado_rnt='activo'
     AND h.estado_verificacion='aprobado' AND u.estado_cuenta='activa') THEN
     RAISE EXCEPTION 'La publicacion no esta disponible.' USING ERRCODE='23514';
   END IF;
   IF NEW.version_normas_aceptadas<>p.version_normas THEN
     RAISE EXCEPTION 'Debe aceptar la version vigente de las normas.' USING ERRCODE='23514';
   END IF;
   -- Un anfitrión no puede reservar lo suyo (por ejemplo, para inflar sus reseñas).
   IF NEW.id_turista=p.id_anfitrion THEN
     RAISE EXCEPTION 'Un anfitrion no puede reservar su propia publicacion.' USING ERRCODE='23514';
   END IF;
   IF NEW.expira_en<=clock_timestamp() OR NEW.expira_en>clock_timestamp()+INTERVAL '15 minutes 1 second' THEN
     RAISE EXCEPTION 'El apartado debe vencer en un maximo de 15 minutos.' USING ERRCODE='23514';
   END IF;
 ELSE
   IF ROW(NEW.id_turista,NEW.id_publicacion,NEW.id_salida,NEW.fecha_entrada,NEW.fecha_salida,
      NEW.personas,NEW.subtotal,NEW.comision,NEW.creada_en,NEW.version_normas_aceptadas)
      IS DISTINCT FROM ROW(OLD.id_turista,OLD.id_publicacion,OLD.id_salida,OLD.fecha_entrada,
      OLD.fecha_salida,OLD.personas,OLD.subtotal,OLD.comision,OLD.creada_en,OLD.version_normas_aceptadas) THEN
     RAISE EXCEPTION 'Para cambiar fechas, cantidad o precio se crea otra reserva.' USING ERRCODE='23514';
   END IF;
   IF NEW.expira_en>OLD.expira_en THEN
     RAISE EXCEPTION 'No se permite extender el apartado de pago.' USING ERRCODE='23514';
   END IF;
   IF NEW.estado_reserva IS DISTINCT FROM OLD.estado_reserva THEN
     IF NOT ((OLD.estado_reserva='pendiente' AND NEW.estado_reserva IN ('confirmada','cancelada','expirada'))
        OR (OLD.estado_reserva='confirmada' AND NEW.estado_reserva IN ('cancelada','completada'))) THEN
       RAISE EXCEPTION 'Cambio de estado de reserva no permitido.' USING ERRCODE='23514';
     END IF;
     IF NEW.estado_reserva='expirada' AND NEW.expira_en>clock_timestamp() THEN
       RAISE EXCEPTION 'La reserva todavia no ha vencido.' USING ERRCODE='23514';
     END IF;
     IF NEW.estado_reserva='confirmada' AND (NEW.expira_en<=clock_timestamp() OR NOT EXISTS(
       SELECT 1 FROM pago WHERE id_reserva=NEW.id_reserva AND estado_pago='aprobado')) THEN
       RAISE EXCEPTION 'Confirmacion requiere apartado vigente y pago aprobado.' USING ERRCODE='23514';
     END IF;
     IF NEW.estado_reserva='confirmada' AND p.estado_moderacion<>'aprobada' THEN
       RAISE EXCEPTION 'La publicacion fue retirada; la reserva no se puede confirmar.' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;

 IF p.tipo='alojamiento' THEN
   IF NEW.id_salida IS NOT NULL OR NEW.fecha_entrada IS NULL OR NEW.fecha_salida IS NULL THEN
     RAISE EXCEPTION 'Un alojamiento se reserva por fecha de entrada y salida.' USING ERRCODE='23514';
   END IF;
   IF TG_OP='INSERT' AND (NEW.fecha_entrada<hoy_colombia() OR NEW.personas>p.capacidad) THEN
     RAISE EXCEPTION 'Fecha o capacidad de alojamiento no valida.' USING ERRCODE='23514';
   END IF;
   IF TG_OP='INSERT' THEN NEW.subtotal:=p.precio_base*(NEW.fecha_salida-NEW.fecha_entrada); END IF;
   v_fin:=(NEW.fecha_salida::timestamp AT TIME ZONE 'America/Bogota');
   -- Esta restricción es para reservas pagadas; una pendiente se puede soltar siempre.
   IF TG_OP='UPDATE' AND NEW.estado_reserva='cancelada' AND OLD.estado_reserva='confirmada'
      AND NEW.fecha_entrada<=hoy_colombia() THEN
     RAISE EXCEPTION 'Solo se cancela antes de la fecha de llegada.' USING ERRCODE='23514';
   END IF;
 ELSE
   SELECT * INTO s FROM salida_actividad WHERE id_salida=NEW.id_salida FOR UPDATE;
   IF NOT FOUND OR s.id_actividad<>NEW.id_publicacion OR NEW.fecha_entrada IS NOT NULL OR NEW.fecha_salida IS NOT NULL THEN
     RAISE EXCEPTION 'La salida debe pertenecer a la actividad reservada.' USING ERRCODE='23514';
   END IF;
   IF TG_OP='INSERT' AND (s.estado_salida<>'abierta' OR s.inicio<=clock_timestamp()) THEN
     RAISE EXCEPTION 'La salida ya no admite reservas.' USING ERRCODE='23514';
   END IF;
   IF NEW.estado_reserva IN ('pendiente','confirmada') THEN
     SELECT coalesce(sum(personas),0) INTO v_ocupados FROM reserva
      WHERE id_salida=NEW.id_salida AND id_reserva<>coalesce(NEW.id_reserva,-1)
      AND (estado_reserva='confirmada' OR (estado_reserva='pendiente' AND expira_en>clock_timestamp()));
     IF v_ocupados+NEW.personas>s.capacidad_total THEN
       RAISE EXCEPTION 'No hay cupos suficientes para esa salida.' USING ERRCODE='23514';
     END IF;
   END IF;
   IF TG_OP='INSERT' THEN NEW.subtotal:=p.precio_base*NEW.personas; END IF;
   v_fin:=s.fin;
   IF TG_OP='UPDATE' AND NEW.estado_reserva='cancelada' AND OLD.estado_reserva='confirmada' AND s.inicio<=clock_timestamp() THEN
     RAISE EXCEPTION 'La actividad ya comenzo; no se puede cancelar.' USING ERRCODE='23514';
   END IF;
 END IF;
 IF NEW.estado_reserva='completada' AND v_fin>clock_timestamp() THEN
   RAISE EXCEPTION 'La experiencia aun no ha terminado.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reserva_validacion BEFORE INSERT OR UPDATE ON reserva
FOR EACH ROW EXECUTE FUNCTION validar_reserva();

CREATE FUNCTION sincronizar_ocupacion() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
BEGIN
 IF NEW.id_salida IS NULL THEN
   IF TG_OP='INSERT' THEN
     INSERT INTO ocupacion_alojamiento(id_alojamiento,id_reserva,periodo_estancia,origen)
     VALUES(NEW.id_publicacion,NEW.id_reserva,daterange(NEW.fecha_entrada,NEW.fecha_salida,'[)'),'reserva');
   ELSE
     UPDATE ocupacion_alojamiento SET estado_ocupacion=CASE
        WHEN NEW.estado_reserva IN ('cancelada','expirada') THEN 'liberada' ELSE 'activa' END
     WHERE id_reserva=NEW.id_reserva;
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER reserva_ocupacion AFTER INSERT OR UPDATE ON reserva
FOR EACH ROW EXECUTE FUNCTION sincronizar_ocupacion();

CREATE FUNCTION validar_ocupacion() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE r reserva%ROWTYPE; v_esperado TEXT;
BEGIN
 PERFORM 1 FROM publicacion WHERE id_publicacion=NEW.id_alojamiento FOR UPDATE;
 IF TG_OP='UPDATE' AND ROW(NEW.id_alojamiento,NEW.id_reserva,NEW.origen)
   IS DISTINCT FROM ROW(OLD.id_alojamiento,OLD.id_reserva,OLD.origen) THEN
   RAISE EXCEPTION 'No se cambia el recurso ni el origen de una ocupacion.' USING ERRCODE='23514';
 END IF;
 IF NEW.origen='anfitrion' THEN
   IF TG_OP='INSERT' THEN PERFORM liberar_reservas_vencidas(NEW.id_alojamiento); END IF;
 ELSE
   SELECT * INTO r FROM reserva WHERE id_reserva=NEW.id_reserva;
   v_esperado:=CASE WHEN r.estado_reserva IN ('cancelada','expirada') THEN 'liberada' ELSE 'activa' END;
   IF NOT FOUND OR r.id_salida IS NOT NULL OR r.id_publicacion<>NEW.id_alojamiento
      OR NEW.periodo_estancia<>daterange(r.fecha_entrada,r.fecha_salida,'[)')
      OR NEW.estado_ocupacion<>v_esperado THEN
     RAISE EXCEPTION 'La ocupacion debe coincidir con la reserva y su estado.' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ocupacion_validacion BEFORE INSERT OR UPDATE ON ocupacion_alojamiento
FOR EACH ROW EXECUTE FUNCTION validar_ocupacion();

CREATE FUNCTION validar_salida() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE v_capacidad INTEGER; v_ocupados BIGINT;
BEGIN
 SELECT capacidad INTO v_capacidad FROM publicacion WHERE id_publicacion=NEW.id_actividad FOR UPDATE;
 IF TG_OP='UPDATE' AND ROW(NEW.id_actividad,NEW.inicio,NEW.fin) IS DISTINCT FROM ROW(OLD.id_actividad,OLD.inicio,OLD.fin)
   AND EXISTS(SELECT 1 FROM reserva WHERE id_salida=OLD.id_salida) THEN
   RAISE EXCEPTION 'No cambie el horario de una salida con reservas.' USING ERRCODE='23514';
 END IF;
 IF (TG_OP='INSERT' OR ROW(NEW.inicio,NEW.fin) IS DISTINCT FROM ROW(OLD.inicio,OLD.fin))
    AND NEW.inicio<=clock_timestamp() THEN
   RAISE EXCEPTION 'La salida debe programarse hacia el futuro.' USING ERRCODE='23514';
 END IF;
 SELECT coalesce(sum(personas),0) INTO v_ocupados FROM reserva WHERE id_salida=NEW.id_salida
  AND (estado_reserva='confirmada' OR (estado_reserva='pendiente' AND expira_en>clock_timestamp()));
 IF NEW.capacidad_total>v_capacidad OR NEW.capacidad_total<v_ocupados THEN
   RAISE EXCEPTION 'La capacidad de salida no respeta el limite o las reservas.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER salida_validacion BEFORE INSERT OR UPDATE ON salida_actividad
FOR EACH ROW EXECUTE FUNCTION validar_salida();

CREATE FUNCTION validar_contratacion() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE p plan_visibilidad%ROWTYPE;
BEGIN
 SELECT * INTO p FROM plan_visibilidad WHERE id_plan=NEW.id_plan;
 IF TG_OP='INSERT' THEN
   IF NOT p.activo OR NEW.estado_contratacion<>'pendiente' THEN
     RAISE EXCEPTION 'Seleccione un plan activo; la contratacion inicia pendiente.' USING ERRCODE='23514';
   END IF;
   NEW.precio_pactado:=p.precio;
   NEW.inicio:=NULL; NEW.fin:=NULL;  -- las fechas las pone el pago aprobado
 ELSE
   IF ROW(NEW.id_plan,NEW.id_anfitrion,NEW.id_negocio,NEW.precio_pactado)
      IS DISTINCT FROM ROW(OLD.id_plan,OLD.id_anfitrion,OLD.id_negocio,OLD.precio_pactado) THEN
     RAISE EXCEPTION 'No se cambian el destino o el precio de una contratacion.' USING ERRCODE='23514';
   END IF;
   -- Estados en orden: pendiente -> activa o cancelada; activa -> cancelada o vencida.
   IF NEW.estado_contratacion IS DISTINCT FROM OLD.estado_contratacion AND NOT (
        (OLD.estado_contratacion='pendiente' AND NEW.estado_contratacion IN ('activa','cancelada'))
     OR (OLD.estado_contratacion='activa' AND NEW.estado_contratacion IN ('cancelada','vencida'))) THEN
     RAISE EXCEPTION 'Cambio de estado del plan no permitido.' USING ERRCODE='23514';
   END IF;
   -- Inicio y fin se fijan una sola vez, cuando el pago activa el plan.
   IF ROW(NEW.inicio,NEW.fin) IS DISTINCT FROM ROW(OLD.inicio,OLD.fin)
      AND NOT (OLD.estado_contratacion='pendiente' AND NEW.estado_contratacion='activa') THEN
     RAISE EXCEPTION 'Las fechas del plan las fija el pago y no se modifican.' USING ERRCODE='23514';
   END IF;
   IF NEW.estado_contratacion='vencida' AND NEW.fin>clock_timestamp() THEN
     RAISE EXCEPTION 'El plan todavia no ha vencido.' USING ERRCODE='23514';
   END IF;
 END IF;
 IF (p.tipo_plan='premium_anfitrion' AND (NEW.id_anfitrion IS NULL OR NEW.id_negocio IS NOT NULL))
   OR (p.tipo_plan='publicidad_negocio' AND (NEW.id_negocio IS NULL OR NEW.id_anfitrion IS NOT NULL)) THEN
   RAISE EXCEPTION 'El destino no corresponde al tipo de plan.' USING ERRCODE='23514';
 END IF;
 IF NEW.estado_contratacion='activa' AND NOT EXISTS(
    SELECT 1 FROM pago WHERE id_contratacion=NEW.id_contratacion AND estado_pago='aprobado') THEN
   RAISE EXCEPTION 'El plan requiere un pago aprobado.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER contratacion_validacion BEFORE INSERT OR UPDATE ON contratacion_plan
FOR EACH ROW EXECUTE FUNCTION validar_contratacion();

CREATE FUNCTION validar_pago() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE r reserva%ROWTYPE; c contratacion_plan%ROWTYPE; v_publicacion BIGINT;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF ROW(NEW.id_reserva,NEW.id_contratacion,NEW.clave_idempotencia,NEW.medio,NEW.valor)
     IS DISTINCT FROM ROW(OLD.id_reserva,OLD.id_contratacion,OLD.clave_idempotencia,OLD.medio,OLD.valor)
     OR (OLD.estado_pago IN ('aprobado','rechazado') AND NEW IS DISTINCT FROM OLD) THEN
     RAISE EXCEPTION 'El intento resuelto no se modifica; un reintento usa otra clave.' USING ERRCODE='23514';
   END IF;
 END IF;
 -- La reserva o el plan se revisan solo cuando el intento compromete algo: al
 -- registrarlo (si no llega ya rechazado) o al aprobarlo. Rechazar se permite
 -- siempre, para que ningún pago se quede "pendiente" para siempre.
 IF (TG_OP='INSERT' AND NEW.estado_pago<>'rechazado')
    OR (TG_OP='UPDATE' AND NEW.estado_pago='aprobado' AND OLD.estado_pago<>'aprobado') THEN
   IF NEW.id_reserva IS NOT NULL THEN
     SELECT id_publicacion INTO v_publicacion FROM reserva WHERE id_reserva=NEW.id_reserva;
     PERFORM 1 FROM publicacion WHERE id_publicacion=v_publicacion FOR UPDATE;
     SELECT * INTO r FROM reserva WHERE id_reserva=NEW.id_reserva FOR UPDATE;
     IF NOT FOUND OR r.estado_reserva<>'pendiente' OR r.expira_en<=clock_timestamp() THEN
       RAISE EXCEPTION 'Solo se paga una reserva pendiente y vigente.' USING ERRCODE='23514';
     END IF;
     IF NEW.valor<>r.total THEN RAISE EXCEPTION 'El pago no coincide con el total de la reserva.' USING ERRCODE='23514'; END IF;
   ELSE
     SELECT * INTO c FROM contratacion_plan WHERE id_contratacion=NEW.id_contratacion FOR UPDATE;
     IF NOT FOUND OR c.estado_contratacion<>'pendiente' OR NEW.valor<>c.precio_pactado THEN
       RAISE EXCEPTION 'Contratacion o valor de pago no valido.' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;
 IF NEW.estado_pago='aprobado' AND (TG_OP='INSERT' OR OLD.estado_pago<>'aprobado') THEN
   NEW.aprobado_en:=clock_timestamp();
   NEW.referencia_pasarela:=coalesce(nullif(btrim(NEW.referencia_pasarela),''),'SIM-'||gen_random_uuid()::text);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pago_validacion BEFORE INSERT OR UPDATE ON pago
FOR EACH ROW EXECUTE FUNCTION validar_pago();

CREATE FUNCTION aplicar_pago_aprobado() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
BEGIN
 IF NEW.estado_pago='aprobado' AND (TG_OP='INSERT' OR OLD.estado_pago<>'aprobado') THEN
   IF NEW.id_reserva IS NOT NULL THEN
     UPDATE reserva SET estado_reserva='confirmada' WHERE id_reserva=NEW.id_reserva;
   ELSE
     UPDATE contratacion_plan c SET estado_contratacion='activa',inicio=NEW.aprobado_en,
       fin=NEW.aprobado_en+make_interval(days=>p.duracion_dias)
     FROM plan_visibilidad p WHERE c.id_plan=p.id_plan AND c.id_contratacion=NEW.id_contratacion;
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER pago_aprobado AFTER INSERT OR UPDATE ON pago
FOR EACH ROW EXECUTE FUNCTION aplicar_pago_aprobado();

-- Punto de entrada para una reserva. Comisión: importe calculado por el servidor.
CREATE FUNCTION crear_reserva(p_turista BIGINT,p_publicacion BIGINT,p_entrada DATE,p_salida DATE,
 p_id_salida BIGINT,p_personas INTEGER,p_comision NUMERIC,p_emergencia_nombre TEXT,
 p_emergencia_telefono TEXT,p_version_normas TEXT) RETURNS BIGINT
LANGUAGE plpgsql SET search_path = ecoturismo, public AS $$
DECLARE v_id BIGINT;
BEGIN
 INSERT INTO reserva(id_turista,id_publicacion,fecha_entrada,fecha_salida,id_salida,
  personas,subtotal,comision,emergencia_nombre,emergencia_telefono,version_normas_aceptadas)
 VALUES(p_turista,p_publicacion,p_entrada,p_salida,p_id_salida,p_personas,1,p_comision,
  p_emergencia_nombre,p_emergencia_telefono,p_version_normas) RETURNING id_reserva INTO v_id;
 RETURN v_id;
END $$;

-- Simulador interno: se invoca con resultado pendiente, aprobado o rechazado.
-- No contiene conexión a pasarelas externas ni procesa tarjetas reales.
CREATE FUNCTION registrar_pago_simulado(p_reserva BIGINT,p_contratacion BIGINT,
 p_clave TEXT,p_medio TEXT,p_resultado TEXT) RETURNS BIGINT
LANGUAGE plpgsql SET search_path = ecoturismo, public AS $$
DECLARE v_id BIGINT; v_valor NUMERIC; v_publicacion BIGINT; v_existente pago%ROWTYPE;
BEGIN
 IF (p_reserva IS NOT NULL) = (p_contratacion IS NOT NULL) THEN
   RAISE EXCEPTION 'Seleccione exactamente una reserva o contratacion.' USING ERRCODE='23514';
 END IF;
 IF p_reserva IS NOT NULL THEN
   SELECT id_publicacion INTO v_publicacion FROM reserva WHERE id_reserva=p_reserva;
   PERFORM 1 FROM publicacion WHERE id_publicacion=v_publicacion FOR UPDATE;
   SELECT total INTO v_valor FROM reserva WHERE id_reserva=p_reserva FOR UPDATE;
 ELSE
   SELECT precio_pactado INTO v_valor FROM contratacion_plan WHERE id_contratacion=p_contratacion FOR UPDATE;
 END IF;
 SELECT * INTO v_existente FROM pago WHERE clave_idempotencia=p_clave;
 IF FOUND THEN
   IF v_existente.id_reserva IS DISTINCT FROM p_reserva OR v_existente.id_contratacion IS DISTINCT FROM p_contratacion
      OR v_existente.medio IS DISTINCT FROM p_medio THEN
     RAISE EXCEPTION 'La clave de idempotencia ya corresponde a otra operacion.' USING ERRCODE='23514';
   END IF;
   RETURN v_existente.id_pago;
 END IF;
 INSERT INTO pago(id_reserva,id_contratacion,clave_idempotencia,medio,estado_pago,valor)
 VALUES(p_reserva,p_contratacion,p_clave,p_medio,p_resultado,v_valor) RETURNING id_pago INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION validar_resena_incidente() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ecoturismo, public AS $$
DECLARE r reserva%ROWTYPE; v_anfitrion BIGINT;
BEGIN
 SELECT * INTO r FROM reserva WHERE id_reserva=NEW.id_reserva;
 IF TG_TABLE_NAME='resena' THEN
   IF r.estado_reserva<>'completada' THEN
     RAISE EXCEPTION 'Solo se resena una reserva completada.' USING ERRCODE='23514';
   END IF;
   IF NEW.id_moderador IS NOT NULL AND
      (TG_OP='INSERT' OR NEW.id_moderador IS DISTINCT FROM OLD.id_moderador
       OR NEW.estado_visibilidad IS DISTINCT FROM OLD.estado_visibilidad) THEN
     IF NOT tiene_rol(NEW.id_moderador,'administrador') THEN
       RAISE EXCEPTION 'La moderacion requiere administrador activo.' USING ERRCODE='23514';
     END IF;
   END IF;
 ELSE
   SELECT id_anfitrion INTO v_anfitrion FROM publicacion WHERE id_publicacion=r.id_publicacion;
   IF NEW.id_reportante<>r.id_turista AND NEW.id_reportante<>v_anfitrion THEN
     RAISE EXCEPTION 'Solo las partes de la reserva pueden reportar el incidente.' USING ERRCODE='23514';
   END IF;
   IF NEW.id_administrador IS NOT NULL AND
      (TG_OP='INSERT' OR NEW.id_administrador IS DISTINCT FROM OLD.id_administrador
       OR NEW.estado_incidente IS DISTINCT FROM OLD.estado_incidente) THEN
     IF NOT tiene_rol(NEW.id_administrador,'administrador') THEN
       RAISE EXCEPTION 'El responsable debe ser administrador activo.' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER resena_validacion BEFORE INSERT OR UPDATE ON resena
FOR EACH ROW EXECUTE FUNCTION validar_resena_incidente();
CREATE TRIGGER incidente_validacion BEFORE INSERT OR UPDATE ON incidente
FOR EACH ROW EXECUTE FUNCTION validar_resena_incidente();

CREATE FUNCTION proteger_historial() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'El historial de % se conserva; use sus estados en lugar de borrar.',TG_TABLE_NAME USING ERRCODE='23514';
END $$;
CREATE TRIGGER conservar_reservas BEFORE DELETE ON reserva
FOR EACH ROW EXECUTE FUNCTION proteger_historial();
CREATE TRIGGER conservar_ocupaciones BEFORE DELETE ON ocupacion_alojamiento
FOR EACH ROW EXECUTE FUNCTION proteger_historial();
CREATE TRIGGER conservar_pagos BEFORE DELETE ON pago
FOR EACH ROW EXECUTE FUNCTION proteger_historial();
CREATE TRIGGER conservar_planes_contratados BEFORE DELETE ON contratacion_plan
FOR EACH ROW EXECUTE FUNCTION proteger_historial();
-- Los incidentes son evidencia de seguridad y las reseñas se moderan ocultándolas:
-- ninguno de los dos se borra.
CREATE TRIGGER conservar_incidentes BEFORE DELETE ON incidente
FOR EACH ROW EXECUTE FUNCTION proteger_historial();
CREATE TRIGGER conservar_resenas BEFORE DELETE ON resena
FOR EACH ROW EXECUTE FUNCTION proteger_historial();

-- Vistas de apoyo. No sustituyen los permisos por usuario/rol de la API.
-- Búsqueda pública: omite teléfonos, dirección y coordenadas exactas.
CREATE VIEW v_publicaciones_busqueda AS
SELECT p.id_publicacion,p.tipo,p.categoria,p.titulo,p.descripcion,p.precio_base,p.capacidad,
 m.nombre AS municipio,m.departamento,
 round(p.latitud_exacta,2) AS latitud_aproximada,
 round(p.longitud_exacta,2) AS longitud_aproximada,
 (SELECT round(avg(r.calificacion),2) FROM resena r JOIN reserva x USING(id_reserva)
  WHERE x.id_publicacion=p.id_publicacion AND r.estado_visibilidad='publica') AS calificacion,
 EXISTS(SELECT 1 FROM contratacion_plan c WHERE c.id_anfitrion=p.id_anfitrion
   AND c.estado_contratacion='activa' AND c.inicio<=clock_timestamp() AND c.fin>clock_timestamp()) AS destacado
FROM publicacion p JOIN municipio m USING(id_municipio)
JOIN perfil_anfitrion h ON h.id_usuario=p.id_anfitrion JOIN usuario u ON u.id_usuario=h.id_usuario
WHERE p.estado_moderacion='aprobada' AND NOT p.pausada AND h.estado_rnt='activo'
 AND h.estado_verificacion='aprobado' AND u.estado_cuenta='activa';

CREATE VIEW v_reporte_ingresos AS
SELECT date_trunc('month',p.aprobado_en AT TIME ZONE 'America/Bogota')::date AS mes,
 CASE WHEN p.id_reserva IS NOT NULL THEN 'reservas' ELSE pl.tipo_plan END AS concepto,
 count(*) AS pagos_aprobados,sum(p.valor) AS valor_cobrado_simulado,
 sum(CASE WHEN p.id_reserva IS NOT NULL THEN r.comision ELSE p.valor END) AS ingreso_plataforma
FROM pago p LEFT JOIN reserva r USING(id_reserva)
LEFT JOIN contratacion_plan c USING(id_contratacion) LEFT JOIN plan_visibilidad pl USING(id_plan)
WHERE p.estado_pago='aprobado' GROUP BY 1,2;

INSERT INTO rol(nombre) VALUES ('turista'),('anfitrion'),('negocio_local'),('administrador');

COMMENT ON SCHEMA ecoturismo IS 'Eco Turismo Experiencial: estructura de 21 tablas (version 2).';
COMMENT ON TABLE ocupacion_alojamiento IS 'Apartados, reservas y cierres; EXCLUDE impide rangos activos cruzados.';
COMMENT ON TABLE pago IS 'Pagos simulados; se persiste referencia, nunca informacion de tarjeta.';
COMMENT ON TABLE incidente IS 'Incidentes asociados a reservas; no es una tabla de indicadores estadisticos.';
COMMENT ON COLUMN reserva.comision IS 'Importe de servicio calculado por el servidor; total = subtotal + comision.';
COMMENT ON FUNCTION liberar_reservas_vencidas(BIGINT) IS 'Llamar antes de consultar disponibilidad; la API puede ejecutarla periodicamente por publicacion.';

COMMIT;

-- Comprobación de instalación: deben aparecer 21 tablas y cuatro roles.
SELECT count(*) AS tablas_creadas FROM information_schema.tables
 WHERE table_schema='ecoturismo' AND table_type='BASE TABLE';
SELECT nombre AS roles_disponibles FROM ecoturismo.rol ORDER BY id_rol;
