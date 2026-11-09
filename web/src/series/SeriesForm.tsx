import { useState, type FormEvent } from "react";
import { crearSerie } from "../api/series";
import { aPeticion, hoyISO, type FormularioSerie, type Serie } from "./serie";

type Props = { onCreada: (s: Serie) => void };

const vacio = (): FormularioSerie => ({ fecha: hoyISO(), ejercicio: "", peso: "", repeticiones: "" });

export function SeriesForm({ onCreada }: Props) {
  const [form, setForm] = useState<FormularioSerie>(vacio);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof FormularioSerie) => (e: { target: { value: string } }) =>
    setForm({ ...form, [campo]: e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const creada = await crearSerie(aPeticion(form));
      onCreada(creada);
      setForm({ ...form, peso: "", repeticiones: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-label="Registrar serie">
      <label>
        Fecha
        <input type="date" value={form.fecha} onChange={cambiar("fecha")} />
      </label>
      <label>
        Ejercicio
        <input value={form.ejercicio} onChange={cambiar("ejercicio")} />
      </label>
      <label>
        Peso (kg)
        <input inputMode="decimal" value={form.peso} onChange={cambiar("peso")} />
      </label>
      <label>
        Repeticiones
        <input inputMode="numeric" value={form.repeticiones} onChange={cambiar("repeticiones")} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={enviando}>
        Guardar
      </button>
    </form>
  );
}
