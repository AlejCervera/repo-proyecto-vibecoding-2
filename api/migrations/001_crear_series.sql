CREATE TABLE series (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    ejercicio TEXT NOT NULL CHECK (length(trim(ejercicio)) > 0),
    peso_kg NUMERIC(6, 2) NOT NULL CHECK (peso_kg > 0),
    repeticiones INTEGER NOT NULL CHECK (repeticiones >= 1),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
