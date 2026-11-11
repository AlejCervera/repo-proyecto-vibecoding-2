/** Iconos propios en SVG de trazo. Decorativos: el texto o el aria-label lo pone quien los usa. */
import type { ReactNode } from "react";

type Props = { tamano?: number };

function Icono({ tamano = 22, children }: Props & { children: ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconoInicio = (p: Props) => (
  <Icono {...p}>
    <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />
  </Icono>
);

export const IconoEntrenar = (p: Props) => (
  <Icono {...p}>
    <path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" />
  </Icono>
);

export const IconoDiario = (p: Props) => (
  <Icono {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Icono>
);

export const IconoEjercicios = (p: Props) => (
  <Icono {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Icono>
);

export const IconoPerfil = (p: Props) => (
  <Icono {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icono>
);

export const IconoCerrar = (p: Props) => (
  <Icono {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icono>
);

export const IconoEditar = (p: Props) => (
  <Icono {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </Icono>
);

export const IconoBuscar = (p: Props) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Icono>
);

export const IconoOpciones = (p: Props) => (
  <Icono {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" />
  </Icono>
);

export const IconoArriba = (p: Props) => (
  <Icono {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icono>
);

export const IconoAbajo = (p: Props) => (
  <Icono {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icono>
);

export const IconoReloj = (p: Props) => (
  <Icono {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 2h6" />
  </Icono>
);

export const IconoMas = (p: Props) => (
  <Icono {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

export const IconoMenos = (p: Props) => (
  <Icono {...p}>
    <path d="M5 12h14" />
  </Icono>
);
