import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { GraficaBarras } from "./GraficaBarras";
import { GraficaLinea } from "./GraficaLinea";

const barras = [
  { etiqueta: "26/10", detalle: "semana del 26/10", valor: 2 },
  { etiqueta: "2/11", detalle: "semana del 2/11", valor: 0 },
  { etiqueta: "9/11", detalle: "esta semana", valor: 3 },
];
const formato = (n: number) => `${n} entrenos`;

test("barras: la semana actual destacada y leída arriba; las vacías no dibujan nada", () => {
  const { container } = render(<GraficaBarras titulo="Entrenos" barras={barras} formato={formato} />);
  expect(container.querySelector(".lectura")!.textContent).toBe("3 entrenos esta semana");
  const dibujadas = container.querySelectorAll("path.barra");
  expect(dibujadas).toHaveLength(2); // la de 0 no se dibuja
  expect(dibujadas[1].getAttribute("class")).toContain("actual");
  expect(screen.getByRole("group", { name: "Entrenos" })).toBeTruthy();
});

test("barras: tocar o enfocar una columna la lee arriba", () => {
  const { container } = render(<GraficaBarras titulo="Entrenos" barras={barras} formato={formato} />);
  fireEvent.click(screen.getByLabelText("semana del 26/10: 2 entrenos"));
  expect(container.querySelector(".lectura")!.textContent).toBe("2 entrenos semana del 26/10");
  fireEvent.focus(screen.getByLabelText("semana del 2/11: 0 entrenos"));
  expect(container.querySelector(".lectura")!.textContent).toBe("0 entrenos semana del 2/11");
});

test("barras: tabla oculta con todos los datos", () => {
  render(<GraficaBarras titulo="Entrenos" barras={barras} formato={formato} />);
  const tabla = screen.getByRole("table", { name: "Entrenos" });
  expect(within(tabla).getAllByRole("row").map((r) => r.textContent)).toEqual([
    "semana del 26/102 entrenos",
    "semana del 2/110 entrenos",
    "esta semana3 entrenos",
  ]);
});

test("línea: dos series con leyenda (la segunda discontinua) y lectura de todas en el punto elegido", () => {
  const { container } = render(
    <GraficaLinea
      titulo="Evolución"
      etiquetas={["01/11", "04/11", "08/11"]}
      series={[
        { nombre: "Peso máximo", valores: [60, 62.5, 65], color: "dato-1" },
        { nombre: "1RM estimado", valores: [76, 80, 82], color: "dato-2", discontinua: true },
      ]}
      formato={(n) => `${n} kg`}
    />,
  );
  expect(container.querySelectorAll("polyline")).toHaveLength(2);
  expect(container.querySelectorAll("polyline")[1].getAttribute("class")).toContain("discontinua");
  expect(container.querySelector(".leyenda-grafica")!.textContent).toBe("Peso máximo1RM estimado");
  expect(container.querySelector(".lectura")!.textContent).toBe("08/1165 kg Peso máximo82 kg 1RM estimado");
  fireEvent.click(screen.getByLabelText("04/11: Peso máximo 62.5 kg, 1RM estimado 80 kg"));
  expect(container.querySelector(".lectura")!.textContent).toBe("04/1162.5 kg Peso máximo80 kg 1RM estimado");
});
