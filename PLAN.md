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
- [x] Primera migración y tabla de series (fecha, ejercicio como texto, peso, repeticiones).
- [x] Endpoints para crear y listar series, con validación (peso vacío o ≤ 0, reps < 1 → 400).
- [x] Formulario y lista en la web, con aviso de error.

**Pruebas:**
- Unitarias de validación; API contra Postgres de pruebas; e2e: press banca 80 × 8 aparece.

**Hecho cuando:** registras press banca 80 × 8, reinicias los contenedores y sigue ahí; con peso vacío sale el aviso.

## Fase 2 · Cuentas

**Objetivo:** cada persona ve solo sus datos.

**Tareas:**
- [x] Registro, login y logout; contraseña con hash; sesión en cookie httpOnly; `SESSION_SECRET` en `.env`.
- [x] App privada: registrarse exige el código `INVITE_CODE` de `.env`; si está vacío, el registro queda cerrado.
- [x] Las series pertenecen a un usuario; sin sesión la API responde 401.
- [x] Pantallas de registro e inicio de sesión.
- [x] Los e2e usan su propia base de datos, no la de desarrollo (proyecto Docker `gymlog-e2e`, puertos 5174/8001).

**Pruebas:**
- API: 401 sin sesión, aislamiento entre dos usuarios; e2e: registro, login y logout.

**Hecho cuando:** dos cuentas no ven las series de la otra.

## Fase 3 · Catálogo de ejercicios

**Objetivo:** elegir ejercicios del catálogo o crear los propios.

**Tareas:**
- [x] Tabla de ejercicios (base compartida o propios de un usuario), sin duplicados por usuario.
  - Duplicado = mismo nombre ignorando mayúsculas, tildes y espacios sobrantes («Press banca» = «press  bánca »). También cuenta como duplicado si coincide con uno del catálogo base.
  - Al crear uno que ya existe, la app avisa y ofrece usar el existente en vez de crearlo.
- [x] Script de importación única desde wger (comprobar antes que la API sigue activa y su licencia).
  - Comprobado (2026-11-09): API activa, sin autenticación; 966 ejercicios, 644 con nombre en español. Licencia por ejercicio, casi siempre CC-BY-SA: guardar licencia y autor y mostrar la atribución a wger.de.
  - Nombre en español y, si no lo tiene, en inglés. Solo nombres (sin descripciones).
- [x] Las series pasan de ejercicio en texto a `ejercicio_id`; las existentes se conservan convertidas en ejercicios propios.
- [x] El registro elige de la lista, con búsqueda y opción de crear uno propio.

**Pruebas:**
- Unitarias de duplicados; API de ejercicios; importación probada con datos simulados; e2e: crear y usar un ejercicio propio.

**Hecho cuando:** buscas un ejercicio importado y creas uno propio, y ambos se usan al registrar.

## Fase 3b · Imágenes de ejercicios

**Objetivo:** ver una imagen explicativa de cada ejercicio que la tenga.

**Tareas:**
- [x] Importar las imágenes de wger: descargarlas una vez y guardarlas en local (en PostgreSQL), con licencia y autor; la app no depende de wger después. Resultado: 279 ejercicios con imagen de ejemplo (16 MB).
- [x] Subir una imagen propia a un ejercicio propio o a uno del catálogo que no tenga imagen de ejemplo (JPEG/PNG/WebP, máx. 2 MB; la web la reduce a 1200 px). Sin dependencias nuevas.
  - Las imágenes de wger son de ejemplo y las ven todos; la subida es privada (solo la ve quien la sube). La imagen es opcional.
- [x] Mostrar la imagen al elegir el ejercicio, con la atribución cuando venga de wger. (Mostrarla en el historial pasa a la Fase 4.)

**Pruebas:**
- Importación de imágenes con datos simulados; API de subida (tipo y tamaño inválidos → 400, imagen de otro usuario no visible); e2e: subir una imagen y verla.

**Hecho cuando:** un ejercicio importado muestra su imagen de wger y uno propio muestra la que has subido, también tras reiniciar los contenedores.

## Fase 4 · Historial por ejercicio

**Objetivo:** ver todas las series de un ejercicio.

**Tareas:**
- [x] Endpoint y pantalla con las series de un ejercicio, cada una por separado.
- [x] Mostrar en esa pantalla la imagen del ejercicio (de la Fase 3b), con su atribución si es de wger.

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
- [ ] Antes de publicar: limitar intentos de login y de código de invitación, HTTPS con `COOKIE_SECURE=true` y vaciar `INVITE_CODE` cuando existan las dos cuentas.

**Hecho cuando:** hay permiso explícito y la app funciona en ambos móviles.

## Mejoras futuras (fuera de este plan)

Exportar copia de seguridad, gráficas y récords, modo sin conexión.

