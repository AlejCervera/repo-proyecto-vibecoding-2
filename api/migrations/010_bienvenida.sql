-- Fase 9f: la bienvenida sale una vez a cada cuenta nueva y se recuerda aquí (no en el navegador).
-- Las cuentas que ya existían la dan por vista; las nuevas empiezan sin verla.
ALTER TABLE usuarios ADD COLUMN bienvenida_vista BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuarios ALTER COLUMN bienvenida_vista SET DEFAULT false;
