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

## Rediseño (Fases 9 a 9c)

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
- [x] Al tocar la foto: hoja inferior con la imagen y su licencia, la mejor serie, la última vez, subir o cambiar la imagen y «Ver historial».
- [x] Resumen final de celebración: duración (desde que se abre el entreno ese día; se guarda la hora en el navegador porque las series solo tienen fecha), volumen, récords nuevos (más peso que cualquier día anterior; la primera vez no cuenta) y comparación con la vez anterior solo de los ejercicios hechos hoy, con «Guardar en el diario».

**Pruebas:**
- Unitarias (pasos de − / +, estadísticas: volumen, récords, comparación, duración, pista); web de la pantalla de entreno y del resumen; e2e: entrenar «Pecho» completo solo con los botones − / + y guardarlo en el diario, foto y «Deshacer».

**Hecho cuando:** se puede entrenar una rutina entera sin abrir el teclado y el resumen muestra los récords del día.

## Fase 9b · Rediseño: resto de pantallas

**Objetivo:** que Inicio, Rutinas, Ejercicios, Historial y Perfil sigan el mismo estilo y sean fáciles de usar con una mano.

**Tareas:**
- [ ] Inicio: tarjeta grande «Hoy toca: <rutina>» con «Empezar», la semana en 7 puntos y la última sesión con lo que mejoraste.
- [ ] Rutinas: tarjetas con los círculos de sus ejercicios y «Empezar» en cada una; crear con botón + flotante y hoja inferior; renombrar y borrar en un menú ⋯; series y repeticiones con − / +; reordenar con ↑ ↓ grandes.
- [ ] Ejercicios: buscador fijo arriba, pestañas «Míos / Catálogo»; al tocar uno, hoja inferior con foto, récord e historial.
- [ ] Historial de un ejercicio: récord destacado y series agrupadas por día; al tocar una serie, se edita en la hoja inferior.
- [ ] Perfil: altura y peso con − / + y «Cerrar sesión».

**Pruebas:**
- Web de cada pantalla; e2e existentes ajustados (rutinas, ejercicios, historial, editar y borrar, perfil).

**Hecho cuando:** todas las pantallas siguen la maqueta y los e2e pasan en tamaño iPhone.

## Fase 9c · Diario con gráficas

**Objetivo:** ver el progreso de un vistazo.

**Tareas:**
- [ ] Cálculos en funciones puras (sin tocar la API): entrenos por semana, volumen semanal (kg × reps), días entrenados del mes y racha, récords (peso máximo y 1RM estimado por Epley).
- [ ] Gráficas en SVG propio (sin librerías), arriba del diario en tarjetas deslizables: entrenos por semana (12 semanas), volumen semanal, calendario de constancia del mes y récords recientes.
- [ ] Gráfica de progreso en el historial de cada ejercicio: peso máximo y 1RM estimado por sesión.
- [ ] La lista de entrenamientos pasa a tarjetas.

**Pruebas:**
- Unitarias de todos los cálculos (semanas sin datos, cambio de año, una sola sesión); web de las gráficas (con texto accesible); e2e: tras entrenar, el diario muestra la semana con un entreno.

**Hecho cuando:** el diario enseña las cuatro tarjetas con datos reales y el historial de un ejercicio su gráfica de progreso.

## Fase 10 · Preparar para producción (en local)

**Objetivo:** que la app esté lista para publicarse sin tocar todavía la nube.

**Tareas:**
- [ ] Límite de 5 recomendaciones al día por usuario; en la rutina, «Te quedan N hoy» y aviso al llegar a 0 (se mantiene el aviso del 429 de Gemini).
- [ ] Limitar intentos de login y de código de invitación.
- [ ] La API bajo `/api` y FastAPI sirviendo el frontend compilado (un solo servicio).
- [ ] Dockerfile de producción en dos etapas, usuario sin root, `/docs` desactivado; las migraciones como paso aparte del arranque.
- [ ] `COOKIE_SECURE=true` por defecto y comprobación de que `SESSION_SECRET` es largo.

**Pruebas:**
- API del límite diario y de intentos; web del contador; la imagen de producción arranca y pasa los e2e en local.

**Hecho cuando:** la imagen de producción funciona en local con todas las pruebas en verde.

## Fase 11 · Despliegue en Google Cloud (solo con permiso explícito)

**Objetivo:** que los móviles usen la app sin depender de tu PC, a coste 0 €.

**Tareas:**
- [ ] Montaje gratuito: Cloud Run (app) en `us-central1` + Postgres en una VM e2-micro «Always Free» sin IP pública (conexión interna) + Secret Manager + copia diaria con `pg_dump` a Cloud Storage. Revisar precios antes de crear nada.
- [ ] Alerta de presupuesto (aviso a 1 €).
- [ ] Cada comando se enseña antes y espera un «adelante» específico para esa acción.
- [ ] Vaciar `INVITE_CODE` cuando existan las tres cuentas.
- [ ] Con HTTPS: instalar en iPhone desde Safari («Añadir a pantalla de inicio»), pantalla encendida al entrenar.

**Hecho cuando:** hay permiso explícito y la app funciona en los tres móviles.

## Mejoras futuras (fuera de este plan)

Exportar copia de seguridad, modo sin conexión.

