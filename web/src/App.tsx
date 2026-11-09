import { useCallback, useEffect, useState } from "react";
import { cerrarSesion, usuarioActual, type Usuario } from "./api/auth";
import { AuthScreen } from "./auth/AuthScreen";
import { HistorialPage } from "./historial/HistorialPage";
import { MisEjerciciosPage } from "./ejercicios/MisEjerciciosPage";
import { EntrenarPage } from "./entrenar/EntrenarPage";
import { enlace, useRuta } from "./navegacion";
import { RutinaPage } from "./rutinas/RutinaPage";
import { RutinasPage } from "./rutinas/RutinasPage";
import { SeriesPage } from "./series/SeriesPage";

export const APP_NAME = "Gym Log";

export function App() {
  // undefined = comprobando la sesión; null = sin sesión.
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const ruta = useRuta();

  useEffect(() => {
    usuarioActual()
      .then(setUsuario)
      .catch((e: Error) => setError(e.message));
  }, []);

  const sinSesion = useCallback(() => setUsuario(null), []);

  async function salir() {
    await cerrarSesion();
    setUsuario(null);
  }

  return (
    <main>
      <h1>{APP_NAME}</h1>
      {error && <p role="alert">{error}</p>}
      {usuario === null && <AuthScreen onEntrar={setUsuario} />}
      {usuario && (
        <>
          <p>
            Hola, <strong>{usuario.nombre_usuario}</strong>{" "}
            <button type="button" onClick={salir}>
              Cerrar sesión
            </button>
          </p>
          <nav aria-label="Secciones">
            <a href={enlace({ pantalla: "diario" })}>Diario</a> ·{" "}
            <a href={enlace({ pantalla: "rutinas" })}>Rutinas</a> ·{" "}
            <a href={enlace({ pantalla: "ejercicios" })}>Mis ejercicios</a>
          </nav>
          {ruta.pantalla === "rutinas" && (
            <RutinasPage key={usuario.id} onSesionCaducada={sinSesion} />
          )}
          {ruta.pantalla === "entrenar" && (
            <EntrenarPage
              key={`${usuario.id}-${ruta.rutinaId}`}
              rutinaId={ruta.rutinaId}
              paso={ruta.paso}
              onSesionCaducada={sinSesion}
            />
          )}
          {ruta.pantalla === "rutina" && (
            <RutinaPage
              key={`${usuario.id}-${ruta.rutinaId}`}
              rutinaId={ruta.rutinaId}
              onSesionCaducada={sinSesion}
            />
          )}
          {ruta.pantalla === "historial" && (
            <HistorialPage
              key={`${usuario.id}-${ruta.ejercicioId}`}
              ejercicioId={ruta.ejercicioId}
              onSesionCaducada={sinSesion}
            />
          )}
          {ruta.pantalla === "ejercicios" && (
            <MisEjerciciosPage key={usuario.id} onSesionCaducada={sinSesion} />
          )}
          {ruta.pantalla === "diario" && <SeriesPage key={usuario.id} onSesionCaducada={sinSesion} />}
        </>
      )}
      <footer>
        <small>
          Catálogo de ejercicios:{" "}
          <a href="https://wger.de" target="_blank" rel="noreferrer">
            wger.de
          </a>{" "}
          (licencia{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            CC-BY-SA
          </a>
          ).
        </small>
      </footer>
    </main>
  );
}
