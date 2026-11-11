import { enviarJson, pedir } from "./http";

export type Perfil = { altura_cm: number | null; peso_corporal_kg: number | null };

export const obtenerPerfil = () => pedir<Perfil>("/perfil");

export const guardarPerfil = (perfil: Perfil) => pedir<Perfil>("/perfil", enviarJson(perfil, "PUT"));
