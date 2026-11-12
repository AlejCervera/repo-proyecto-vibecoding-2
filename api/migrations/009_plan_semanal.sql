-- Plan semanal: qué rutina toca cada día de la semana (0 = lunes … 6 = domingo).
-- Un día sin fila es descanso. Si se borra la rutina, su fila desaparece: ese día pasa a descanso.
CREATE TABLE plan_semanal (
    usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    dia SMALLINT NOT NULL CHECK (dia BETWEEN 0 AND 6),
    rutina_id INTEGER NOT NULL REFERENCES rutinas (id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, dia)
);

-- Cambio de un día concreto («hoy hago Pierna», «hoy descanso»): pisa al plan semanal en esa fecha.
-- rutina_id NULL = descanso ese día. Si se borra la rutina, el cambio desaparece (vuelve el plan).
CREATE TABLE plan_dias (
    usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    rutina_id INTEGER REFERENCES rutinas (id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, fecha)
);
