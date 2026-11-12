import { useState, type FormEvent } from "react";
import type { RutinaPlan } from "../api/plan";
import type { Rutina } from "../rutinas/rutina";
import { HojaInferior } from "../ui/HojaInferior";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DESCANSO = "descanso";

type Props = {
  semana: RutinaPlan[];
  rutinas: Rutina[];
  ocupado: boolean;
  error: string | null;
  onGuardar: (dias: (number | null)[]) => void;
  onCerrar: () => void;
};

/** Hoja para editar el plan semanal: una rutina o descanso para cada día. */
export function HojaPlanSemanal({ semana, rutinas, ocupado, error, onGuardar, onCerrar }: Props) {
  const [dias, setDias] = useState<(number | null)[]>(() => semana.map((d) => d?.id ?? null));

  function guardar(e: FormEvent) {
    e.preventDefault();
    onGuardar(dias);
  }

  return (
    <HojaInferior titulo="Plan semanal" onCerrar={onCerrar}>
      <form onSubmit={guardar} aria-label="Plan semanal" className="formulario-hoja plan-semanal">
        {DIAS.map((nombre, i) => (
          <label key={nombre}>
            {nombre}
            <select
              value={dias[i] === null ? DESCANSO : String(dias[i])}
              onChange={(e) => {
                const valor = e.target.value === DESCANSO ? null : Number(e.target.value);
                setDias((prev) => prev.map((d, j) => (j === i ? valor : d)));
              }}
            >
              <option value={DESCANSO}>Descanso</option>
              {rutinas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>
        ))}
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="grande" disabled={ocupado}>
          Guardar plan
        </button>
      </form>
    </HojaInferior>
  );
}
