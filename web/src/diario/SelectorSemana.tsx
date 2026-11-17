import type { Rutina } from "../rutinas/rutina";

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DESCANSO = "descanso";

type Props = {
  /** Id de la rutina de cada día (lunes a domingo) o null para descanso. */
  dias: (number | null)[];
  rutinas: Rutina[];
  onCambiar: (dias: (number | null)[]) => void;
};

/** Un selector por día de la semana: una rutina o descanso (plan semanal y bienvenida). */
export function SelectorSemana({ dias, rutinas, onCambiar }: Props) {
  return (
    <>
      {DIAS_SEMANA.map((nombre, i) => (
        <label key={nombre}>
          {nombre}
          <select
            value={dias[i] === null ? DESCANSO : String(dias[i])}
            onChange={(e) => {
              const valor = e.target.value === DESCANSO ? null : Number(e.target.value);
              onCambiar(dias.map((d, j) => (j === i ? valor : d)));
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
    </>
  );
}
