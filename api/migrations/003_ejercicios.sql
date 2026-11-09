-- unaccent solo se usa aquí, para convertir las series que ya existían.
-- La normalización de la app la hace Python (app/ejercicios/nombres.py) con las mismas reglas.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE ejercicios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    nombre_normalizado TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios (id) ON DELETE CASCADE, -- NULL = catálogo base
    wger_id INTEGER UNIQUE,
    licencia TEXT,
    autor TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ejercicios_base_unico
    ON ejercicios (nombre_normalizado) WHERE usuario_id IS NULL;
CREATE UNIQUE INDEX ejercicios_propio_unico
    ON ejercicios (usuario_id, nombre_normalizado) WHERE usuario_id IS NOT NULL;

-- Series existentes: un ejercicio propio por cada nombre distinto (normalizado) de cada usuario.
ALTER TABLE series ADD COLUMN ejercicio_id INTEGER REFERENCES ejercicios (id);

WITH normalizadas AS (
    SELECT id, usuario_id, regexp_replace(trim(ejercicio), '\s+', ' ', 'g') AS nombre,
           lower(regexp_replace(trim(unaccent(ejercicio)), '\s+', ' ', 'g')) AS norm
    FROM series
)
INSERT INTO ejercicios (nombre, nombre_normalizado, usuario_id)
SELECT DISTINCT ON (usuario_id, norm) nombre, norm, usuario_id
FROM normalizadas
ORDER BY usuario_id, norm, id;

UPDATE series s
SET ejercicio_id = e.id
FROM ejercicios e
WHERE e.usuario_id = s.usuario_id
  AND e.nombre_normalizado = lower(regexp_replace(trim(unaccent(s.ejercicio)), '\s+', ' ', 'g'));

ALTER TABLE series ALTER COLUMN ejercicio_id SET NOT NULL;
ALTER TABLE series DROP COLUMN ejercicio;
CREATE INDEX series_por_ejercicio ON series (usuario_id, ejercicio_id, fecha DESC, id DESC);
