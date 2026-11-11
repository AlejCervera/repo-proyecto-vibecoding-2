---
description: Revisa la fase actual de PLAN.md (pruebas, claves y datos personales) y dice si se puede hacer commit. No cambia ningún archivo.
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git ls-files:*), Bash(git diff:*), Bash(git log:*), Bash(git check-ignore:*), Bash(docker info:*), Bash(docker compose --profile test up -d db-test), Bash(npm test), Bash(npm run lint), Bash(npm run test:e2e)
---

# /revisar-fase

Revisión **de solo lectura** del proyecto. Argumentos opcionales: $ARGUMENTS (p. ej. `sin-e2e` para saltar Playwright, o el número de una fase concreta).

## Regla principal: no cambies nada
- **No crees, edites, borres ni formatees ningún archivo** (ni con Edit/Write ni con comandos como `sed -i`, `ruff format`, `--fix`, `npm install`, `git add`, `git commit`, `git stash`, `git checkout`).
- Si algo falla, **no lo arregles**: solo informa. Si una comprobación necesita cambiar algo para poder ejecutarse, sáltala y dilo en el informe.
- Las pruebas generan carpetas ignoradas por git (`test-results/`, `.pytest_cache/`…): eso es aceptable.
- Nunca muestres el valor de una clave: como mucho, el archivo, la línea y los 4 primeros caracteres seguidos de `…`.

## 1. Qué fase toca
1. Lee `PLAN.md` (y `docs/project-info.md` si hace falta contexto).
2. Si $ARGUMENTS indica una fase, usa esa. Si no, la fase que toca es **la primera con alguna casilla `- [ ]` sin marcar**.
3. Anota sus tareas pendientes y su apartado **Pruebas** / **Hecho cuando**. Si lo pendiente lo hace el usuario (p. ej. «la hace el usuario») o es de producción (Fase 9), dilo: no es algo que se compruebe aquí.
4. Mira `git status --short` y `git diff --stat` para saber qué cambios hay sin commit.

## 2. Pruebas y lista de comprobación
1. Comprueba que Docker responde (`docker info`). Si no, no ejecutes las pruebas que lo necesitan e indícalo como «no comprobado» (no como fallo del código).
2. Levanta la base de datos de pruebas: `docker compose --profile test up -d db-test`.
3. Ejecuta, en este orden, y guarda el resultado de cada uno (número de pruebas que pasan y fallan, y los nombres de las que fallan):
   - `npm test` (pytest de la API + Vitest de la web)
   - `npm run lint` (ruff + ESLint)
   - `npm run test:e2e` (Playwright), salvo que $ARGUMENTS diga `sin-e2e`. Tarda unos minutos.
4. Recorre la lista **Pruebas** y **Hecho cuando** de la fase: para cada punto, di si queda cubierto por alguna prueba que haya pasado (búscala con Grep en `api/tests/`, `web/src/**/*.test.*` y `e2e/`) o si es una comprobación manual pendiente.
5. Comprueba la regla de **máximo 500 líneas por archivo** en los archivos con cambios (cuenta las líneas leyéndolos).

## 3. Claves y datos personales
Busca solo en archivos que git sube o subiría (`git ls-files` y `git ls-files --others --exclude-standard`), **sin abrir `.env`**. Comprueba:
- `git ls-files` no contiene `.env` (solo `.env.example`), y `.env.example` no tiene valores en sus claves.
- Patrones de claves: `AIza[0-9A-Za-z_-]{20,}` (Google/Gemini), `sk-[A-Za-z0-9]{20,}`, `ghp_[A-Za-z0-9]{20,}`, `-----BEGIN .*PRIVATE KEY-----`, `(api[_-]?key|secret|token|password|passwd|contraseña)\s*[:=]\s*["'][^"']{8,}["']`, y URLs con credenciales `://[^/\s:]+:[^@\s]+@`.
- Datos personales: emails (`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`), teléfonos (`(\+34)?[6-9]\d{8}`), DNI/NIE (`\b[XYZ]?\d{7,8}[A-Z]\b`), IBAN (`ES\d{22}`).
- Clasifica cada coincidencia: **real/sospechosa** (bloquea el commit) o **inventada de pruebas/desarrollo** (p. ej. `dev-password-inventada`, `contraseña-e2e`, emails de ejemplo, `noreply@anthropic.com` en commits). Ante la duda, sospechosa.

## 4. Informe (exactamente 5 líneas)
Responde solo con estas 5 líneas, en español, sin texto antes ni después:

```
Fase: <nombre de la fase> — <qué queda pendiente, en pocas palabras>
Funciona: <pruebas que pasan (API x, web y, e2e z), lint y puntos de la fase cubiertos>
No funciona: <pruebas que fallan, avisos del linter, archivos >500 líneas o comprobaciones no hechas; «nada» si todo bien>
Claves y datos personales: <«limpio» o archivo:línea de lo sospechoso, sin mostrar valores>
¿Commit?: <SÍ / NO> — <motivo en una frase> (recuerda: solo commit local, nunca push)
```

Responde **NO** si falla cualquier prueba o el lint, si hay algo sospechoso en claves o datos personales, o si no se pudieron ejecutar las pruebas. Responde **SÍ** solo si todo pasa y hay cambios sin commit. Si no hay cambios pendientes, responde «NO — no hay cambios que commitear».
