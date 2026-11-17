import { useState, type FormEvent } from "react";
import type { RutinaPlan } from "../api/plan";
import type { Rutina } from "../rutinas/rutina";
import { HojaInferior } from "../ui/HojaInferior";
import { SelectorSemana } from "./SelectorSemana";

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
        <SelectorSemana dias={dias} rutinas={rutinas} onCambiar={setDias} />
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="grande" disabled={ocupado}>
          Guardar plan
        </button>
      </form>
    </HojaInferior>
  );
}
