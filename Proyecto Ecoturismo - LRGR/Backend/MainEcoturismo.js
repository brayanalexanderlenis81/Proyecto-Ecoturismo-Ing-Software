const express = require("express");
const pg = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt= require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const COMISION = 0.10;
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://ecoturismo-experiencial.vercel.app"]}));
app.use(express.json());
const pool = new pg.Pool({ connectionTimeoutMillis: 10000 });
pool.on("error", function (error) {
    console.error("Error en una conexión de PostgreSQL:", error.message);
});

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    message: { error: "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos." }
});

function verificarToken(solicitud, respuesta, siguiente) {
    const encabezado = solicitud.headers.authorization || "";
    const token = encabezado.replace("Bearer ", "");
    try {
        solicitud.usuario = jwt.verify(token, process.env.JWT_SECRET);
        siguiente();
    } catch (error) {
        respuesta.status(401).json({ error: "Inicia sesión para continuar." });
    }
}

function soloAdministrador(solicitud, respuesta, siguiente) {
    if (!solicitud.usuario.roles.includes("administrador")) {
        return respuesta.status(403).json({ error: "Solo un administrador puede hacer esto." });
    }
    siguiente();
}

function soloAnfitrion(solicitud, respuesta, siguiente) {
    if (!solicitud.usuario.roles.includes("anfitrion")) {
        return respuesta.status(403).json({ error: "Solo un anfitrión puede hacer esto." });
    }
    siguiente();
}

pool.query("SELECT current_database() AS base", function (error, resultado){
    if (error){
        console.error("Error al consultar PostgreSQL", error.message)
    }
    else {
        console.log("Conectado a la base de datos", resultado.rows[0].base);
    }
});

app.get("/", function (solicitud, respuesta) {
  respuesta.send("Hola EcoTurismo Experiencial");
});

app.get("/api/alojamientos", async function (solicitud, respuesta) {
    const filtros = solicitud.query;
    const resultado = await pool.query(
        `SELECT v.*,
                (SELECT i.ruta_miniatura FROM ecoturismo.imagen_publicacion i
                 WHERE i.id_publicacion = v.id_publicacion AND i.orden = 1) AS imagen
         FROM ecoturismo.v_publicaciones_busqueda v
         WHERE tipo = 'alojamiento'
           AND ($1::text IS NULL OR titulo ILIKE '%' || $1 || '%' OR descripcion ILIKE '%' || $1 || '%' OR municipio ILIKE '%' || $1 || '%')
           AND ($2::bigint IS NULL OR id_publicacion IN (SELECT id_publicacion FROM ecoturismo.publicacion WHERE id_municipio = $2))
           AND ($3::numeric IS NULL OR precio_base <= $3)
           AND ($4::int IS NULL OR capacidad >= $4)
         ORDER BY destacado DESC, id_publicacion`,
        [filtros.q || null, filtros.id_municipio || null, filtros.precio_max || null, filtros.personas || null]
    );
    respuesta.json(resultado.rows);
});

app.get("/api/actividades", async function (solicitud, respuesta) {
    const filtros = solicitud.query;
    const resultado = await pool.query(
        `SELECT v.*,
                (SELECT i.ruta_miniatura FROM ecoturismo.imagen_publicacion i
                 WHERE i.id_publicacion = v.id_publicacion AND i.orden = 1) AS imagen
         FROM ecoturismo.v_publicaciones_busqueda v
         WHERE tipo = 'actividad'
           AND ($1::text IS NULL OR titulo ILIKE '%' || $1 || '%' OR descripcion ILIKE '%' || $1 || '%' OR municipio ILIKE '%' || $1 || '%')
           AND ($2::bigint IS NULL OR id_publicacion IN (SELECT id_publicacion FROM ecoturismo.publicacion WHERE id_municipio = $2))
           AND ($3::numeric IS NULL OR precio_base <= $3)
           AND ($4::int IS NULL OR capacidad >= $4)
         ORDER BY destacado DESC, id_publicacion`,
        [filtros.q || null, filtros.id_municipio || null, filtros.precio_max || null, filtros.personas || null]
    );
    respuesta.json(resultado.rows);
});

/*
app.post("/api/reservas", function (solicitud,respuesta){
    const datos = solicitud.body;
    respuesta.json(datos);
});
*/
app.post("/api/reservas", verificarToken, async function (solicitud, respuesta) {
    const datos = solicitud.body;
    try{
    const precio = await pool.query(
        "SELECT precio_base * (CASE WHEN tipo = 'alojamiento' THEN $2::date - $3::date ELSE $4 END) AS subtotal FROM ecoturismo.publicacion WHERE id_publicacion = $1",
        [datos.id_publicacion, datos.fecha_salida, datos.fecha_entrada, datos.personas]
    );
    if (precio.rows.length==0){
        return respuesta.status(404).json({ error: "La publicación no existe"});
    }
    const comision = Math.round(Number(precio.rows[0].subtotal) * COMISION);
    const resultado = await pool.query(
        "SELECT ecoturismo.crear_reserva($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS id_reserva",
        [solicitud.usuario.id_usuario, datos.id_publicacion, datos.fecha_entrada, datos.fecha_salida, datos.id_salida,
         datos.personas, comision, datos.emergencia_nombre, datos.emergencia_telefono, datos.version_normas]
    );
    const reserva = await pool.query(
        "SELECT id_reserva, estado_reserva, subtotal, comision, total, expira_en FROM ecoturismo.reserva WHERE id_reserva = $1",
        [resultado.rows[0].id_reserva]
    );
    respuesta.status(201).json(reserva.rows[0]);
} catch (error) {
    if (error.code === "23P01"){
        respuesta.status(409).json({ error: "Estas fechas ya están reservadas." });
    } else {
        respuesta.status(400).json({ error: error.message});
    }
}
});

app.get("/api/salud", async function (solicitud, respuesta) {
    try {
        await pool.query("SELECT 1");
        respuesta.json({ backend: "funcionando", base_de_datos: "funcionando"}); 
    } catch (error) {
        console.error("Falla en /api/salud:", error.message);
        respuesta.status(503).json({ backend: "funcionando", base_de_datos: "sin conexión"});
    }
});

app.post("/api/pagos", verificarToken, async function (solicitud, respuesta) {
    const datos = solicitud.body;
    try {
        const propia = await pool.query(
            "SELECT id_reserva FROM ecoturismo.reserva WHERE id_reserva = $1 AND id_turista = $2",
            [datos.id_reserva, solicitud.usuario.id_usuario]
        );
        if (propia.rows.length === 0) {
            return respuesta.status(404).json({ error: "No encontramos esa reserva entre las tuyas." });
        }
        const resultado = await pool.query(
           "SELECT ecoturismo.registrar_pago_simulado($1, NULL, $2, $3, $4) AS id_pago",
            [datos.id_reserva, datos.clave_idempotencia, datos.medio, datos.resultado] 
        );
        const pago = await pool.query(
         "SELECT p.id_pago, p.estado_pago, p.medio, p.valor, p.referencia_pasarela, r.id_reserva, r.estado_reserva FROM ecoturismo.pago p JOIN ecoturismo.reserva r ON r.id_reserva = p.id_reserva WHERE p.id_pago = $1",
            [resultado.rows[0].id_pago]   
        );
        respuesta.status(201). json(pago.rows[0]);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.post("/api/registro", async function (solicitud, respuesta) {
    const datos= solicitud.body;
    if (datos.rol !== "turista" && datos.rol !== "anfitrion") {
        return respuesta.status(400).json({ error: "El rol debe ser turista o anfitrión." });
    }
    if (!datos.contrasena || datos.contrasena.length < 8){
        return respuesta.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }
    if (datos.acepta_datos !== true) {
        return respuesta.status(400).json({ error: "Debes aceptar las políticas de tratamiento de datos personales"});
    }
    const hash = await bcrypt.hash(datos.contrasena, 10);
    const cliente = await pool.connect();
    try {
        await cliente.query("BEGIN");
        const nuevo= await cliente.query(
            "INSERT INTO ecoturismo.usuario (nombre, correo, contrasena_hash, telefono_privado) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombre, correo",
            [datos.nombre, String(datos.correo).trim().toLowerCase(), hash, datos.telefono]
        );
        const usuario = nuevo.rows[0];
        await cliente.query(
            "INSERT INTO ecoturismo.usuario_rol (id_usuario, id_rol) VALUES ($1, (SELECT id_rol FROM ecoturismo.rol WHERE nombre = $2))",
            [usuario.id_usuario, datos.rol]
        );
        await cliente.query(
          "INSERT INTO ecoturismo.consentimiento (id_usuario, version_politica) VALUES ($1, 'v1')",
            [usuario.id_usuario]  
        );
        if (datos.rol === "anfitrion") {
            await cliente.query(
                "INSERT INTO ecoturismo.perfil_anfitrion (id_usuario, numero_rnt) VALUES ($1, $2)",
                [usuario.id_usuario, datos.numero_rnt]
            );
        }
        await cliente.query("COMMIT");
        respuesta.status(201).json({ id_usuario: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: datos.rol });
    } catch (error) {
        await cliente.query("ROLLBACK");
        if (error.code === "23505") {
            respuesta.status(409).json({ error: "Ese correo o ese RNT ya están registrados." });
        } else if (error.constraint === "telefono_valido") {
            respuesta.status(400).json({ error: "El número telefónico debe contener entre 7 y 15 dígitos"});
        } else {
            respuesta.status(400).json({ error: error.message });
        }
    } finally {
        cliente.release();
    }
});

app.post("/api/login", limiteLogin, async function (solicitud, respuesta) {
    const datos= solicitud.body; 
    try {
        const resultado = await pool.query(
            "SELECT id_usuario, nombre, contrasena_hash, estado_cuenta FROM ecoturismo.usuario WHERE correo = $1",
            [String(datos.correo).trim().toLowerCase()]
        );
        const usuario= resultado.rows[0];
        if (!usuario) {
            return respuesta.status(401).json({ error: "Correo o contraseña incorrectos."});
        }
        const coincide = await bcrypt.compare(String(datos.contrasena), usuario.contrasena_hash);
        if (!coincide){
            return respuesta.status(401).json({ error: "Correo o contraseña incorrectos."});
        }
        if (usuario.estado_cuenta!== "activa") {
            return respuesta.status(403).json({ error: "La cuenta no está activa"});
        }
        const roles = await pool.query(
           "SELECT r.nombre FROM ecoturismo.usuario_rol ur JOIN ecoturismo.rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = $1",
           [usuario.id_usuario] 
        );
        const listaRoles = roles.rows.map(function (fila) { return fila.nombre; });
        const token = jwt.sign({ id_usuario: usuario.id_usuario, roles: listaRoles}, process.env.JWT_SECRET, {expiresIn:"2h"});
        respuesta.json({
            token: token,
            usuario: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            roles: listaRoles
            }
        });
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/publicaciones/:id", async function (solicitud, respuesta) {
    const id = Number(solicitud.params.id);
    if (!Number.isInteger(id)) {
        return respuesta.status(400).json({ error: "El id debe ser un número." });
    }
    try {
        const resultado = await pool.query(`
            SELECT v.*, p.normas, p.version_normas,
                   al.hora_entrada, al.hora_salida,
                   ac.dificultad, ac.requisitos_participante, ac.equipo_incluido,
                   ac.guia_incluido, ac.tiene_seguro, ac.detalle_seguridad,
                   ARRAY(SELECT s.nombre FROM ecoturismo.publicacion_servicio ps
                         JOIN ecoturismo.servicio s ON s.id_servicio = ps.id_servicio
                         WHERE ps.id_publicacion = v.id_publicacion ORDER BY s.nombre) AS servicios,
                   ARRAY(SELECT i.ruta_webp FROM ecoturismo.imagen_publicacion i
                         WHERE i.id_publicacion = v.id_publicacion ORDER BY i.orden) AS imagenes
            FROM ecoturismo.v_publicaciones_busqueda v
            JOIN ecoturismo.publicacion p ON p.id_publicacion = v.id_publicacion
            LEFT JOIN ecoturismo.alojamiento al ON al.id_publicacion = v.id_publicacion
            LEFT JOIN ecoturismo.actividad ac ON ac.id_publicacion = v.id_publicacion
            WHERE v.id_publicacion = $1`,
            [id]
        );
        if (resultado.rows.length === 0) {
            return respuesta.status(404).json({ error: "Esa publicación no existe o no está disponible." });
        }
        respuesta.json(resultado.rows[0]);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/actividades/:id/salidas", async function (solicitud, respuesta) {
    const id = Number(solicitud.params.id);
    if (!Number.isInteger(id)) {
        return respuesta.status(400).json({ error: "El id debe ser un número." });
    }
    try {
        const resultado = await pool.query(`
            SELECT s.id_salida, s.inicio, s.fin, s.capacidad_total,
                   (s.capacidad_total - COALESCE((
                       SELECT sum(r.personas) FROM ecoturismo.reserva r
                       WHERE r.id_salida = s.id_salida
                         AND (r.estado_reserva = 'confirmada'
                              OR (r.estado_reserva = 'pendiente' AND r.expira_en > clock_timestamp()))
                   ), 0))::int AS cupos_disponibles
            FROM ecoturismo.salida_actividad s
            JOIN ecoturismo.v_publicaciones_busqueda v ON v.id_publicacion = s.id_actividad
            WHERE s.id_actividad = $1 AND s.estado_salida = 'abierta' AND s.inicio > clock_timestamp()
            ORDER BY s.inicio`,
            [id]
        );
        respuesta.json(resultado.rows);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/municipios", async function (solicitud, respuesta) {
    const resultado = await pool.query("SELECT id_municipio, nombre, departamento FROM ecoturismo.municipio ORDER BY departamento, nombre");
    respuesta.json(resultado.rows);
});

app.post("/api/publicaciones", verificarToken, async function (solicitud, respuesta) {
    if (!solicitud.usuario.roles.includes("anfitrion")) {
        return respuesta.status(403).json({ error: "Solo un anfitrión puede publicar." });
    }
    const datos = solicitud.body;
    if (datos.tipo !== "alojamiento" && datos.tipo !== "actividad") {
        return respuesta.status(400).json({ error: "El tipo debe ser alojamiento o actividad." });
    }
    const imagenes = Array.isArray(datos.imagenes) ? datos.imagenes : [];
    if (imagenes.length > 8) {
        return respuesta.status(400).json({ error: "Máximo 8 imágenes por publicación." });
    }
    const cliente = await pool.connect();
    try {
        await cliente.query("BEGIN");
        const nueva = await cliente.query(
            `INSERT INTO ecoturismo.publicacion (id_anfitrion, id_municipio, tipo, categoria, titulo, descripcion,
                 precio_base, capacidad, direccion_exacta, latitud_exacta, longitud_exacta, normas, version_normas)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'v1')
             RETURNING id_publicacion, titulo, tipo, estado_moderacion`,
            [solicitud.usuario.id_usuario, datos.id_municipio, datos.tipo, datos.categoria, datos.titulo, datos.descripcion,
             datos.precio_base, datos.capacidad, datos.direccion_exacta, datos.latitud, datos.longitud, datos.normas]
        );
        const publicacion = nueva.rows[0];
        if (datos.tipo === "alojamiento") {
            await cliente.query(
                "INSERT INTO ecoturismo.alojamiento (id_publicacion, hora_entrada, hora_salida) VALUES ($1, $2, $3)",
                [publicacion.id_publicacion, datos.hora_entrada, datos.hora_salida]
            );
        } else {
            await cliente.query(
                `INSERT INTO ecoturismo.actividad (id_publicacion, dificultad, requisitos_participante, equipo_incluido,
                     guia_incluido, tiene_seguro, detalle_seguridad)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [publicacion.id_publicacion, datos.dificultad, datos.requisitos_participante, datos.equipo_incluido,
                 datos.guia_incluido, datos.tiene_seguro, datos.detalle_seguridad]
            );
        }
        for (let i = 0; i < imagenes.length; i++) {
            await cliente.query(
                "INSERT INTO ecoturismo.imagen_publicacion (id_publicacion, ruta_webp, ruta_miniatura, orden) VALUES ($1, $2, $2, $3)",
                [publicacion.id_publicacion, imagenes[i], i + 1]
            );
        }
        await cliente.query("COMMIT");
        respuesta.status(201).json(publicacion);
    } catch (error) {
        await cliente.query("ROLLBACK");
        if (error.code === "23502") {
            respuesta.status(400).json({ error: "Falta el dato: " + error.column });
        } else {
            respuesta.status(400).json({ error: error.message });
        }
    } finally {
        cliente.release();
    }
});

app.get("/api/admin/publicaciones", verificarToken, soloAdministrador, async function (solicitud, respuesta) {
    const resultado = await pool.query(`
        SELECT p.id_publicacion, p.tipo, p.categoria, p.titulo, p.descripcion, p.precio_base, p.capacidad,
               p.direccion_exacta, p.normas, m.nombre AS municipio, m.departamento,
               u.nombre AS anfitrion, p.creada_en,
               ARRAY(SELECT i.ruta_miniatura FROM ecoturismo.imagen_publicacion i
                     WHERE i.id_publicacion = p.id_publicacion ORDER BY i.orden) AS imagenes
        FROM ecoturismo.publicacion p
        JOIN ecoturismo.municipio m ON m.id_municipio = p.id_municipio
        JOIN ecoturismo.usuario u ON u.id_usuario = p.id_anfitrion
        WHERE p.estado_moderacion = 'en_revision'
        ORDER BY p.creada_en`
    );
    respuesta.json(resultado.rows);
});

app.patch("/api/admin/publicaciones/:id", verificarToken, soloAdministrador, async function (solicitud, respuesta) {
    const datos = solicitud.body;
    if (datos.decision !== "aprobada" && datos.decision !== "rechazada") {
        return respuesta.status(400).json({ error: "La decisión debe ser aprobada o rechazada." });
    }
    if (datos.decision === "rechazada" && !datos.motivo) {
        return respuesta.status(400).json({ error: "Para rechazar hay que escribir el motivo." });
    }
    try {
        const resultado = await pool.query(
            `UPDATE ecoturismo.publicacion
             SET estado_moderacion = $2, motivo = $3, id_moderador = $4, moderada_en = now()
             WHERE id_publicacion = $1 AND estado_moderacion = 'en_revision'
             RETURNING id_publicacion, titulo, estado_moderacion, motivo`,
            [solicitud.params.id, datos.decision, datos.motivo, solicitud.usuario.id_usuario]
        );
        if (resultado.rows.length === 0) {
            return respuesta.status(404).json({ error: "No hay una publicación en revisión con ese id." });
        }
        respuesta.json(resultado.rows[0]);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/admin/publicaciones/aprobadas", verificarToken, soloAdministrador, async function (solicitud, respuesta) {
    const resultado = await pool.query(`
        SELECT p.id_publicacion, p.tipo, p.categoria, p.titulo, p.precio_base,
               m.nombre AS municipio, m.departamento, u.nombre AS anfitrion, p.moderada_en,
               (SELECT count(*)::int FROM ecoturismo.reserva r
                WHERE r.id_publicacion = p.id_publicacion
                  AND r.estado_reserva IN ('pendiente', 'confirmada')) AS reservas_activas
        FROM ecoturismo.publicacion p
        JOIN ecoturismo.municipio m ON m.id_municipio = p.id_municipio
        JOIN ecoturismo.usuario u ON u.id_usuario = p.id_anfitrion
        WHERE p.estado_moderacion = 'aprobada'
        ORDER BY p.moderada_en DESC`
    );
    respuesta.json(resultado.rows);
});

app.patch("/api/admin/publicaciones/:id/retirar", verificarToken, soloAdministrador, async function (solicitud, respuesta) {
    const motivo = typeof solicitud.body.motivo === "string" ? solicitud.body.motivo.trim() : "";
    if (!motivo) {
        return respuesta.status(400).json({ error: "Para retirar una publicación hay que escribir el motivo." });
    }
    try {
        const resultado = await pool.query(
            `UPDATE ecoturismo.publicacion
             SET estado_moderacion = 'oculta', motivo = $2, id_moderador = $3, moderada_en = now()
             WHERE id_publicacion = $1 AND estado_moderacion = 'aprobada'
             RETURNING id_publicacion, titulo, estado_moderacion, motivo`,
            [solicitud.params.id, motivo, solicitud.usuario.id_usuario]
        );
        if (resultado.rows.length === 0) {
            return respuesta.status(404).json({ error: "No hay una publicación aprobada con ese id." });
        }
        respuesta.json(resultado.rows[0]);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/admin/anfitriones", verificarToken, soloAdministrador, async function (solicitud, respuesta) {
    const resultado = await pool.query(`
        SELECT h.id_usuario, u.nombre, u.correo, h.numero_rnt, h.estado_rnt, h.estado_verificacion
        FROM ecoturismo.perfil_anfitrion h
        JOIN ecoturismo.usuario u ON u.id_usuario = h.id_usuario
        WHERE h.estado_verificacion = 'pendiente'
        ORDER BY h.id_usuario`
    );
    respuesta.json(resultado.rows);
});

app.patch("/api/admin/anfitriones/:id", verificarToken, soloAdministrador, async function (solicitud, respuesta) {
    const datos = solicitud.body;
    if (datos.decision !== "aprobado" && datos.decision !== "rechazado") {
        return respuesta.status(400).json({ error: "La decisión debe ser aprobado o rechazado." });
    }
    if (datos.decision === "rechazado" && !datos.motivo) {
        return respuesta.status(400).json({ error: "Para rechazar hay que escribir el motivo." });
    }
    try {
        const resultado = await pool.query(
            `UPDATE ecoturismo.perfil_anfitrion
             SET estado_verificacion = $2::text,
                 estado_rnt = CASE WHEN $2::text = 'aprobado' THEN 'activo' ELSE estado_rnt END,
                 observacion_verificacion = $3, id_verificador = $4, verificado_en = now()
             WHERE id_usuario = $1 AND estado_verificacion = 'pendiente'
             RETURNING id_usuario, numero_rnt, estado_rnt, estado_verificacion`,
            [solicitud.params.id, datos.decision, datos.motivo, solicitud.usuario.id_usuario]
        );
        if (resultado.rows.length === 0) {
            return respuesta.status(404).json({ error: "No hay un anfitrión pendiente con ese id." });
        }
        respuesta.json(resultado.rows[0]);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/mis-reservas", verificarToken, async function (solicitud, respuesta) {
    const resultado = await pool.query(`
        SELECT r.id_reserva,
               CASE WHEN r.estado_reserva = 'pendiente' AND r.expira_en <= clock_timestamp()
                    THEN 'expirada' ELSE r.estado_reserva END AS estado_reserva,
               p.id_publicacion, p.titulo, p.tipo, m.nombre AS municipio,
               r.fecha_entrada::text AS fecha_entrada, r.fecha_salida::text AS fecha_salida,
               s.inicio, s.fin, r.personas, r.subtotal, r.comision, r.total, r.expira_en,
               CASE WHEN r.estado_reserva IN ('confirmada', 'completada')
                    THEN p.direccion_exacta END AS direccion_exacta
        FROM ecoturismo.reserva r
        JOIN ecoturismo.publicacion p ON p.id_publicacion = r.id_publicacion
        JOIN ecoturismo.municipio m ON m.id_municipio = p.id_municipio
        LEFT JOIN ecoturismo.salida_actividad s ON s.id_salida = r.id_salida
        WHERE r.id_turista = $1
        ORDER BY r.creada_en DESC`,
        [solicitud.usuario.id_usuario]
    );
    respuesta.json(resultado.rows);
});

app.post("/api/reservas/:id/cancelar", verificarToken, async function (solicitud, respuesta) {
    try {
        const resultado = await pool.query(
            `UPDATE ecoturismo.reserva SET estado_reserva = 'cancelada'
             WHERE id_reserva = $1 AND id_turista = $2 AND estado_reserva IN ('pendiente', 'confirmada')
             RETURNING id_reserva, estado_reserva`,
            [solicitud.params.id, solicitud.usuario.id_usuario]
        );
        if (resultado.rows.length === 0) {
            return respuesta.status(404).json({ error: "No encontramos una reserva tuya que se pueda cancelar." });
        }
        respuesta.json(resultado.rows[0]);
    } catch (error) {
        respuesta.status(400).json({ error: error.message });
    }
});

app.get("/api/anfitrion/publicaciones", verificarToken, soloAnfitrion, async function (solicitud, respuesta) {
    const resultado = await pool.query(
        `SELECT id_publicacion, tipo, titulo, precio_base, estado_moderacion, motivo, pausada, creada_en
         FROM ecoturismo.publicacion
         WHERE id_anfitrion = $1
         ORDER BY creada_en DESC`,
        [solicitud.usuario.id_usuario]
    );
    respuesta.json(resultado.rows);
});

app.post("/api/anfitrion/publicaciones/:id/salidas", verificarToken, soloAnfitrion, async function (solicitud, respuesta) {
    const datos = solicitud.body;
    try {
        const resultado = await pool.query(
            `INSERT INTO ecoturismo.salida_actividad (id_actividad, inicio, fin, capacidad_total)
             SELECT id_publicacion, $2::timestamptz, $3::timestamptz, $4::int FROM ecoturismo.publicacion
             WHERE id_publicacion = $1 AND id_anfitrion = $5 AND tipo = 'actividad'
             RETURNING id_salida, inicio, fin, capacidad_total`,
            [solicitud.params.id, datos.inicio, datos.fin, datos.capacidad_total, solicitud.usuario.id_usuario]
        );
        if (resultado.rows.length === 0) {
            return respuesta.status(404).json({ error: "No encontramos esa actividad entre las tuyas." });
        }
        respuesta.status(201).json(resultado.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            respuesta.status(409).json({ error: "Ya tienes una salida a esa hora." });
        } else if (error.constraint === "salida_actividad_check") {
            respuesta.status(400).json({ error: "El fin de la salida debe ser después del inicio." });
        } else {
            respuesta.status(400).json({ error: error.message });
        }
    }
});

app.post("/api/reservas/:id/resena", verificarToken, async function (solicitud, respuesta) {
    const datos = solicitud.body;
    const calificacion = Number(datos.calificacion);
    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
        return respuesta.status(400).json({ error: "La calificación debe ser un número entero de 1 a 5." });
    }
    const propia = await pool.query(
        "SELECT id_reserva FROM ecoturismo.reserva WHERE id_reserva = $1 AND id_turista = $2",
        [solicitud.params.id, solicitud.usuario.id_usuario]
    );
    if (propia.rows.length === 0) {
        return respuesta.status(404).json({ error: "No encontramos esa reserva entre las tuyas." });
    }
    const cliente = await pool.connect();
    try {
        await cliente.query("BEGIN");
        await cliente.query(
            "UPDATE ecoturismo.reserva SET estado_reserva = 'completada' WHERE id_reserva = $1 AND estado_reserva = 'confirmada'",
            [solicitud.params.id]
        );
        const nueva = await cliente.query(
            "INSERT INTO ecoturismo.resena (id_reserva, calificacion, comentario) VALUES ($1, $2, $3) RETURNING id_resena, calificacion, comentario, creada_en",
            [solicitud.params.id, calificacion, datos.comentario]
        );
        await cliente.query("COMMIT");
        respuesta.status(201).json(nueva.rows[0]);
    } catch (error) {
        await cliente.query("ROLLBACK");
        if (error.code === "23505") {
            respuesta.status(409).json({ error: "Ya reseñaste esta reserva." });
        } else if (error.code === "23502") {
            respuesta.status(400).json({ error: "Falta el dato: " + error.column });
        } else {
            respuesta.status(400).json({ error: error.message });
        }
    } finally {
        cliente.release();
    }
});

app.get("/api/publicaciones/:id/resenas", async function (solicitud, respuesta) {
    const resultado = await pool.query(
        `SELECT e.id_resena, e.calificacion, e.comentario, e.creada_en, split_part(u.nombre, ' ', 1) AS turista
         FROM ecoturismo.resena e
         JOIN ecoturismo.reserva r ON r.id_reserva = e.id_reserva
         JOIN ecoturismo.usuario u ON u.id_usuario = r.id_turista
         WHERE r.id_publicacion = $1 AND e.estado_visibilidad = 'publica'
         ORDER BY e.creada_en DESC`,
        [solicitud.params.id]
    );
    respuesta.json(resultado.rows);
});

app.get("/api/perfil", verificarToken, async function (solicitud, respuesta) {
    const resultado = await pool.query(
        `SELECT u.id_usuario, u.nombre, u.correo, u.telefono_privado AS telefono, u.estado_cuenta,
                ARRAY(SELECT r.nombre FROM ecoturismo.usuario_rol ur
                      JOIN ecoturismo.rol r ON r.id_rol = ur.id_rol
                      WHERE ur.id_usuario = u.id_usuario) AS roles,
                h.numero_rnt, h.estado_verificacion, h.observacion_verificacion
         FROM ecoturismo.usuario u
         LEFT JOIN ecoturismo.perfil_anfitrion h ON h.id_usuario = u.id_usuario
         WHERE u.id_usuario = $1`,
        [solicitud.usuario.id_usuario]
    );
    if (resultado.rows.length === 0) {
        return respuesta.status(404).json({ error: "No encontramos tu cuenta." });
    }
    respuesta.json(resultado.rows[0]);
});

app.use(function (solicitud, respuesta) {
    respuesta.status(404).json({ error: "Esa ruta no existe." });
});

app.use(function (error, solicitud, respuesta, siguiente) {
    if (error.type === "entity.parse.failed") {
        return respuesta.status(400).json({ error: "El JSON de la solicitud está mal escrito." });
    }
    if (error.code === "ECONNREFUSED" || String(error.message).includes("timeout")) {
        return respuesta.status(503).json({ error: "La base de datos no responde. Intenta en unos minutos." });
    }
    if (error.code === "22P02") {
        return respuesta.status(400).json({ error: "Algún dato tiene un formato inválido." });
    }
    console.error(error);
    respuesta.status(500).json({ error: "Ocurrió un error en el servidor." });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, function () {
    console.log("Servidor en el puerto " + PUERTO);
});
