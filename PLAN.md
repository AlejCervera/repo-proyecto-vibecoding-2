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
- [x] Editar y borrar series y ejercicios propios, con confirmación.
- [x] Al borrar un ejercicio con series, pedir confirmar qué pasa con ellas: borrarlas también o pasarlas a otro ejercicio (sirve para juntar duplicados).

**Pruebas:**
- API de editar y borrar (incluido no tocar datos de otro usuario); e2e: corregir un peso y borrar una serie.

**Hecho cuando:** el cambio se ve y persiste tras reiniciar los contenedores.

## Fase 6 · Rutinas

**Objetivo:** agrupar ejercicios en rutinas con nombre.

**Tareas:**
- [x] Tablas y endpoints de rutinas: crear, renombrar, añadir y quitar ejercicios, borrar.
- [x] Pantallas de rutinas, con reordenar ejercicios (↑/↓).
- [x] Rutinas predefinidas: plantillas compartidas que vienen con la app (p. ej. «Pecho», «Espalda» y otras clásicas que proponga el agente), con ejercicios del catálogo (Pecho, Espalda, Pierna, Hombro, Brazos y Cuerpo completo, definidas en api/app/rutinas/predefinidas.py). No se modifican: «Copiar a mis rutinas» crea una propia editable. Cada usuario puede crear además las suyas con los ejercicios que quiera.

**Pruebas:**
- API de rutinas; plantillas visibles para todos y no editables; copiar una plantilla; e2e: «Pecho» con press banca y aperturas, renombrar y recargar.

**Hecho cuando:** la rutina sigue igual tras reiniciar los contenedores, y copiar «Pecho» predefinida da una rutina propia editable.

## Fase 7 · Entrenar con una rutina

**Objetivo:** registrar series directamente desde una rutina.

**Tareas:**
- [x] Abrir una rutina (propia o predefinida) y registrar series de sus ejercicios, uno a uno, con «la última vez» como referencia del progreso y el formulario relleno con la última serie.

**Pruebas:**
- e2e: desde «Pecho» registrar press banca y verlo en su historial.

**Hecho cuando:** la serie registrada desde la rutina aparece en el historial del ejercicio.

## Fase 7a · Series y repeticiones objetivo en las rutinas

**Objetivo:** que cada ejercicio de una rutina tenga sus series previstas y su objetivo de repeticiones.

**Tareas:**
- [x] Cada ejercicio de una rutina guarda nº de series (por defecto 3, de 1 a 10) y repeticiones objetivo opcionales (rango «8-12» o número). Predefinidas: 3 × 8-12; al copiar se conserva.
- [x] En mis rutinas: [−]/[+] series y editar el objetivo; se guarda al momento.
- [x] Al entrenar: casillas por serie (hechas, siguiente con formulario, pendientes), «completado», añadir o quitar series para hoy.
- [x] Al terminar, si cambiaste las series de hoy en una rutina propia, ofrecer guardarlas en la rutina.

**Pruebas:**
- Unitarias de validación y de casillas; API (por defecto, cambiar, límites, predefinida 403, copia conserva); e2e: 4 series en mi rutina tras recargar y entrenar completándolas.

**Hecho cuando:** una rutina propia guarda 4 × 8-10 en un ejercicio, sigue así tras recargar, y al entrenar se completan sus 4 series.

## Fase 7b · Cronómetro de descanso

**Objetivo:** controlar los descansos entre series.

**Tareas:**
- [x] Cuenta atrás grande con botones rápidos (60 s, 90 s, 2 min, 3 min), pausa y reinicio; calculada por hora, no por contador.
- [x] Al terminar, sonido y vibración (vibración solo donde el navegador la permita: Android sí, iPhone no).
- [x] Al entrenar con una rutina, arranca solo al guardar una serie, con el último tiempo elegido.
- [x] Mientras se entrena, se pide al navegador mantener la pantalla encendida (Wake Lock; Android y iOS 16.4+), lo que evita casi siempre el bloqueo entre series. Solo en el entrenamiento, no en el diario.
- Limitación aceptada: con el móvil bloqueado el aviso puede no sonar hasta volver a la app (avisar en segundo plano exigiría PWA con notificaciones, fuera de este plan).

**Pruebas:**
- Unitarias del cálculo del tiempo restante; web con reloj simulado; e2e: guardar una serie desde una rutina arranca la cuenta atrás.

**Hecho cuando:** en el gimnasio, al guardar una serie de la rutina, empieza el descanso y avisa al terminar.

## Fase 8 · Uso en móvil

**Objetivo:** cómoda en el móvil.

**Tareas:**
- [x] Diseño adaptado a móvil (botones grandes, probado a 390 px): hoja de estilos propia, modo oscuro automático, descanso fijo arriba al entrenar.
- [x] Pantalla «Inicio» dentro de la app: «Iniciar entrenamiento» (continúa con la última rutina), «Esta semana» y «Último entrenamiento». El diario pasa a `#/diario`.
- [x] «Añadir a pantalla de inicio»: manifiesto, icono y atajo «Iniciar entrenamiento» (Android). A pantalla completa en Android solo con HTTPS (Fase 9).
- [x] Acceso desde el móvil por la red local: `http://<IP del PC>:5173` (hoy 192.168.1.199). El firewall ya lo permite (regla de Docker Desktop).
- [ ] Comprobación en el móvil real (la hace el usuario).

**Pruebas:**
- Playwright con viewport móvil.

**Hecho cuando:** desde tu móvil, por la IP del PC, puedes registrar una serie sin problemas.

## Fase 8b · Diario de entrenamientos

**Objetivo:** que el diario guarde entrenamientos completos (rutina, ejercicios y series), no series sueltas.

**Tareas:**
- [x] Al terminar una rutina, «Guardar en el diario» crea un entrenamiento con las series de hoy de esa rutina (guarda el nombre de la rutina de ese día).
- [x] El diario lista los entrenamientos y su detalle muestra ejercicios y series (corregir o borrar series desde ahí).
- [x] El diario ya no tiene formulario de series sueltas; los ejercicios propios se crean desde «Mis ejercicios» o al añadirlos a una rutina.
- [x] Quitar un entrenamiento del diario no borra sus series: el historial de cada ejercicio es independiente del diario.
- [x] Las series de prueba existentes se borran (aprobado por el usuario).

**Pruebas:**
- API (guardar, listar, detalle, quitar sin borrar series, aislamiento); web; e2e: entrenar «Pecho», terminar, guardar en el diario y ver sus ejercicios y series.

**Hecho cuando:** tras entrenar una rutina y guardarla, el diario la muestra con sus ejercicios y series, y quitarla del diario no cambia el historial.

## Fase 8c · Recomendaciones con IA (Gemini)

**Objetivo:** en una rutina propia, pedir a Gemini ejercicios que añadir o sustituir y el peso y las repeticiones objetivo según la altura, el peso corporal y las series anteriores.

**Tareas:**
- [x] «Mi perfil» (enlace en la cabecera): altura (cm) y peso corporal (kg) de cada cuenta (migración 008).
- [x] `POST /rutinas/{id}/recomendaciones` con el SDK `google-genai`; clave y modelo en `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`; el más barato: `gemini-3.1-flash-lite`). Respuesta en JSON con esquema y pocos tokens.
- [x] El prompt (`prompts/recomendar_rutina.md`) lleva perfil, rutina, catálogo y las 3 últimas sesiones de cada ejercicio con peso y repeticiones de cada serie.
- [x] Validación de la respuesta: JSON, ejercicios del catálogo o de la rutina, series 1-10, repeticiones 1-50 y subida de peso como mucho +10 % (o 2,5 kg) sobre la última sesión. Si falla → 502 y aviso; 429 → aviso de límite; sin perfil → 400 con enlace a «Mi perfil»; sin clave → 503.
- [x] Panel en la rutina con «Aplicar» por sugerencia: añadir (con su plan), sustituir (en el mismo sitio y con el mismo plan) y objetivo de repeticiones. El peso recomendado se muestra (la rutina no guarda pesos).
- [x] 5 casos de prueba con su resultado esperado en `prompts/casos/`; `python -m app.recomendaciones.probar_casos` los lanza contra el Gemini real (manual, gasta cuota).
- [x] Arreglado: en «Mi perfil», una carga que llegaba tarde borraba lo escrito y se guardaba vacío.

**Pruebas:**
- API (perfil, prompt, validación, cliente con 429 simulado, ruta con IA falsa, los 5 casos); web (perfil, panel, aplicar); e2e con la IA simulada en el navegador (los e2e nunca llaman a Gemini).

**Hecho cuando:** con el perfil completo, una rutina propia muestra recomendaciones válidas y «Aplicar» cambia la rutina; con 429 o respuesta inválida, la app avisa.

## Rediseño y mejoras (Fases 9 a 9h, con 9e2 y 9e3)

Referencia: maqueta «2B · Modo foco» con los colores de «2A» (https://claude.ai/artifact/XgqQiCaUr2WKPDshNnCUjo). Solo modo oscuro: fondo grafito (#121413), superficies #1C1F1D / #2A2F2B, texto #F2F2EE, secundario #9BA39D, único acento verde lima #C6F432 (texto oscuro encima). Fuente Archivo alojada en `web/public` (sin Google Fonts ni dependencias). Iconos SVG propios. Pensado para iPhone (390 px, márgenes seguros, campos ≥ 16 px para que Safari no haga zoom).

## Fase 9 · Rediseño: base común y login

**Objetivo:** que toda la app tenga el nuevo aspecto y se navegue con el pulgar.

**Tareas:**
- [x] Hoja de estilos nueva (colores, fuente, tamaños, números de ancho fijo); fuera el modo claro. Fuente Archivo en `web/public/fuentes/` con su licencia `OFL.txt`.
- [x] Barra de pestañas inferior con iconos: Inicio · Entrenar · Diario · Ejercicios · Perfil. «Entrenar» abre la lista de rutinas. Arriba, solo el título de cada pantalla; el saludo «Hola, …» queda en Inicio. «Cerrar sesión» y la atribución a wger pasan a Perfil; al cerrar sesión se vuelve a Inicio.
- [x] Piezas comunes en `web/src/ui/`, cada una con su prueba: foto en círculo discreta (pequeña, atenuada, iniciales en gris si no hay foto), hoja inferior, botones − / +, botón principal fijo abajo, aviso breve con «Deshacer». Las que aún no se usan se estrenan en las fases 9a y 9b.
- [x] Las confirmaciones (borrar rutina, serie y ejercicio, quitar del diario) usan la hoja inferior.
- [x] Pantalla de login y registro a pantalla completa.

**Pruebas:**
- Unitarias de las piezas comunes; web de la navegación; e2e ajustados a la nueva navegación y en tamaño iPhone (WebKit, nuevo proyecto «iphone» de Playwright). Los e2e corren con 2 procesos: con más, WebKit en Windows deja clics colgados al azar.

**Hecho cuando:** todas las pantallas actuales funcionan con la barra inferior y el nuevo aspecto, y todas las pruebas pasan.

## Fase 9a · Rediseño: entrenar en modo foco

**Objetivo:** entrenar como en la maqueta 2B.

**Tareas:**
- [x] Un ejercicio por pantalla: foto pequeña (36 px) al lado del nombre, barra de progreso de ejercicios, series de hoy como puntos (con + / − serie), kilos y repeticiones en grande con − / + (2,5 kg y 1 rep; el número también se puede escribir), «la última vez» y una pista de progresión (al llegar al máximo del objetivo, +2,5 kg).
- [x] Botón fijo «Hecha · empezar descanso» que guarda la serie y arranca el descanso, con aviso «Serie guardada · Deshacer»; al completarlo, «Siguiente ejercicio» o, en el último, «Terminar entreno». Cabecera con ✕ (salir a la rutina), rutina y tiempo, y lista de ejercicios en la hoja inferior.
- [x] Mientras se entrena no hay barra de pestañas; en el resumen final vuelven.
- [x] Descanso como reloj circular pequeño en la cabecera (fija arriba), solo mientras corre; al tocarlo, hoja con el reloj grande, −15 s / +15 s, pausa y «Saltar». Sustituye a la fila de botones (60 s, 90 s…).
- [x] Descanso por ejercicio, ajustable con − / + de 15 s (de 15 s a 10 min) desde la píldora «⏱ 1:30» del ejercicio o la hoja; se guarda en el navegador (sin tocar la API). Sin descanso propio, el último elegido; si no, 1:30.
- [x] El tiempo de arriba y la duración del resumen cuentan desde la primera serie guardada, no desde que se abre la pantalla («Sin empezar» antes).
- [x] Al tocar la foto: hoja inferior con la imagen y su licencia, la mejor serie, la última vez, subir o cambiar la imagen y «Ver historial».
- [x] Resumen final de celebración: duración (desde que se abre el entreno ese día; se guarda la hora en el navegador porque las series solo tienen fecha), volumen, récords nuevos (más peso que cualquier día anterior; la primera vez no cuenta) y comparación con la vez anterior solo de los ejercicios hechos hoy, con «Guardar en el diario».

**Pruebas:**
- Unitarias (pasos de − / +, estadísticas: volumen, récords, comparación, duración, pista); web de la pantalla de entreno y del resumen; e2e: entrenar «Pecho» completo solo con los botones − / + y guardarlo en el diario, foto y «Deshacer».

**Hecho cuando:** se puede entrenar una rutina entera sin abrir el teclado y el resumen muestra los récords del día.

## Fase 9b · Rediseño: resto de pantallas

**Objetivo:** que Inicio, Rutinas, Ejercicios, Historial y Perfil sigan el mismo estilo y sean fáciles de usar con una mano.

Fotos discretas (32-36 px) solo al lado del nombre de un ejercicio. Dos commits dentro de la fase, cada uno con todas las pruebas en verde: (1) Inicio, Entrenar y Rutina; (2) Ejercicios, Historial y Perfil.

**Tareas:**
- [x] Inicio: saludo con la fecha; tarjeta grande «Hoy toca: <última rutina>» con «4 ejercicios · la última vez hace 3 días», «Empezar» y «elegir otra»; la semana en 7 círculos (lima los entrenados, anillo en hoy); último entrenamiento con sus récords. (En la 9c, «Hoy toca» pasa a salir del plan semanal.)
- [x] Entrenar (lista de rutinas): una tarjeta por rutina con nombre, nº de ejercicios y sus nombres en texto, y «Empezar» en cada una; primero las mías y debajo las predefinidas; botón + flotante «Nueva rutina» con hoja inferior.
- [x] Rutina: botón fijo «Empezar entrenamiento»; menú ⋯ con Renombrar y Borrar (predefinida: «Copiar a mis rutinas»); cada ejercicio en tarjeta con foto pequeña, series con − / +, objetivo de repeticiones, ↑ ↓ grandes y quitar con confirmación; «Añadir ejercicio» en hoja con buscador; recomendaciones de la IA en tarjeta.
- [x] Ejercicios: buscador fijo arriba, pestañas «Míos / Catálogo» (la API ya busca en ambos); al tocar uno, hoja con foto, mejor serie, última vez y «Ver historial» (en los míos, también renombrar y borrar); «+ Nuevo ejercicio» en hoja.
- [x] Historial de un ejercicio: cabecera con foto pequeña (al tocarla, la imagen grande y subirla en la hoja), mejor serie, nº de sesiones y de series, y series agrupadas por día (el día más reciente primero; dentro del día, en el orden en que se hicieron); «Editar» abre la hoja para corregir o borrar la serie (también en el detalle del diario, que usa la misma fila).
- [x] Perfil: altura y peso con − / + (1 cm, 0,5 kg; también se pueden escribir), cuenta, cerrar sesión y créditos.

**Pruebas:**
- Web de cada pantalla y del cálculo de «hace N días»; e2e existentes ajustados (rutinas, ejercicios, imágenes, historial, editar y borrar, recomendaciones, inicio, cuentas).

**Hecho cuando:** todas las pantallas siguen el nuevo estilo y los e2e pasan en tamaño iPhone.

## Fase 9c · Plan semanal y calendario

**Objetivo:** decidir qué rutina toca cada día de la semana y ver en un calendario lo planeado frente a lo hecho.

**Tareas:**
- [x] Migración 009: `plan_semanal` (usuario, día 0 = lunes … 6 = domingo, rutina; sin fila = descanso; si se borra la rutina, su fila desaparece y ese día pasa a descanso) y `plan_dias` (cambio de una fecha concreta: otra rutina o descanso).
- [x] API (`app/plan/`, lógica separada): `GET`/`PUT /plan/semana` (7 días, rutina propia o predefinida o descanso; rutina ajena → 400), `GET /plan/dias?desde&hasta` (rango de unos dos meses como mucho), `PUT`/`DELETE /plan/dias/{fecha}` (cambiar un día o volver al plan).
- [x] Guardado automático en el diario: «Terminar entreno» guarda solo el entreno (sin pulsar «Guardar en el diario»). En la API, guardar otra vez el mismo día y rutina añade las series nuevas al mismo entreno en vez de duplicarlo, y si no hay nada nuevo devuelve el que ya existe (sin error).
- [x] Lógica del calendario (funciones puras): cuadrícula del mes empezando en lunes; qué toca un día (cambio del día → plan semanal → descanso); estado de cada día (pasado: ✓ hecho, otra rutina, ✗ no hecho o descanso; hoy; futuro: lo que toca), contando lo que hay en el diario; cumplimiento de la semana («3 de 4») y racha (entrenos planificados cumplidos seguidos; los descansos no la rompen; se miran como mucho las últimas 8 semanas).
- [x] Diario: arriba el calendario del mes (‹ › para cambiar de mes, leyenda) y debajo la lista de entrenos. Al tocar un día, hoja con lo que tocaba y lo hecho (con enlace); hoy y días futuros: «Cambiar solo este día» (selector nativo: rutina o descanso) y «Volver al plan» si tiene cambio. «Editar plan semanal» en una hoja con L … D y un selector por día.
- [x] Inicio: «Hoy toca» sale del plan (cambio del día → plan semanal → sin plan, la última rutina como ahora); «Hoy toca descanso» con «Entrenar igualmente»; «Hecho hoy ✓» si ya se entrenó; en «Esta semana», «3 de 4 entrenos» y la racha. El atajo `#/empezar` también usa el plan.

**Pruebas:**
- API (guardar y leer el plan, validación, aislamiento entre usuarios, rutina ajena → 400, borrar rutina → descanso, cambio de un día y rango; guardar dos veces el mismo entreno no duplica); unitarias del calendario (meses de 28 a 31 días, cambio de año, planeado frente a hecho, racha); web del Diario, de Inicio y del guardado automático; e2e: planificar «Pecho» para hoy, verlo en Inicio, entrenarlo, terminar (se guarda solo) y verlo ✓ en el calendario.

**Hecho cuando:** el plan semanal se guarda, Inicio dice qué toca hoy, terminar un entreno lo guarda solo en el diario y el calendario muestra lo planeado y lo hecho.

## Fase 9d · Diario con gráficas

**Objetivo:** ver el progreso de un vistazo.

**Tareas:**
- [x] Cálculos en funciones puras (`diario/graficas.ts`, sin tocar la API): entrenos por semana y volumen semanal (kg × reps) de las últimas 12 semanas, de lunes a domingo y con las semanas vacías a 0; récords recientes (cada vez que se superó el mejor peso de un ejercicio, con la mejora); progreso de un ejercicio por sesión: peso máximo y 1RM estimado (Epley: peso × (1 + reps / 30)).
- [x] Gráficas en SVG propio (sin librerías): barras (semana actual en lima, el resto en gris, cifra destacada encima) y línea. Accesibles: resumen en texto y tabla oculta con los datos. Colores de datos validados con la guía de visualización sobre la tarjeta oscura: lima de datos #7EA418 y azul #5A93CC (el lima brillante de la marca queda para botones y textos).
- [x] Diario: calendario → «Progreso» en tres tarjetas deslizables en horizontal (con puntos debajo): entrenos por semana, volumen semanal y récords recientes → lista de entrenos en tarjetas (fecha, rutina, ejercicios y series; el volumen por entreno no se muestra porque las series no dicen a qué entreno pertenecen).
- [x] Historial de un ejercicio: gráfica de progreso de las últimas 12 sesiones (peso máximo en lima y 1RM estimado en gris discontinuo); con menos de 2 sesiones, «Necesitas al menos 2 sesiones para ver la evolución».

**Pruebas:**
- Unitarias de los cálculos (semanas sin datos, cambio de año, una sola sesión, series de 1 repetición); web de las gráficas (texto y tabla accesibles, semana actual destacada); e2e: tras entrenar, el diario muestra 1 entreno en la semana actual y el historial del ejercicio su gráfica.

**Hecho cuando:** el diario enseña las tres tarjetas con datos reales y el historial de un ejercicio su gráfica de progreso.

## Fase 9e · Microanimaciones

**Objetivo:** que la app se sienta viva sin distraer: animaciones cortas (≤ 300 ms), CSS y la API de animaciones del navegador (sin librerías), solo de opacidad y escala y desactivadas si el móvil tiene activado «Reducir movimiento».

**Tareas:**
- [x] Al entrenar: la píldora de la serie guardada aparece con un pequeño «pop» y el ✓ se dibuja; la barra de progreso se rellena suave; el número de kilos o repeticiones da un ligero salto al pulsar − / +; el anillo del descanso late en lima al llegar a 0.
- [x] Resumen y récords: en «¡Entreno hecho!» las cifras (duración, volumen, series) cuentan hacia arriba y los récords nuevos entran con un destello lima.
- [x] Navegación y botones: cambio de pantalla con un fundido corto; los botones se hunden un poco al tocarlos; los avisos entran deslizando desde abajo.
- [x] Inicio y calendario: los círculos de la semana y los días del calendario (9c) se rellenan en cascada al entrar.

Todo en `web/src/ui/animaciones.css`, dentro de `prefers-reduced-motion: no-preference`; la cuenta hacia arriba es `useCuentaArriba` (lógica en `ui/movimiento.ts`).

**Pruebas:**
- Unitarias de la cuenta hacia arriba (lógica pura, con reloj simulado); web: con «Reducir movimiento» no se anima (se muestra el valor final directamente); e2e completos en verde (las animaciones no deben retrasar ni tapar ningún clic). El ✓ de las series pasa a ser un SVG (`svg.check`): las e2e lo buscan así, y la prueba de tamaños en móvil espera a que acaben las animaciones antes de medir.

**Hecho cuando:** las animaciones se ven en el iPhone, son cortas y con «Reducir movimiento» desaparecen.

## Fase 9e2 · Arreglos en el iPhone real (iOS 26)

**Objetivo:** que en el iPhone la barra de pestañas no se mueva al deslizar y que la app vaya fluida.

**Problemas vistos en un iPhone con iOS 26 (Safari):**
1. Al deslizar, la barra de pestañas se queda a media pantalla. Causa: lo que se desliza es el documento entero; Safari encoge o agranda su barra de direcciones y no recoloca a tiempo lo fijado abajo (`position: fixed; bottom: 0`), un fallo conocido de iOS 26. Afecta también al botón fijo y a los avisos. Los e2e no lo veían: WebKit de escritorio no tiene esa barra que cambia de tamaño.
2. Va muy lenta. Causa: el móvil abre el servidor de desarrollo de Vite (cientos de módulos sueltos sin comprimir por la wifi y React en modo desarrollo).

**Tareas:**
- [x] El documento no se desliza nunca: `html` y `body` a toda la altura sin scroll y el contenido se desliza dentro de su propio contenedor (`#root`). La barra, el botón fijo y los avisos quedan fuera de ese movimiento.
- [x] Al cambiar de pantalla, el contenido vuelve arriba (antes se heredaba la posición de la pantalla anterior).
- [x] Servicio `web-movil` en Docker (perfil `movil`): compila la web optimizada y la sirve con `vite preview` en el puerto 4173, con el mismo proxy a la API. Sin dependencias nuevas. La de desarrollo (5173) no cambia.
- [x] La API de desarrollo deja libre el 8001 (lo usan los e2e): se documenta usar otro puerto si el 8000 está ocupado.

**Pruebas (concienzudas, para ver en local lo que pasaba en el iPhone):**
- Prueba que falla primero: en móvil e iPhone, al deslizar hasta el final el documento sigue en 0 y la barra sigue pegada abajo.
- Barra de Safari simulada: se cambia el alto de la pantalla a mitad de deslizar (844 → 750 → 844 px, como cuando Safari encoge su barra) y la barra de pestañas, el botón fijo y el aviso siguen pegados al borde inferior real, en Inicio, Diario, Entrenar y Perfil.
- El final de cada pantalla larga se puede alcanzar y su último elemento queda por encima de la barra y del botón fijo (nada tapado).
- Tras escribir en un campo (teclado) y salir, la barra vuelve a su sitio.
- Al cambiar de pantalla el contenido empieza arriba (web y e2e).
- Sin scroll lateral ni en el documento ni en el contenedor.
- Versión optimizada (proyecto e2e propio contra `web-movil`): carga con pocos archivos (≤ 10 de JS y CSS), sin módulos de desarrollo (`/@vite/`, `/src/`), JS total comprimido por debajo de un tope, y entrar, entrenar una serie y ver el diario funcionan a través del proxy.

Resultado: la versión optimizada es 1 JS (~94 KB comprimido) y 1 CSS frente a ~94 módulos sueltos en desarrollo. Las pruebas nuevas (`e2e/pantalla-fija.spec.ts`, `e2e/rendimiento.spec.ts` en el proyecto «produccion») fallaban antes del arreglo: el documento se deslizaba 323 px y el aviso pisaba 3 px el botón fijo (también arreglado). Notas: WebKit móvil de Playwright no admite la rueda del ratón, así que allí se desliza el contenedor bajo el dedo por código; ninguna prueba automática reproduce la barra de Safari real, por eso se simula cambiando el alto.

**Hecho cuando:** en el iPhone real la barra no se mueve al deslizar y la app va fluida en `http://<IP del ordenador>:4173`, con todas las pruebas en verde.

## Fase 9e3 · Velocidad al cambiar de pestaña

**Objetivo:** que las pestañas se abran al instante en el móvil.

**Medido antes:** cada pestaña tardaba 200–425 ms en local (más el viaje por la wifi en el móvil): volvía a pedir todo y enseñaba «Cargando…», y cada petición abría y cerraba dos conexiones a Postgres (≈ 6 ms cada una; con 5 peticiones a la vez, ~100 ms cada una; en Neon, con TLS, mucho más). El catálogo y sus fotos ya estaban en la base de datos: no se llama a wger al usar la app.

**Tareas:**
- [x] API: pool de conexiones con `psycopg-pool` 3.3.3 (dependencia nueva). `with db.connect()` se usa igual; comprueba la conexión antes de darla (Neon corta las que duermen) y se cierra al apagar.
- [x] Web: memoria de lecturas (`api/cache.ts`) dentro de `pedir`. Las lecturas se guardan por ruta y se devuelven copiadas; las de `/auth`, nunca. Cualquier escritura la vacía (nunca se ve algo anterior a un cambio propio). Caduca a los 5 min y al volver a la app tras más de 1 min en segundo plano. Al salir de la cuenta o caducar la sesión se vacía.
- [x] Precarga (`precarga.ts`): al entrar y poco después de cada cambio, en segundo plano, lo mismo que piden Inicio, Diario, Entrenar, Ejercicios y Perfil. Al empezar un entreno, el historial de cada ejercicio.
- [x] Fundido entre pantallas de 180 a 120 ms.

**Pruebas:**
- API: el pool reutiliza la conexión, confirma al salir y deshace si hay error, se recupera si Postgres corta la conexión y otra URL usa otro pool.
- Web: lecturas repetidas sin red, copias, peticiones a la vez compartidas, escrituras que vacían, una lectura lenta no guarda datos viejos, errores y `/auth` sin guardar, caducidad, vaciado al volver del segundo plano, aviso para precargar tras escribir; la precarga pide exactamente las rutas de las pestañas; App precarga con sesión y tras cada cambio, y nunca sin sesión.
- E2E (versión optimizada): con la red frenada 2,5 s por petición, las cinco pestañas salen en menos de 1 s, sin «Cargando…» y sin ninguna petición; tras guardar el perfil o entrenar, se ve el dato nuevo y no el viejo.

**Hecho cuando:** cambiar de pestaña en el iPhone es instantáneo, con todas las pruebas en verde.

## Fase 9f · Primeros pasos y repetir entreno

**Objetivo:** que alguien que entra por primera vez sepa qué hacer, y que repetir lo de siempre cueste un toque.

**Tareas:**
- [ ] Bienvenida para cuentas nuevas (solo la primera vez, se puede saltar): 3 pasos en hojas o pantallas cortas — elige o copia una rutina, planifica la semana, empieza. Se marca como vista en el servidor (no solo en el navegador), para que no salga en cada móvil.
- [ ] «Repetir el último» en la tarjeta de Inicio: empieza la rutina con los pesos y repeticiones de la última sesión de cada ejercicio ya puestos.

**Pruebas:**
- API del «bienvenida vista»; web de los 3 pasos y de saltarla; e2e: cuenta nueva → bienvenida → rutina y plan creados; «Repetir el último» rellena los valores de la vez anterior.

**Hecho cuando:** una cuenta nueva llega a su primer entreno sin ayuda y repetir un entreno es un toque.

## Fase 9g · Más herramientas al entrenar

**Objetivo:** cubrir lo que se echa en falta en el gimnasio.

**Tareas:**
- [ ] Notas: una por serie (opcional) y otra por entreno («molestia en el hombro», «agarre cerrado»). Se ven en «la última vez», en el historial y en el diario. Con límite de longitud.
- [ ] Superseries: en una rutina propia, agrupar dos ejercicios que se alternan; al entrenar se pasa de uno a otro y el descanso solo corre tras el segundo.
- [ ] Calculadora de discos: al tocar el peso, una hoja dice qué discos poner por lado (barra de 20 kg por defecto, configurable en Perfil; discos 25 · 20 · 15 · 10 · 5 · 2,5 · 1,25). Lógica pura aparte.

**Pruebas:**
- Unitarias de la calculadora de discos (incluido un peso imposible de cargar exacto); API de notas y de superseries (migración nueva); web y e2e de cada una.

**Hecho cuando:** las tres funcionan en el iPhone con todas las pruebas en verde.

## Fase 9h · Peso corporal y exportar datos

**Objetivo:** seguir el peso corporal y poder llevarte tus datos.

**Tareas:**
- [ ] Peso corporal en Perfil (fecha y kg, uno por día) y su gráfica de línea en el Progreso del diario, con las gráficas SVG que ya hay.
- [ ] Exportar a CSV desde Perfil: series (fecha, ejercicio, kg, repeticiones, notas), entrenos y peso corporal. Solo los datos del propio usuario. Sirve de copia de seguridad antes de publicar.

**Pruebas:**
- API del peso corporal y de la exportación (que nunca incluya datos de otra cuenta y que escape bien el CSV, sin fórmulas inyectables); web y e2e de la descarga.

**Hecho cuando:** se registra el peso, se ve su evolución y el CSV abre bien en una hoja de cálculo.

## Fase 10 · Preparar para producción (en local)

**Objetivo:** que la app esté lista para publicarse sin tocar todavía la nube.

**Tareas:**
- [ ] Límite de 5 recomendaciones al día por usuario; en la rutina, «Te quedan N hoy» y aviso al llegar a 0 (se mantiene el aviso del 429 de Gemini).
- [ ] Limitar intentos de login y de código de invitación.
- [ ] La API bajo `/api` y FastAPI sirviendo el frontend compilado: un solo servicio y un solo contenedor.
- [ ] Dockerfile de producción en dos etapas (Node compila la web, Python la sirve), usuario sin root, `/docs` desactivado. Las migraciones siguen al arrancar (una sola instancia).
- [ ] `COOKIE_SECURE=true` por defecto y comprobación de que `SESSION_SECRET` es largo.
- [ ] Conexión a Postgres con SSL (la exige Neon) y que la app aguante la primera conexión lenta cuando la base de datos despierta.
- [ ] Icono propio y pantalla de arranque para la app instalada en el iPhone (lima sobre grafito): `apple-touch-icon`, iconos del manifiesto y color de la barra de estado.

**Pruebas:**
- API del límite diario y de intentos; web del contador; la imagen de producción arranca y pasa los e2e en local.

**Hecho cuando:** la imagen de producción funciona en local con todas las pruebas en verde.

## Fase 10b · Endurecer la seguridad (auditoría del 2026-11-17)

**Objetivo:** cerrar los fallos de seguridad encontrados en la revisión antes de exponer la app a Internet. Lo que ya cubre la Fase 10 (límite de intentos de login e invitación, límite diario de Gemini, `/docs` desactivado, usuario sin root, `COOKIE_SECURE` y `SESSION_SECRET`) no se repite aquí. Va antes de la Fase 11.

Revisado y correcto (no tocar): todas las consultas SQL usan parámetros (las f-strings solo insertan constantes); todas las rutas de datos exigen sesión y filtran por usuario (sin IDOR en series, ejercicios, rutinas, plan, entrenamientos ni imágenes); contraseñas con scrypt y sal; token de sesión aleatorio guardado como HMAC; login con tiempo constante aunque el usuario no exista; cookie httpOnly + SameSite=Lax; imágenes validadas por su contenido y servidas con `nosniff`; nombres de ejercicio y rutina con longitud máxima en la API; la salida de Gemini se valida contra el contexto; ningún secreto en el historial de git; `npm audit` sin vulnerabilidades.

**Tareas:**
- [ ] **(Alta) DoS en el login sin sesión:** `validar_login` no limita la longitud de la contraseña y se calcula scrypt sobre lo que llegue; aplicar el mismo máximo (200) también al login y al nombre de usuario (30), rechazando antes de hacer el hash.
- [ ] **(Alta) Sin límite de tamaño del cuerpo:** las rutas JSON aceptan cuerpos de cualquier tamaño (incluido `/auth/login` y `/auth/registro`, sin sesión). Middleware que rechace con 413 los cuerpos JSON de más de ~64 KB (la subida de imágenes mantiene su límite de 2 MB).
- [ ] **(Media) Cabeceras de seguridad** en todas las respuestas: `Content-Security-Policy` (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Strict-Transport-Security` cuando `COOKIE_SECURE=true`, y `Cache-Control: no-store` en las respuestas de la API con datos personales.
- [ ] **(Media) Defensa CSRF adicional:** hoy solo depende de SameSite=Lax. En peticiones que cambian datos (POST/PUT/DELETE), rechazar con 403 si la cabecera `Origin` existe y no coincide con el host; y exigir `Content-Type: application/json` en las rutas JSON (hoy un cuerpo sin `Content-Type` también se interpreta como JSON).
- [ ] **(Media) Sesiones:** borrar las sesiones caducadas (al iniciar sesión o al arrancar) para que la tabla no crezca sin fin; añadir «Cerrar sesión en todos los dispositivos» en Perfil (borra todas las sesiones del usuario) para poder cortar el acceso si se pierde un móvil.
- [ ] **(Media) Cuotas de almacenamiento:** hoy cada usuario puede crear ejercicios, rutinas y fotos (2 MB cada una) sin límite y llenar la base de datos gratuita de Neon (0,5 GB). Poner un máximo razonable por usuario (p. ej. 200 ejercicios propios, 50 rutinas, 50 MB de fotos) con un 409 y aviso claro en la web.
- [ ] **(Baja) Coste de scrypt:** subir a los parámetros recomendados por OWASP (N=2^17, r=8, p=1, con `maxmem` suficiente) y rehacer el hash al iniciar sesión si el guardado usa parámetros antiguos.
- [ ] **(Baja) Entorno local:** el servidor de desarrollo de Vite (`host: true`), la API (puerto 8000) y `db-test` (puerto 5433, con la misma `POSTGRES_PASSWORD` que la base de datos real) quedan abiertos a toda la red local. Publicar la API y `db-test` solo en `127.0.0.1`, y usar en `db-test` una contraseña propia de pruebas.
- [ ] **(Baja) Inyección en el prompt de Gemini:** los nombres de ejercicios y rutinas que escribe el usuario van tal cual al prompt. Delimitarlos (p. ej. entre comillas y con instrucción de tratarlos como datos) y mantener la validación estricta de la respuesta. Solo afecta a las recomendaciones del propio usuario, pero conviene cerrarlo.
- [ ] **(Baja) Dependencias de Python:** añadir `pip-audit` (solo desarrollo; decir antes cuál y para qué) y ejecutarlo junto a `npm audit` antes de cada publicación.
- [ ] **(Baja) Registros:** comprobar que ni los logs de la API ni los de Gemini incluyen la cookie, el código de invitación, contraseñas ni la clave de Gemini.

**Pruebas:**
- API: login con contraseña de 1 MB → 400 rápido; cuerpo JSON de 1 MB → 413; POST con `Origin` ajeno → 403; POST sin `Content-Type` JSON → 400/415; cabeceras de seguridad presentes; sesiones caducadas borradas; «cerrar todas» invalida las demás cookies; límites de cuota → 409; hash con parámetros antiguos se actualiza al entrar.
- Web: botón «Cerrar sesión en todos los dispositivos» y avisos de cuota.
- e2e completos en verde con la CSP activa (que no rompa fuentes, imágenes ni estilos).

**Hecho cuando:** todas las tareas están cerradas con su prueba, `npm audit` y `pip-audit` sin vulnerabilidades y todas las pruebas en verde.

## Fase 11 · Publicar gratis en Render + Neon (solo con permiso explícito)

**Objetivo:** que los tres móviles usen la app sin depender de tu PC, a coste 0 €.

Elección (2026-11-11): **Render** (servicio web gratis: sin tarjeta, HTTPS, despliegue desde GitHub; se duerme tras ~15 min sin uso y tarda 30-60 s en despertar) + **Neon** (Postgres gratis sin caducidad, 0,5-1 GB). Descartados: Postgres gratis de Render (caduca a los 30 días), Fly.io (sin nivel gratuito), Koyeb (incierto), Oracle Cloud (tarjeta, capacidad y recortes en 2026), Google Cloud (Cloud SQL no es gratis).

**Tareas:**
- [ ] Antes de crear nada, comprobar los límites actuales en las páginas oficiales de Render y Neon.
- [ ] Cada paso se enseña antes y espera un «adelante» específico para esa acción (crear cuentas, conectar GitHub, claves, despliegue).
- [ ] El usuario hace push del repositorio a GitHub (Render despliega desde ahí).
- [ ] Claves solo en el panel de Render (`DATABASE_URL` de Neon, `SESSION_SECRET`, `INVITE_CODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`), nunca en git.
- [ ] Si se quieren conservar los datos actuales: copiarlos de la base de datos local a Neon (con permiso).
- [ ] Vaciar `INVITE_CODE` cuando existan las tres cuentas.
- [ ] Instalar en los iPhone desde Safari («Añadir a pantalla de inicio»); con HTTPS funciona también la pantalla encendida al entrenar.

**Hecho cuando:** hay permiso explícito y la app funciona en los tres móviles.

## Fase 12 · Aviso de fin de descanso con el móvil bloqueado (Web Push)

**Objetivo:** que el móvil avise al acabar el descanso aunque esté bloqueado o en otra app.

Requiere la app publicada (fase 11): en iPhone las notificaciones web solo funcionan con HTTPS y la app añadida a la pantalla de inicio (iOS 16.4+). Con el móvil bloqueado Safari congela la página, así que el aviso lo envía el servidor. Encaja con Render gratis: un descanso dura como mucho 10 min y el servidor acaba de recibir la serie, así que está despierto.

**Tareas:**
- [ ] Service worker en la web y permiso de notificaciones (pedido en el momento oportuno, no al abrir la app).
- [ ] Guardar la suscripción push de cada móvil en la base de datos (migración) y claves VAPID en `.env` (nombres en `.env.example`). Antes de añadir la librería de Web Push para Python, decir cuál y para qué.
- [ ] Al guardar una serie con descanso, la API programa el aviso para la hora de fin; −15 s / +15 s, pausa y «Saltar» lo reprograman o cancelan.
- [ ] Si la app está abierta, no duplicar el aviso (sonido y vibración como ahora).
- [ ] Aviso por la mañana con lo que toca hoy según el plan semanal de la 9c («Hoy toca: Push»; los días de descanso, nada), con la hora elegida en Perfil y la opción de desactivarlo. Nota: con Render gratis el servidor puede estar dormido a esa hora; habrá que despertarlo con una tarea programada externa gratuita o aceptar que el aviso llegue con retraso (decidirlo al planificar la fase).

**Pruebas:**
- API (suscribirse, programar, cancelar, sin enviar nada real: el envío se simula); web (permiso, suscripción); prueba manual en los iPhone reales.

**Hecho cuando:** con el móvil bloqueado, al acabar el descanso llega la notificación.

## Mejoras futuras (fuera de este plan)

Exportar copia de seguridad, modo sin conexión.

