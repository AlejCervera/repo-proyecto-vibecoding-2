/** Entorno propio de los e2e: otro proyecto de Docker, otros puertos y otra base de datos. */
export const PROYECTO = "gymlog-e2e";
export const WEB_PORT = "5174";
export const API_PORT = "8001";
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;
export const CODIGO = "codigo-e2e";

export const envDocker = {
  ...process.env,
  WEB_PORT,
  API_PORT,
  INVITE_CODE: CODIGO,
};
