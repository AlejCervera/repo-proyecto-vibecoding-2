import { useCallback, useEffect, useState } from "react";
import { cerrarSesion, usuarioActual, type Usuario } from "./api/auth";
import { AuthScreen } from "./auth/AuthScreen";
import { MisEjerciciosPage } from "./ejercicios/MisEjerciciosPage";
import { EntrenarPage } from "./entrenar/EntrenarPage";
import { HistorialPage } from "./historial/HistorialPage";
import { Empezar } from "./inicio/Empezar";
import { InicioPage } from "./inicio/InicioPage";
import { enlace, useRuta, type Ruta } from "./navegacion";
import { PerfilPage } from "./perfil/PerfilPage";
import { RutinaPage } from "./rutinas/RutinaPage";
import { RutinasPage } from "./rutinas/RutinasPage";
import { DiarioPage } from "./diario/DiarioPage";
import { EntrenamientoPage } from "./diario/EntrenamientoPage";

export const APP_NAME = "Gym Log";

const SECCIONES: { ruta: Ruta; texto: string; activa: Ruta["pantalla"][] }[] = [
  { ruta: { pantalla: "inicio" }, texto: "Inicio", activa: ["inicio"] },
  { ruta: { pantalla: "diario" }, texto: "Diario", activa: ["diario", "entrenamiento", "historial"] },
  { ruta: { pantalla: "rutinas" }, texto: "Rutinas", activa: ["rutinas", "rutina", "entrenar"] },
  { ruta: { pantalla: "ejercicios" }, texto: "Mis ejercicios", activa: ["ejercicios"] },
];

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
      <header className="cabecera">
        <h1>{APP_NAME}</h1>
        {usuario && (
          <p className="usuario">
            Hola, <strong>{usuario.nombre_usuario}</strong>{" "}
            <a href={enlace({ pantalla: "perfil" })}>Mi perfil</a>{" "}
            <button type="button" className="discreto" onClick={salir}>
              Cerrar sesión
            </button>
          </p>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {usuario === null && <AuthScreen onEntrar={setUsuario} />}
      {usuario && (
        <>
          <nav aria-label="Secciones" className="secciones">
            {SECCIONES.map((s) => (
              <a
                key={s.texto}
                href={enlace(s.ruta)}
                aria-current={s.activa.includes(ruta.pantalla) ? "page" : undefined}
              >
                {s.texto}
              </a>
            ))}
          </nav>
          {ruta.pantalla === "inicio" && <InicioPage key={usuario.id} onSesionCaducada={sinSesion} />}
          {ruta.pantalla === "empezar" && <Empezar />}
          {ruta.pantalla === "diario" && <DiarioPage key={usuario.id} onSesionCaducada={sinSesion} />}
          {ruta.pantalla === "entrenamiento" && (
            <EntrenamientoPage
              key={`${usuario.id}-${ruta.entrenamientoId}`}
              entrenamientoId={ruta.entrenamientoId}
              onSesionCaducada={sinSesion}
            />
          )}
          {ruta.pantalla === "rutinas" && <RutinasPage key={usuario.id} onSesionCaducada={sinSesion} />}
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
          {ruta.pantalla === "perfil" && <PerfilPage key={usuario.id} onSesionCaducada={sinSesion} />}
          {ruta.pantalla === "ejercicios" && (
            <MisEjerciciosPage key={usuario.id} onSesionCaducada={sinSesion} />
          )}
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
