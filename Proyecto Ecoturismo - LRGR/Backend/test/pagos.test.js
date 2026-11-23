const request = require("supertest");

const API = "http://127.0.0.1:3000";
const CLAVE = "Prueba123*";

async function iniciarSesion(correo) {
  const res = await request(API).post("/api/login").send({ correo, contrasena: CLAVE });
  return res.body.token;
}

function fechasAlAzar() {
  const dias = Math.floor(Math.random() * 3000);
  const entrada = new Date(Date.UTC(2028, 0, 1) + dias * 86400000);
  const salida = new Date(entrada.getTime() + 2 * 86400000);
  const f = (d) => d.toISOString().slice(0, 10);
  return { fecha_entrada: f(entrada), fecha_salida: f(salida) };
}

describe("CP-08 y CP-09: pagos y reseñas", () => {
  let idPublicacion, versionNormas, token;

  beforeAll(async () => {
    const lista = await request(API).get("/api/alojamientos");
    idPublicacion = Number(lista.body[0].id_publicacion);
    const detalle = await request(API).get(`/api/publicaciones/${idPublicacion}`);
    versionNormas = detalle.body.version_normas;
    token = await iniciarSesion("ana@ecoturismo.test");
  });

  // Crea una reserva pendiente y devuelve su id
  async function crearReserva() {
    const res = await request(API)
      .post("/api/reservas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_publicacion: idPublicacion,
        ...fechasAlAzar(),
        personas: 1,
        emergencia_nombre: "Pedro Martinez",
        emergencia_telefono: "3109876543",
        version_normas: versionNormas,
      });
    return Number(res.body.id_reserva);
  }

  function pagar(idReserva, clave, resultado) {
    return request(API)
      .post("/api/pagos")
      .set("Authorization", `Bearer ${token}`)
      .send({ id_reserva: idReserva, clave_idempotencia: clave, medio: "nequi", resultado });
  }

  test("CP-08: un pago rechazado NO confirma la reserva", async () => {
    const idReserva = await crearReserva();
    const res = await pagar(idReserva, `rechazo-${Date.now()}`, "rechazado");
    expect(res.body.estado_reserva).not.toBe("confirmada");
  });

  test("CP-08: un pago aprobado confirma la reserva", async () => {
    const idReserva = await crearReserva();
    const res = await pagar(idReserva, `ok-${Date.now()}`, "aprobado");
    expect(res.status).toBe(201);
    expect(res.body.estado_reserva).toBe("confirmada");
  });

  test("CP-08: repetir la misma clave de idempotencia no cobra dos veces", async () => {
    const idReserva = await crearReserva();
    const clave = `doble-${Date.now()}`;
    const primero = await pagar(idReserva, clave, "aprobado");
    const segundo = await pagar(idReserva, clave, "aprobado");
    expect(segundo.body.id_pago).toBe(primero.body.id_pago);
  });

  test("CP-09: no se puede reseñar una experiencia que aún no termina", async () => {
    const idReserva = await crearReserva();
    await pagar(idReserva, `resena-${Date.now()}`, "aprobado");
    const res = await request(API)
      .post(`/api/reservas/${idReserva}/resena`)
      .set("Authorization", `Bearer ${token}`)
      .send({ calificacion: 5, comentario: "Muy bonito" });
    expect(res.status).toBe(400);
  });

  test("CP-09: una calificación inválida (7) es rechazada", async () => {
    const idReserva = await crearReserva();
    const res = await request(API)
      .post(`/api/reservas/${idReserva}/resena`)
      .set("Authorization", `Bearer ${token}`)
      .send({ calificacion: 7, comentario: "Fuera de rango" });
    expect(res.status).toBe(400);
  });
});