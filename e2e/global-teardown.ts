import { execSync } from "node:child_process";
import { PROYECTO, envDocker } from "./entorno";

/** Apaga el entorno de e2e y borra su base de datos (-v). La de desarrollo no se toca. */
export default function globalTeardown() {
  execSync(`docker compose -p ${PROYECTO} down -v`, { env: envDocker, stdio: "inherit" });
}
