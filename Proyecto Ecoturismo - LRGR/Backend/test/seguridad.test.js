const request = require("supertest");

const API = "http://127.0.0.1:3000";
const CLAVE = "Prueba123*";
const SQLI = "' OR '1'='1";
const XSS = "<script>alert('xss')</script>";

describe("RNF-10 Inyección SQL", () => {
  test("login con ' OR '1'='1 no permite entrar", async () => {
    const res = await request(API)
      .post("/api/login")
      .send({ correo: SQLI, contrasena: SQLI });
    expect(res.status).not.toBe(200);
    expect(res.body.token).toBeUndefined();
  });

  test("login con comentario SQL en el correo no entra", async () => {
    const res = await request(API)
      .post("/api/login")
      .send({ correo: "admin@ecoturismo.test' --", contrasena: "cualquiera" });
    expect(res.status).not.toBe(200);
    expect(res.body.token).toBeUndefined();
  });

  test("el buscador resiste un DROP TABLE y la tabla de usuarios sigue existiendo", async () => {
    const res = await request(API)
      .get("/api/alojamientos")
      .query({ q: "'; DROP TABLE ecoturismo.usuario; --" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Si la tabla se hubiera borrado, este login fallaría
    const login = await request(API)
      .post("/api/login")
      .send({ correo: "ana@ecoturismo.test", contrasena: CLAVE });
    expect(login.status).toBe(200);
  });

  test("un id con inyección en la URL es rechazado con 400", async () => {
    const res = await request(API).get(
      "/api/publicaciones/" + encodeURIComponent("1 OR 1=1")
    );
    expect(res.status).toBe(400);
  });
});

describe("RNF-10 XSS (cross-site scripting)", () => {
  test("el registro rechaza un nombre con etiquetas <script>", async () => {
    const res = await request(API)
      .post("/api/registro")
      .send({
        nombre: XSS,
        correo: `xss${Date.now()}@ecoturismo.test`,
        contrasena: "Segura2026",
        telefono: "3001234567",
        rol: "turista",
        acepta_datos: true,
      });
    expect(res.status).toBe(400);
  });

  test("las respuestas de la API son JSON y llevan la cabecera nosniff", async () => {
    const res = await request(API).get("/api/alojamientos");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});