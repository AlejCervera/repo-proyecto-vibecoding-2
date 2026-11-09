import { useEffect } from "react";

/**
 * Sonido, vibración y pantalla encendida. Todo es opcional: si el navegador no lo
 * soporta (o no lo permite), simplemente no hace nada.
 */

let audio: AudioContext | null = null;

/** iPhone solo deja sonar audio tras un toque: llamar en cualquier pulsación del usuario. */
export function desbloquearAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    // sin audio
  }
}

/** Tres pitidos cortos generados por el navegador (sin archivos de sonido). */
export function pitar(): void {
  try {
    desbloquearAudio();
    if (!audio) return;
    const ahora = audio.currentTime;
    for (const inicio of [0, 0.3, 0.6]) {
      const osc = audio.createOscillator();
      const volumen = audio.createGain();
      osc.frequency.value = 880;
      volumen.gain.value = 0.3;
      osc.connect(volumen).connect(audio.destination);
      osc.start(ahora + inicio);
      osc.stop(ahora + inicio + 0.18);
    }
  } catch {
    // sin audio
  }
}

/** Vibra en Android; en iPhone el navegador no lo permite. */
export function vibrar(): void {
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    // sin vibración
  }
}

type WakeLock = { release: () => Promise<void> };
type ConWakeLock = { wakeLock?: { request: (tipo: "screen") => Promise<WakeLock> } };

/** Mantiene la pantalla encendida mientras el componente esté montado. */
export function useMantenerPantalla(): void {
  useEffect(() => {
    const nav = navigator as Navigator & ConWakeLock;
    if (!nav.wakeLock) return;
    let bloqueo: WakeLock | null = null;
    let activo = true;

    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock
        ?.request("screen")
        .then((b) => {
          if (activo) bloqueo = b;
          else void b.release();
        })
        .catch(() => {
          // denegado o no disponible: la pantalla se apagará como siempre
        });
    };
    // El navegador lo suelta al cambiar de app: se vuelve a pedir al regresar.
    document.addEventListener("visibilitychange", pedir);
    pedir();
    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", pedir);
      void bloqueo?.release().catch(() => {});
    };
  }, []);
}
