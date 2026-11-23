const request = require("supertest");

const API = "http://127.0.0.1:3000";
const CLAVE = "Prueba123*";

async function iniciarSesion(correo) {
  const res = await request(API).post("/api/login").send({ correo, contrasena: CLAVE });
  return res.body.token;
}

// Genera fechas futuras al azar (2 noches) para no chocar con otras pruebas
function fechasAlAzar() {
  const dias = Math.floor(Math.random() * 3000);
  const entrada = new Date(Date.UTC(2028, 0, 1) + dias * 86400000);
  const salida = new Date(entrada.getTime() + 2 * 86400000);
  const f = (d) => d.toISOString().slice(0, 10);
  return { fecha_entrada: f(entrada), fecha_salida: f(salida) };
}

describe("CP-04 Búsqueda y filtros (RF-05)", () => {
  test("lista alojamientos aprobados", async () => {
    const res = await request(API).get("/api/alojamientos");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("el filtro de precio máximo solo devuelve resultados dentro del precio", async () => {
    const res = await request(API).get("/api/alojamientos?precio_max=300000");
    expect(res.status).toBe(200);
    res.body.forEach((a) => {
      expect(Number(a.precio_base)).toBeLessThanOrEqual(300000);
    });
  });

  test("el filtro de personas solo devuelve lugares con esa capacidad", async () => {
    const res = await request(API).get("/api/alojamientos?personas=4");
    expect(res.status).toBe(200);
    res.body.forEach((a) => {
      expect(Number(a.capacidad)).toBeGreaterThanOrEqual(4);
    });
  });
});

describe("Reservas (CP-06 y CP-07)", () => {
  let idPublicacion, versionNormas, tokenAna, tokenAndres;

  beforeAll(async () => {
    // Tomamos el primer alojamiento disponible y sus normas
    const lista = await request(API).get("/api/alojamientos");
    idPublicacion = Number(lista.body[0].id_publicacion);
    const detalle = await request(API).get(`/api/publicaciones/${idPublicacion}`);
    versionNormas = detalle.body.version_normas;
    tokenAna = await iniciarSesion("ana@ecoturismo.test");
    tokenAndres = await iniciarSesion("andres@ecoturismo.test");
  });

  function reservar(token, fechas) {
    return request(API)
      .post("/api/reservas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_publicacion: idPublicacion,
        ...fechas,
        personas: 1,
        emergencia_nombre: "Pedro Martinez",
        emergencia_telefono: "3109876543",
        version_normas: versionNormas,
      });
  }

  test("CP-06: reserva disponible se acepta y la misma fecha ocupada se rechaza", async () => {
    const fechas = fechasAlAzar();
    const primera = await reservar(tokenAna, fechas);
    expect(primera.status).toBe(201);
    expect(primera.body.estado_reserva).toBe("pendiente");

    const segunda = await reservar(tokenAndres, fechas);
    expect(segunda.status).toBe(409);
  });

  test("CP-07: 10 solicitudes simultáneas, solo una se confirma", async () => {
    const fechas = fechasAlAzar();
    const tokens = [tokenAna, tokenAndres];
    const peticiones = Array.from({ length: 10 }, (_, i) =>
      reservar(tokens[i % 2], fechas)
    );
    const respuestas = await Promise.all(peticiones);

    const aceptadas = respuestas.filter((r) => r.status === 201);
    const rechazadas = respuestas.filter((r) => r.status !== 201);

    expect(aceptadas.length).toBe(1);
    expect(rechazadas.length).toBe(9);
  });
});