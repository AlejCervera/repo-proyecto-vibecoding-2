# Plan

El agente trabaja una fase cada vez y marca las casillas al cerrarla.

Estructura: `web/` (React), `api/` (Python + FastAPI + Postgres), `docker-compose.yml` en la raíz. En cada parte, lógica de negocio separada de la interfaz y del acceso a datos. Pruebas junto al código; e2e en `e2e/`. Máximo 500 líneas por archivo.

## Fase 0 · Esqueleto con Docker

**Objetivo:** `docker compose up` levanta base de datos, API y web.

**Tareas:**
- [x] `docker-compose.yml` con Postgres, API y web; variables en `.env` (nombres en `.env.example`).
- [x] API con `/health` que comprueba la conexión a la base de datos.
- [x] Web con una pantalla que muestra el nombre de la app.
- [x] Vitest, ESLint y Playwright configurados (avisando de cada dependencia antes de instalarla).

**Pruebas:**
- Test de `/health` contra Postgres de pruebas; e2e: la web se abre y muestra su nombre.

**Hecho cuando:** `docker compose up` funciona, se ve el nombre en `http://localhost:5173` y `npm test`, `npm run lint` y `npm run test:e2e` pasan.

## Fase 1 · Registrar una serie (sin cuentas)

**Objetivo:** guardar series en Postgres y verlas en una lista.

**Tareas:**
- [ ] Primera migración y tabla de series (fecha, ejercicio como texto, peso, repeticiones).
- [ ] Endpoints para crear y listar series, con validación (peso vacío o ≤ 0, reps < 1 → 400).
- [ ] Formulario y lista en la web, con aviso de error.

**Pruebas:**
- Unitarias de validación; API contra Postgres de pruebas; e2e: press banca 80 × 8 aparece.

**Hecho cuando:** registras press banca 80 × 8, reinicias los contenedores y sigue ahí; con peso vacío sale el aviso.

## Fase 2 · Cuentas

**Objetivo:** cada persona ve solo sus datos.

**Tareas:**
- [ ] Registro, login y logout; contraseña con hash; sesión en cookie httpOnly; `SESSION_SECRET` en `.env`.
- [ ] Las series pertenecen a un usuario; sin sesión la API responde 401.
- [ ] Pantallas de registro e inicio de sesión.

**Pruebas:**
- API: 401 sin sesión, aislamiento entre dos usuarios; e2e: registro, login y logout.

**Hecho cuando:** dos cuentas no ven las series de la otra.

## Fase 3 · Catálogo de ejercicios

**Objetivo:** elegir ejercicios del catálogo o crear los propios.

**Tareas:**
- [ ] Tabla de ejercicios (base compartida o propios de un usuario), sin duplicados por usuario.
- [ ] Script de importación única desde wger (comprobar antes que la API sigue activa y su licencia).
- [ ] El registro elige de la lista, con búsqueda y opción de crear uno propio.

**Pruebas:**
- Unitarias de duplicados; API de ejercicios; importación probada con datos simulados; e2e: crear y usar un ejercicio propio.

**Hecho cuando:** buscas un ejercicio importado y creas uno propio, y ambos se usan al registrar.

## Fase 4 · Historial por ejercicio

**Objetivo:** ver todas las series de un ejercicio.

**Tareas:**
- [ ] Endpoint y pantalla con las series de un ejercicio, cada una por separado.

**Pruebas:**
- API de filtrado y orden; e2e: 80×8 y 85×6 salen como dos filas.

**Hecho cuando:** la más reciente sale primero y otro ejercicio no mezcla series.

## Fase 5 · Editar y borrar

**Objetivo:** corregir y eliminar datos.

**Tareas:**
- [ ] Editar y borrar series y ejercicios propios, con confirmación.
- [ ] Al borrar un ejercicio con series, pedir confirmar qué pasa con ellas.

**Pruebas:**
- API de editar y borrar (incluido no tocar datos de otro usuario); e2e: corregir un peso y borrar una serie.

**Hecho cuando:** el cambio se ve y persiste tras reiniciar los contenedores.

## Fase 6 · Rutinas

**Objetivo:** agrupar ejercicios en rutinas con nombre.

**Tareas:**
- [ ] Tablas y endpoints de rutinas: crear, renombrar, añadir y quitar ejercicios, borrar.
- [ ] Pantallas de rutinas.

**Pruebas:**
- API de rutinas; e2e: «Pecho» con press banca y aperturas, renombrar y recargar.

**Hecho cuando:** la rutina sigue igual tras reiniciar los contenedores.

## Fase 7 · Entrenar con una rutina

**Objetivo:** registrar series directamente desde una rutina.

**Tareas:**
- [ ] Abrir una rutina y registrar series de sus ejercicios.

**Pruebas:**
- e2e: desde «Pecho» registrar press banca y verlo en su historial.

**Hecho cuando:** la serie registrada desde la rutina aparece en el historial del ejercicio.

## Fase 8 · Uso en móvil

**Objetivo:** cómoda en el móvil.

**Tareas:**
- [ ] Diseño adaptado a móvil (botones grandes, probado a 390 px).
- [ ] Acceso desde el móvil por la red local.

**Pruebas:**
- Playwright con viewport móvil.

**Hecho cuando:** desde tu móvil, por la IP del PC, puedes registrar una serie sin problemas.

## Fase 9 · Despliegue (solo con permiso explícito)

**Objetivo:** que los dos móviles usen la app sin depender de tu PC.

**Tareas:**
- [ ] Explicar dónde y cómo alojarlo, qué claves de producción harían falta y esperar un «adelante» específico antes de tocar nada.

**Hecho cuando:** hay permiso explícito y la app funciona en ambos móviles.

## Mejoras futuras (fuera de este plan)

Exportar copia de seguridad, gráficas y récords, modo sin conexión.
