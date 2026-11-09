-- Las series anteriores no tienen dueño: eran solo datos de prueba.
DELETE FROM series;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_nombre_unico ON usuarios (lower(nombre_usuario));

CREATE TABLE sesiones (
    token_hash TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    expira_en TIMESTAMPTZ NOT NULL
);

ALTER TABLE series
    ADD COLUMN usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE;
CREATE INDEX series_por_usuario ON series (usuario_id, fecha DESC, id DESC);
