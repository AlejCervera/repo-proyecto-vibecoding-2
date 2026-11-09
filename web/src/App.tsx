import { useCallback, useEffect, useState } from "react";
import { cerrarSesion, usuarioActual, type Usuario } from "./api/auth";
import { AuthScreen } from "./auth/AuthScreen";
import { SeriesPage } from "./series/SeriesPage";

export const APP_NAME = "Gym Log";

export function App() {
  // undefined = comprobando la sesión; null = sin sesión.
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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
          <SeriesPage key={usuario.id} onSesionCaducada={sinSesion} />
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
