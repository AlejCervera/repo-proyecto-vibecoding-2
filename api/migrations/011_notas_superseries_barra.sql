-- Fase 9g: notas, superseries y peso de la barra.

-- Notas: una por serie («molestia en el hombro») y otra por entreno («poco dormido»).
ALTER TABLE series ADD COLUMN nota TEXT CHECK (length(nota) BETWEEN 1 AND 200);
ALTER TABLE entrenamientos ADD COLUMN nota TEXT CHECK (length(nota) BETWEEN 1 AND 500);

-- Superserie: este ejercicio va unido al siguiente de la rutina (solo de 2 en 2).
ALTER TABLE rutina_ejercicios ADD COLUMN con_siguiente BOOLEAN NOT NULL DEFAULT false;

-- Peso de la barra para la calculadora de discos.
ALTER TABLE usuarios
    ADD COLUMN barra_kg NUMERIC(4, 1) NOT NULL DEFAULT 20 CHECK (barra_kg BETWEEN 0 AND 50);
