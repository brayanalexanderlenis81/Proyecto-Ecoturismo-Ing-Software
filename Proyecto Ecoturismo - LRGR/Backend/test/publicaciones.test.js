const request = require("supertest");

const API = "http://127.0.0.1:3000";
const CLAVE = "Prueba123*";

async function iniciarSesion(correo) {
  const res = await request(API).post("/api/login").send({ correo, contrasena: CLAVE });
  return res.body.token;
}

describe("CP-03 Publicación de experiencias (RF-03)", () => {
  let tokenLaura, tokenAna, idMunicipio, publicacionValida;

  beforeAll(async () => {
    tokenLaura = await iniciarSesion("laura@ecoturismo.test");
    tokenAna = await iniciarSesion("ana@ecoturismo.test");
    const municipios = await request(API).get("/api/municipios");
    idMunicipio = Number(municipios.body[0].id_municipio);

    publicacionValida = {
      tipo: "alojamiento",
      id_municipio: idMunicipio,
      categoria: "Cabaña",
      titulo: "Cabaña de prueba automatizada",
      descripcion: "Cabaña de madera para cuatro personas, creada por una prueba.",
      precio_base: 220000,
      capacidad: 4,
      direccion_exacta: "Vereda de prueba, kilómetro 4",
      latitud: 5.6412,
      longitud: -73.5401,
      normas: "No se permiten mascotas. Silencio después de las 10 p. m.",
      hora_entrada: "15:00",
      hora_salida: "11:00",
    };
  });

  test("un anfitrión publica con todos los campos y queda en revisión", async () => {
    const res = await request(API)
      .post("/api/publicaciones")
      .set("Authorization", `Bearer ${tokenLaura}`)
      .send(publicacionValida);
    expect(res.status).toBe(201);
    expect(res.body.estado_moderacion).toBe("en_revision");
  });

  test("falta un campo obligatorio: la API responde con error de validación", async () => {
    const { titulo, ...sinTitulo } = publicacionValida;
    const res = await request(API)
      .post("/api/publicaciones")
      .set("Authorization", `Bearer ${tokenLaura}`)
      .send(sinTitulo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("un turista NO puede publicar (403)", async () => {
    const res = await request(API)
      .post("/api/publicaciones")
      .set("Authorization", `Bearer ${tokenAna}`)
      .send(publicacionValida);
    expect(res.status).toBe(403);
  });

  test("una publicación en revisión no aparece en las búsquedas públicas", async () => {
    const res = await request(API).get("/api/alojamientos?q=prueba automatizada");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe("RNF-04 Protección de datos personales", () => {
  test("los listados públicos no muestran correos ni teléfonos", async () => {
    const res = await request(API).get("/api/alojamientos");
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/@ecoturismo\.test/);
    expect(texto).not.toMatch(/telefono/);
  });
});