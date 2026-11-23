const request = require("supertest");

const API = "http://127.0.0.1:3000";
const CLAVE = "Prueba123*";

// Inicia sesión y devuelve el token (la "llave" de la sesión)
async function iniciarSesion(correo) {
  const res = await request(API)
    .post("/api/login")
    .send({ correo, contrasena: CLAVE });
  return res.body.token;
}

describe("CP-01 Registro de usuarios (RF-01)", () => {
  // Correo único en cada ejecución, para no chocar con pruebas anteriores
  const correo = `prueba${Date.now()}@ecoturismo.test`;
  const datos = {
    nombre: "Camila Torres",
    correo,
    contrasena: "Segura2026",
    telefono: "3001234567",
    rol: "turista",
    acepta_datos: true,
  };

  test("registra un usuario con datos válidos", async () => {
    const res = await request(API).post("/api/registro").send(datos);
    expect(res.status).toBe(201);
    expect(res.body.correo).toBe(correo);
  });

  test("rechaza registrar el mismo correo dos veces", async () => {
    const res = await request(API).post("/api/registro").send(datos);
    expect(res.status).toBe(409);
  });

  test("rechaza el registro si no acepta el tratamiento de datos", async () => {
    const res = await request(API)
      .post("/api/registro")
      .send({ ...datos, correo: `otro${Date.now()}@ecoturismo.test`, acepta_datos: false });
    expect(res.status).toBe(400);
  });
});

describe("CP-02 Inicio de sesión y roles (RF-01 y RNF-01)", () => {
  test("login válido devuelve token y rol", async () => {
    const res = await request(API)
      .post("/api/login")
      .send({ correo: "ana@ecoturismo.test", contrasena: CLAVE });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.roles).toContain("turista");
  });

  test("login con contraseña incorrecta es rechazado", async () => {
    const res = await request(API)
      .post("/api/login")
      .send({ correo: "ana@ecoturismo.test", contrasena: "incorrecta" });
    expect(res.status).toBe(401);
  });

  test("una ruta protegida sin token responde 401", async () => {
    const res = await request(API).get("/api/mis-reservas");
    expect(res.status).toBe(401);
  });

  test("un turista NO puede entrar a rutas de administrador (403)", async () => {
    const token = await iniciarSesion("ana@ecoturismo.test");
    const res = await request(API)
      .get("/api/admin/publicaciones")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("el administrador SÍ puede entrar a rutas de administrador", async () => {
    const token = await iniciarSesion("admin@ecoturismo.test");
    const res = await request(API)
      .get("/api/admin/publicaciones")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});