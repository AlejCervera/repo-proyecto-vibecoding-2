-- Series previstas y repeticiones objetivo (opcionales) de cada ejercicio de una rutina.
ALTER TABLE rutina_ejercicios
    ADD COLUMN series INTEGER NOT NULL DEFAULT 3 CHECK (series BETWEEN 1 AND 10),
    ADD COLUMN reps_min INTEGER CHECK (reps_min BETWEEN 1 AND 100),
    ADD COLUMN reps_max INTEGER CHECK (reps_max BETWEEN 1 AND 100),
    ADD CONSTRAINT rutina_ejercicios_reps_validas CHECK (
        (reps_min IS NULL) = (reps_max IS NULL) AND (reps_min IS NULL OR reps_min <= reps_max)
    );

-- Las predefinidas: 3 × 8-12.
UPDATE rutina_ejercicios re SET reps_min = 8, reps_max = 12
FROM rutinas r WHERE r.id = re.rutina_id AND r.usuario_id IS NULL;
