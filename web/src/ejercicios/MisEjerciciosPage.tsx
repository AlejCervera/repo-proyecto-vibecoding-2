import { useCallback, useEffect, useState, type FormEvent } from "react";
import { buscarEjercicios, crearEjercicio, misEjercicios } from "../api/ejercicios";
import { ApiError } from "../api/http";
import { urlImagen } from "../api/imagenes";
import { enlaceHistorial } from "../navegacion";
import { FotoCirculo } from "../ui/FotoCirculo";
import { HojaInferior } from "../ui/HojaInferior";
import { IconoBuscar, IconoMas } from "../ui/iconos";
import { normalizar, type Ejercicio, type EjercicioPropio } from "./ejercicio";
import { EjercicioPropioFila } from "./EjercicioPropioFila";

type Props = { onSesionCaducada: () => void };
type Pestana = "mios" | "catalogo";

/** Ejercicios: buscador arriba, pestañas «Míos / Catálogo» y botón + para crear uno propio. */
export function MisEjerciciosPage({ onSesionCaducada }: Props) {
  const [pestana, setPestana] = useState<Pestana>("mios");
  const [busqueda, setBusqueda] = useState("");
  const [ejercicios, setEjercicios] = useState<EjercicioPropio[] | null>(null);
  const [catalogo, setCatalogo] = useState<Ejercicio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caducada = useCallback(
    (e: Error) => {
      if (e instanceof ApiError && e.status === 401) onSesionCaducada();
      else setError(e.message);
    },
    [onSesionCaducada],
  );

  const cargar = useCallback(() => {
    misEjercicios().then(setEjercicios).catch(caducada);
  }, [caducada]);

  useEffect(cargar, [cargar]);

  // El catálogo se busca en la API (catálogo base y propios), con una pequeña espera al escribir.
  useEffect(() => {
    if (pestana !== "catalogo") return;
    let vigente = true;
    const t = setTimeout(() => {
      buscarEjercicios(busqueda)
        .then((r) => vigente && setCatalogo(r))
        .catch((e: Error) => vigente && caducada(e));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [pestana, busqueda, caducada]);

  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      const r = await crearEjercicio(nuevo);
      if (r.tipo === "existe") {
        setAviso(`${r.mensaje}: no hace falta crearlo, búscalo en el catálogo.`);
        return;
      }
      setNuevo("");
      setCreando(false);
      setPestana("mios");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  const clave = normalizar(busqueda);
  const mios = (ejercicios ?? []).filter((x) => normalizar(x.nombre).includes(clave));

  return (
    <section className="con-boton-fijo">
      <h2>Ejercicios</h2>
      <div className="barra-busqueda">
        <label className="buscador">
          <span className="oculto">Buscar ejercicio</span>
          <IconoBuscar tamano={18} />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar ejercicio"
          />
        </label>
        <div role="tablist" aria-label="Qué ejercicios ver" className="pestanas-segmento">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "mios"}
            onClick={() => setPestana("mios")}
          >
            Míos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "catalogo"}
            onClick={() => setPestana("catalogo")}
          >
            Catálogo
          </button>
        </div>
      </div>

      {!creando && error && <p role="alert">{error}</p>}

      {pestana === "mios" && (
        <div role="tabpanel" aria-label="Míos">
          {ejercicios === null && !error && <p>Cargando…</p>}
          {ejercicios?.length === 0 && (
            <p className="vacio">
              Aún no has creado ejercicios propios. Crea uno con el botón + o búscalo en el catálogo.
            </p>
          )}
          {ejercicios && ejercicios.length > 0 && mios.length === 0 && (
            <p className="vacio">Ninguno de tus ejercicios coincide con «{busqueda}».</p>
          )}
          {mios.length > 0 && (
            <ul aria-label="Mis ejercicios" className="lista-ejercicios">
              {mios.map((e) => (
                <EjercicioPropioFila
                  key={e.id}
                  ejercicio={e}
                  onRenombrado={(n) => setEjercicios((prev) => prev!.map((x) => (x.id === n.id ? n : x)))}
                  onBorrado={(id) => {
                    setEjercicios((prev) => prev!.filter((x) => x.id !== id));
                    // Las series pueden haber pasado a otro ejercicio: recargar los contadores reales.
                    cargar();
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {pestana === "catalogo" && (
        <div role="tabpanel" aria-label="Catálogo">
          {catalogo === null && <p>Cargando…</p>}
          {catalogo?.length === 0 && <p className="vacio">No hay ejercicios que coincidan con «{busqueda}».</p>}
          {catalogo && catalogo.length > 0 && (
            <ul aria-label="Catálogo" className="lista-ejercicios">
              {catalogo.map((e) => (
                <li key={e.id} className="fila-ejercicio">
                  <FotoCirculo nombre={e.nombre} src={e.imagen ? urlImagen(e.id) : null} tamano={32} />
                  <span className="fila-ejercicio-texto">
                    <a href={enlaceHistorial(e.id)}>{e.nombre}</a>
                    {e.propio && <small>Tuyo</small>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="boton-flotante"
        aria-label="Crear ejercicio"
        onClick={() => {
          setError(null);
          setAviso(null);
          setCreando(true);
        }}
      >
        <IconoMas />
        <span aria-hidden="true">Nuevo</span>
      </button>

      {creando && (
        <HojaInferior titulo="Nuevo ejercicio" onCerrar={() => setCreando(false)}>
          <form onSubmit={crear} aria-label="Crear ejercicio" className="formulario-hoja">
            <label>
              Nombre del ejercicio
              <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej.: Remo con goma" />
            </label>
            {aviso && <p role="alert">{aviso}</p>}
            {error && <p role="alert">{error}</p>}
            <button type="submit" className="grande">
              Crear
            </button>
          </form>
        </HojaInferior>
      )}
    </section>
  );
}
