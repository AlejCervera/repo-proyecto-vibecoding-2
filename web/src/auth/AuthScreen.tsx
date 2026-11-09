import { useState, type FormEvent } from "react";
import { iniciarSesion, registrarse, type Usuario } from "../api/auth";

type Props = { onEntrar: (u: Usuario) => void };
type Modo = "login" | "registro";

export function AuthScreen({ onEntrar }: Props) {
  const [modo, setModo] = useState<Modo>("login");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modo === "registro";

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const u = esRegistro
        ? await registrarse(nombre, password, codigo)
        : await iniciarSesion(nombre, password);
      onEntrar(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setEnviando(false);
    }
  }

  function cambiarModo() {
    setModo(esRegistro ? "login" : "registro");
    setError(null);
  }

  return (
    <section>
      <h2>{esRegistro ? "Crear cuenta" : "Iniciar sesión"}</h2>
      <form onSubmit={enviar} noValidate aria-label={esRegistro ? "Crear cuenta" : "Iniciar sesión"}>
        <label>
          Usuario
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={esRegistro ? "new-password" : "current-password"}
          />
        </label>
        {esRegistro && (
          <label>
            Código de invitación
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoCapitalize="none" />
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={enviando}>
          {esRegistro ? "Crear cuenta" : "Entrar"}
        </button>
      </form>
      <button type="button" onClick={cambiarModo}>
        {esRegistro ? "Ya tengo cuenta" : "Crear una cuenta"}
      </button>
    </section>
  );
}
