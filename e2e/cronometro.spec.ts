import { expect, test, type Page } from "@playwright/test";
import { irA, nombreUnico, registrar } from "./cuentas";

async function empezarPecho(page: Page) {
  await registrar(page, nombreUnico("cron"));
  await irA(page, "Entrenar");
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
}

const paso = (page: Page) => page.getByRole("article", { name: "Press de banca" });

async function guardarSerie(page: Page) {
  await paso(page).getByLabel("Peso (kg)").fill("60");
  await paso(page).getByLabel("Repeticiones").fill("10");
  await paso(page).getByRole("button", { name: "Hecha · empezar descanso" }).click();
}

const reloj = (page: Page) => page.getByRole("timer", { name: "Tiempo de descanso" });
const hoja = (page: Page) => page.getByRole("dialog", { name: "Descanso" });

test("«Hecha» arranca el reloj circular de 1:30, se pausa en su hoja y avisa al terminar", async ({ page }) => {
  await page.clock.install();
  await empezarPecho(page);
  await expect(reloj(page)).toHaveCount(0);
  await expect(page.getByText("Sin empezar")).toBeVisible();

  await guardarSerie(page);
  await expect(reloj(page)).toHaveText(/^1:(30|29)$/);

  await page.clock.fastForward(30_000);
  await expect(reloj(page)).toHaveText(/^(1:00|0:59)$/);

  // Pausa (en la hoja que se abre al tocar el reloj): el tiempo no avanza
  await page.getByRole("button", { name: "Abrir el descanso" }).click();
  await hoja(page).getByRole("button", { name: "Pausar" }).click();
  const congelado = await reloj(page).textContent();
  await page.clock.fastForward(20_000);
  await expect(reloj(page)).toHaveText(congelado!);
  await hoja(page).getByRole("button", { name: "Reanudar" }).click();
  await hoja(page).getByRole("button", { name: "Cerrar" }).click();

  await page.clock.fastForward(61_000);
  await expect(page.getByRole("alert")).toHaveText("¡Descanso terminado!");
  await expect(reloj(page)).toHaveText("0:00");
});

test("+15 s alarga el descanso en marcha y «Saltar» lo quita", async ({ page }) => {
  await empezarPecho(page);
  await guardarSerie(page);
  await page.getByRole("button", { name: "Abrir el descanso" }).click();
  await hoja(page).getByRole("button", { name: "Sumar 15 s" }).click();
  await expect(reloj(page)).toHaveText(/^1:(45|44|43)$/);
  await hoja(page).getByRole("button", { name: "Saltar descanso" }).click();
  await expect(reloj(page)).toHaveCount(0);
});

test("el descanso de un ejercicio se elige con − / + y se recuerda para sus series", async ({ page }) => {
  await empezarPecho(page);
  await paso(page).getByRole("button", { name: "Descanso 1:30: cambiarlo" }).click();
  for (let i = 0; i < 2; i++) await hoja(page).getByRole("button", { name: "Menos descanso" }).click();
  await expect(hoja(page).getByLabel("Descanso de Press de banca")).toHaveText("1:00");
  await hoja(page).getByRole("button", { name: "Cerrar" }).click();

  await guardarSerie(page);
  await expect(reloj(page)).toHaveText(/^(1:00|0:5\d)$/);
  await page.reload();
  await expect(paso(page).getByRole("button", { name: "Descanso 1:00: cambiarlo" })).toBeVisible();
});

test("al recargar a mitad del descanso la cuenta sigue donde iba", async ({ page }) => {
  await empezarPecho(page);
  await guardarSerie(page);
  await expect(reloj(page)).toHaveText(/^1:(30|29)$/);
  await page.waitForTimeout(2_500);
  await page.reload();
  await expect(reloj(page)).toHaveText(/^1:2\d$/); // no vuelve a 1:30
});
