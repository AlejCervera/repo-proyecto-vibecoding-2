import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./estilos.css";
import "./ui/ui.css";
import "./entrenar/entrenar.css";
import "./pantallas.css";
import "./diario/diario.css";
import "./ui/graficas.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
