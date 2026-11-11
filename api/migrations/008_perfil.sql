-- Perfil de cada cuenta: altura y peso corporal (opcionales), para las recomendaciones de la IA.
ALTER TABLE usuarios
    ADD COLUMN altura_cm INTEGER CHECK (altura_cm BETWEEN 100 AND 250),
    ADD COLUMN peso_corporal_kg NUMERIC(5, 1) CHECK (peso_corporal_kg BETWEEN 30 AND 300);
