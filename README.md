# Proyecto-Ecoturismo-Ing-Software
Proyecto de Ecoturismo de Ingeniería de Software.

## Contenido

- `Proyecto Ecoturismo - LRGR/Diagramas`: modelo entidad-relación y arquitectura.
- `Proyecto Ecoturismo - LRGR/Base de datos`: estructura de la base en PostgreSQL (versión 2) y datos de prueba.
- `Proyecto Ecoturismo - LRGR/Backend`: API en Node.js con Express. La lista completa de rutas está en `RUTAS_API.md`.

## Cómo correr el backend

Se necesita Node.js 20.6 o superior y PostgreSQL 16.

1. En pgAdmin, crea una base de datos llamada `ecoturismo`.
2. Abre el Query Tool de esa base y ejecuta, en este orden:
   1. `Base de datos/Database Ecoturimo - LRGR.sql`
   2. `Base de datos/Datos_de_prueba_EcoTurismo_corregido.sql`
3. En la carpeta `Backend`, haz una copia de `.env.example`, llámala `.env` y llena dos datos:
   - `PGPASSWORD`: la contraseña de tu usuario `postgres`.
   - `JWT_SECRET`: una clave secreta propia. Se genera con este comando:

     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

   El `.env` nunca se sube al repositorio.
4. En una terminal dentro de la carpeta `Backend`:

   ```
   npm install
   npm start
   ```

   Si PowerShell bloquea `npm`, usa `npm.cmd install` y `npm.cmd start`.
5. Abre http://127.0.0.1:3000/api/salud. Debe responder que el backend y la base de datos están funcionando.

El backend acepta peticiones del frontend en `http://localhost:5173`, que es el puerto de Vite.

## Pruebas

- `Backend/pruebas.http` tiene las pruebas manuales de cada ruta. Se ejecutan con la extensión REST Client de VS Code.
- Los usuarios de los datos de prueba tienen la contraseña `Prueba123*`. Están listados en `RUTAS_API.md`.
