# Información del proyecto

## Qué es
Una app web para registrar los ejercicios del gimnasio y los pesos de cada serie. Permite elegir ejercicios de un catálogo o crear nuevos, guardar cada serie para seguir el progreso y agrupar ejercicios en rutinas con nombre. Los datos viven en una base de datos PostgreSQL detrás de una API propia, todo en contenedores Docker.

## Para quién
Dos personas (yo y mi novia). Cada una tiene su cuenta y su propio historial, y puede entrar desde cualquier móvil. Se usa sobre todo en el móvil, durante el entrenamiento.

## Funciones
- Crear cuenta e iniciar y cerrar sesión (usuario y contraseña). Cada cuenta solo ve sus datos.
- App privada: para crear cuenta hace falta un código de invitación (`INVITE_CODE`); sin código, el registro está cerrado.
- Elegir un ejercicio del catálogo o crear uno propio.
- Registrar series: fecha, ejercicio, peso (kg) y repeticiones. Cada serie es un registro propio.
- Ver el historial completo de series de un ejercicio, ordenado por fecha.
- Crear rutinas con nombre y añadirles ejercicios; renombrarlas y quitar ejercicios.
- Editar y borrar series, ejercicios propios y rutinas.
- Catálogo base importado una vez desde la API pública de wger.

## Fuera de alcance
- Recuperar contraseña por email, inicio de sesión con terceros (Google, etc.).
- Funcionamiento sin conexión y sincronización offline (no hay PWA offline por ahora).
- Gráficas, récords personales y estadísticas (posible fase futura).
- Planes de entrenamiento automáticos, nutrición, compartir con otros y conexión con relojes o apps.
- Unidades distintas de kg.
- Despliegue en un servidor real: por ahora solo desarrollo local.

## Tecnología
- **Frontend:** React + TypeScript (Vite), diseñado primero para móvil.
- **Backend:** Python + FastAPI con una API REST. Contraseñas con hash y sesión en cookie httpOnly.
- **Base de datos:** PostgreSQL con migraciones versionadas.
- **Contenedores:** `docker compose` levanta base de datos, API y web.
- **Catálogo:** script de importación única desde wger; después la app no depende de ese servicio.
- **Pruebas:** pytest para la API (contra un Postgres de pruebas en Docker), Vitest para la web y Playwright en `e2e/`.
- **Cómo se arrancará:** `docker compose up` y se abre la web en `http://localhost:5173`. Para probar en el móvil, se abre la IP del PC en la red local.
- **Cómo se probará:** `npm test`, `npm run lint` y `npm run test:e2e`. Los tres deben pasar antes de dar nada por terminado.
- **Producción:** alojar el servidor para los dos móviles es una acción de producción; no se hará sin permiso explícito.

## Datos y claves
- Usuario: nombre de usuario y hash de contraseña.
- Ejercicio: nombre; del catálogo base (compartido) o propio de un usuario.
- Serie: usuario, fecha, ejercicio, peso en kg y repeticiones.
- Rutina: usuario, nombre y lista ordenada de ejercicios.
- Claves en `.env` (nunca en git), con nombres en `.env.example`: `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `SESSION_SECRET`, `INVITE_CODE`, `COOKIE_SECURE`.
- En desarrollo se usan valores inventados; las claves de producción no se tocan sin permiso.

## Cómo se prueba
- Registrar press banca, 80 kg × 8 repeticiones: aparece en su historial con la fecha de hoy.
- Registrar una segunda serie de 85 kg × 6: el historial muestra las dos series por separado.
- Crear la rutina «Pecho» con press banca y aperturas: se guarda con ese nombre y lista ambos ejercicios.
- Reiniciar los contenedores: las series y rutinas siguen ahí.
- Una cuenta no ve las series de la otra; sin sesión, la API responde 401.
- Con peso vacío o negativo, o repeticiones en 0, la API responde 400 y la app avisa.
