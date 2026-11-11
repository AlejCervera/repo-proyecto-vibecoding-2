import { useCallback, useEffect, useState } from "react";
import { cerrarSesion, usuarioActual, type Usuario } from "./api/auth";
import { AuthScreen } from "./auth/AuthScreen";
import { MisEjerciciosPage } from "./ejercicios/MisEjerciciosPage";
import { EntrenarPage } from "./entrenar/EntrenarPage";
import { HistorialPage } from "./historial/HistorialPage";
import { Empezar } from "./inicio/Empezar";
import { InicioPage } from "./inicio/InicioPage";
import { ir, useRuta } from "./navegacion";
import { PerfilPage } from "./perfil/PerfilPage";
import { RutinaPage } from "./rutinas/RutinaPage";
import { RutinasPage } from "./rutinas/RutinasPage";
import { DiarioPage } from "./diario/DiarioPage";
import { EntrenamientoPage } from "./diario/EntrenamientoPage";
import { BarraPestanas } from "./ui/BarraPestanas";

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
    // Quien entre después empieza en Inicio, no en el Perfil de la cuenta anterior.
    ir({ pantalla: "inicio" });
    setUsuario(null);
  }

  return (
    <main>
      {usuario ? (
        <h1 className="oculto">{APP_NAME}</h1>
      ) : (
        <h1 className="marca">
          Gym <span>Log</span>
        </h1>
      )}
      {error && <p role="alert">{error}</p>}
      {usuario === null && <AuthScreen onEntrar={setUsuario} />}
      {usuario && (
        <>
          {ruta.pantalla === "inicio" && (
            <p className="saludo">
              Hola, <strong>{usuario.nombre_usuario}</strong>
            </p>
          )}
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
          {ruta.pantalla === "perfil" && (
            <PerfilPage
              key={usuario.id}
              usuario={usuario}
              onSalir={salir}
              onSesionCaducada={sinSesion}
            />
          )}
          {ruta.pantalla === "ejercicios" && (
            <MisEjerciciosPage key={usuario.id} onSesionCaducada={sinSesion} />
          )}
          <BarraPestanas actual={ruta.pantalla} />
        </>
      )}
    </main>
  );
}
