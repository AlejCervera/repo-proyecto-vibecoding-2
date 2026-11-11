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
