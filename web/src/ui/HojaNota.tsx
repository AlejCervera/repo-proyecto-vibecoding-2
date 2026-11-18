import { useState, type FormEvent } from "react";
import { HojaInferior } from "./HojaInferior";

type Props = {
  titulo: string;
  /** Qué se anota, para el lector de pantalla y el texto de ayuda («esta serie», «el entreno»). */
  nota: string | null | undefined;
  maximo: number;
  ejemplo: string;
  onGuardar: (nota: string) => Promise<void>;
  onCerrar: () => void;
};

/** Hoja para escribir una nota corta (Fase 9g). Vacía = sin nota. */
export function HojaNota({ titulo, nota, maximo, ejemplo, onGuardar, onCerrar }: Props) {
  const [texto, setTexto] = useState(nota ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(texto.trim());
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <HojaInferior titulo={titulo} onCerrar={onCerrar}>
      <form onSubmit={guardar} aria-label={titulo} className="formulario-hoja">
        <label>
          Nota
          <textarea
            value={texto}
            maxLength={maximo}
            rows={3}
            placeholder={ejemplo}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>
        <small className="contador-nota">
          {texto.length} / {maximo}
        </small>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="grande primario" disabled={guardando}>
          {texto.trim() === "" && nota ? "Quitar nota" : "Guardar nota"}
        </button>
      </form>
    </HojaInferior>
  );
}
