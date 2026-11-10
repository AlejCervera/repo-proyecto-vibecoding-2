-- Las series anteriores eran de prueba (borrado aprobado por el usuario, Fase 8b).
DELETE FROM series;

-- Un entrenamiento guardado en el diario: una rutina hecha un día.
-- Se guarda el nombre de la rutina de ese día: si luego se renombra o se borra, el diario no cambia.
CREATE TABLE entrenamientos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    rutina_id INTEGER REFERENCES rutinas (id) ON DELETE SET NULL,
    rutina_nombre TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX entrenamientos_por_usuario ON entrenamientos (usuario_id, fecha DESC, id DESC);

-- Quitar un entrenamiento del diario no borra sus series: solo se desvinculan.
ALTER TABLE series
    ADD COLUMN entrenamiento_id INTEGER REFERENCES entrenamientos (id) ON DELETE SET NULL;
