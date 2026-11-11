import { useEffect, useState } from "react";

/** «32:14» o «1:05:09»: tiempo transcurrido, sin decimales. */
export function formatearTranscurrido(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}

/** Tiempo que llevas entrenando. Se repinta solo él cada segundo, no toda la pantalla. */
export function TiempoEntreno({ inicio }: { inicio: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tiempo-entreno">
      <span className="oculto">Llevas </span>
      {formatearTranscurrido(ahora - inicio)}
    </span>
  );
}
