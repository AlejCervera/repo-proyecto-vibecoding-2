CREATE TABLE imagenes (
    id SERIAL PRIMARY KEY,
    ejercicio_id INTEGER NOT NULL REFERENCES ejercicios (id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios (id) ON DELETE CASCADE, -- NULL = imagen de ejemplo de wger
    tipo TEXT NOT NULL,
    contenido BYTEA NOT NULL,
    licencia TEXT,
    autor TEXT,
    wger_id INTEGER UNIQUE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Como mucho una imagen de wger por ejercicio y una propia por ejercicio y usuario.
CREATE UNIQUE INDEX imagenes_wger_unica ON imagenes (ejercicio_id) WHERE usuario_id IS NULL;
CREATE UNIQUE INDEX imagenes_propia_unica
    ON imagenes (ejercicio_id, usuario_id) WHERE usuario_id IS NOT NULL;
