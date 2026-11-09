import { execSync } from "node:child_process";
import { API_URL, PROYECTO, WEB_URL, envDocker } from "./entorno";

async function esperar(url: string, segundos = 90) {
  for (let i = 0; i < segundos; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // aún no responde
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} no responde tras ${segundos} s`);
}

export default async function globalSetup() {
  execSync(`docker compose -p ${PROYECTO} up -d --build db api web`, {
    env: envDocker,
    stdio: "inherit",
  });
  await esperar(`${API_URL}/health`);
  await esperar(WEB_URL);
}
