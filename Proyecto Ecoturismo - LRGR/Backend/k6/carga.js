import http from "k6/http";
import { check, sleep } from "k6";

const API = "http://127.0.0.1:3000";
const USUARIOS = Number(__ENV.USUARIOS || 30);

export const options = {
  vus: USUARIOS,        // usuarios simultáneos
  duration: "30s",      // cuánto dura la prueba
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95 % responde en menos de 3 s
    http_req_failed: ["rate<0.01"],    // menos de 1 % de errores
  },
};

// Se ejecuta una vez al inicio: busca un id real de publicación
export function setup() {
  const res = http.get(`${API}/api/alojamientos`);
  return { id: res.json()[0].id_publicacion };
}

// Lo que hace cada usuario virtual, una y otra vez
export default function (datos) {
  const busqueda = http.get(`${API}/api/alojamientos?personas=2`);
  check(busqueda, { "búsqueda responde 200": (r) => r.status === 200 });

  const detalle = http.get(`${API}/api/publicaciones/${datos.id}`);
  check(detalle, { "detalle responde 200": (r) => r.status === 200 });

  sleep(1); // pausa de 1 segundo, como una persona real
}