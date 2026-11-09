CREATE TABLE rutinas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    nombre_normalizado TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios (id) ON DELETE CASCADE, -- NULL = predefinida
    clave TEXT UNIQUE, -- identificador fijo de las predefinidas
    creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((usuario_id IS NULL) = (clave IS NOT NULL))
);
CREATE UNIQUE INDEX rutinas_propia_unica
    ON rutinas (usuario_id, nombre_normalizado) WHERE usuario_id IS NOT NULL;

-- Lista ordenada de ejercicios de cada rutina, sin repetir ejercicio.
-- Si se borra un ejercicio propio, desaparece de las rutinas.
CREATE TABLE rutina_ejercicios (
    rutina_id INTEGER NOT NULL REFERENCES rutinas (id) ON DELETE CASCADE,
    ejercicio_id INTEGER NOT NULL REFERENCES ejercicios (id) ON DELETE CASCADE,
    posicion INTEGER NOT NULL,
    PRIMARY KEY (rutina_id, ejercicio_id)
);
CREATE INDEX rutina_ejercicios_orden ON rutina_ejercicios (rutina_id, posicion);
