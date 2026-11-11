import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/http";
import { guardarPerfil, obtenerPerfil } from "../api/perfil";
import type { Usuario } from "../api/auth";
import { ContadorBotones } from "../ui/ContadorBotones";
import { leerNumero } from "./perfil";

type Props = {
  usuario: Usuario;
  onSalir: () => void;
  onSesionCaducada: () => void;
};

export function PerfilPage({ usuario, onSalir, onSesionCaducada }: Props) {
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    // Una carga descartada (p. ej. la doble de StrictMode) no debe pisar lo ya escrito.
    let vigente = true;
    obtenerPerfil()
      .then((p) => {
        if (!vigente) return;
        setAltura(p.altura_cm?.toString() ?? "");
        setPeso(p.peso_corporal_kg?.toLocaleString("es-ES") ?? "");
        setCargado(true);
      })
      .catch((e: Error) => {
        if (!vigente) return;
        if (e instanceof ApiError && e.status === 401) onSesionCaducada();
        else setError(e.message);
      });
    return () => {
      vigente = false;
    };
  }, [onSesionCaducada]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    try {
      await guardarPerfil({ altura_cm: leerNumero(altura), peso_corporal_kg: leerNumero(peso) });
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <section>
      <h2>Mi perfil</h2>
      <p>
        <small>
          Se usan para que la IA te recomiende pesos y repeticiones. Al pedir recomendaciones se envían a
          Google Gemini junto con tu rutina y tus últimas series.
        </small>
      </p>
      {cargado && (
        <form onSubmit={guardar} aria-label="Mi perfil" className="formulario-perfil">
          <div className="contadores">
            <ContadorBotones
              etiqueta="Altura (cm)"
              unidad="cm"
              modoTeclado="numeric"
              valor={altura}
              onCambio={setAltura}
              paso={1}
              min={100}
              max={250}
            />
            <ContadorBotones
              etiqueta="Peso corporal (kg)"
              unidad="kg"
              modoTeclado="decimal"
              valor={peso}
              onCambio={setPeso}
              paso={0.5}
              min={30}
              max={300}
            />
          </div>
          <button type="submit" className="grande">
            Guardar perfil
          </button>
        </form>
      )}
      {guardado && <p role="status">Perfil guardado.</p>}
      {error && <p role="alert">{error}</p>}

      <h3>Cuenta</h3>
      <p>
        Has entrado como <strong>{usuario.nombre_usuario}</strong>.
      </p>
      <button type="button" className="grande" onClick={onSalir}>
        Cerrar sesión
      </button>

      <p className="creditos">
        <small>
          Catálogo de ejercicios:{" "}
          <a href="https://wger.de" target="_blank" rel="noreferrer">
            wger.de
          </a>{" "}
          (licencia{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            CC-BY-SA
          </a>
          ). Fuente Archivo (licencia OFL).
        </small>
      </p>
    </section>
  );
}
