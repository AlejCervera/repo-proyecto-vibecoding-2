import { useRef, useState } from "react";
import { buscarEjercicios, crearEjercicio } from "../api/ejercicios";
import { ofrecerCrear, type Ejercicio } from "./ejercicio";
import { EjercicioImagen } from "./EjercicioImagen";

type Props = {
  value: Ejercicio | null;
  onChange: (e: Ejercicio | null) => void;
};

type Aviso = { mensaje: string; ejercicio: Ejercicio };

export function EjercicioPicker({ value, onChange }: Props) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Ejercicio[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ultimaBusqueda = useRef(0);

  function escribir(nuevo: string) {
    setTexto(nuevo);
    setAviso(null);
    setError(null);
    const id = ++ultimaBusqueda.current;
    if (nuevo.trim() === "") {
      setResultados([]);
      return;
    }
    buscarEjercicios(nuevo)
      .then((r) => id === ultimaBusqueda.current && setResultados(r))
      .catch((e: Error) => setError(e.message));
  }

  function elegir(e: Ejercicio) {
    setTexto("");
    setResultados([]);
    setAviso(null);
    onChange(e);
  }

  async function crear() {
    setError(null);
    try {
      const r = await crearEjercicio(texto);
      if (r.tipo === "creado") elegir(r.ejercicio);
      else setAviso({ mensaje: r.mensaje, ejercicio: r.ejercicio });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    }
  }

  if (value) {
    return (
      <div>
        <p>
          Ejercicio: <strong>{value.nombre}</strong>{" "}
          <button type="button" onClick={() => onChange(null)}>
            Cambiar
          </button>
        </p>
        <EjercicioImagen ejercicio={value} onCambio={onChange} />
      </div>
    );
  }

  return (
    <div>
      <label>
        Ejercicio
        <input
          value={texto}
          onChange={(e) => escribir(e.target.value)}
          placeholder="Busca: press, sentadilla…"
          autoComplete="off"
        />
      </label>
      {resultados.length > 0 && (
        <ul aria-label="Sugerencias">
          {resultados.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => elegir(e)}>
                {e.nombre}
              </button>
              {e.propio && <small> (propio)</small>}
            </li>
          ))}
        </ul>
      )}
      {!aviso && ofrecerCrear(texto, resultados) && (
        <button type="button" onClick={crear}>
          Crear «{texto.trim()}» como ejercicio propio
        </button>
      )}
      {aviso && (
        <p role="alert">
          {aviso.mensaje}.{" "}
          <button type="button" onClick={() => elegir(aviso.ejercicio)}>
            Usar «{aviso.ejercicio.nombre}»
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
