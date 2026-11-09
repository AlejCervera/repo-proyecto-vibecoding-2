import { expect, test, type Page } from "@playwright/test";
import { nombreUnico, registrar } from "./cuentas";

async function empezarPecho(page: Page) {
  await registrar(page, nombreUnico("cron"));
  await page.getByRole("navigation").getByRole("link", { name: "Rutinas" }).click();
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
}

async function guardarSerie(page: Page) {
  const paso = page.getByRole("article", { name: "Press de banca" });
  await paso.getByLabel("Peso (kg)").fill("60");
  await paso.getByLabel("Repeticiones").fill("10");
  await paso.getByRole("button", { name: "Guardar serie" }).click();
}

const reloj = (page: Page) => page.getByRole("timer", { name: "Tiempo de descanso" });

test("guardar una serie arranca la cuenta atrás de 90 s y avisa al terminar", async ({ page }) => {
  await page.clock.install();
  await empezarPecho(page);
  await expect(reloj(page)).toHaveCount(0);

  await guardarSerie(page);
  await expect(reloj(page)).toHaveText(/^1:(30|29)$/);

  await page.clock.fastForward(30_000);
  await expect(reloj(page)).toHaveText(/^(1:00|0:59)$/);

  // Pausa: el tiempo no avanza
  await page.getByRole("button", { name: "Pausar" }).click();
  const congelado = await reloj(page).textContent();
  await page.clock.fastForward(20_000);
  await expect(reloj(page)).toHaveText(congelado!);
  await page.getByRole("button", { name: "Reanudar" }).click();

  await page.clock.fastForward(61_000);
  await expect(page.getByRole("alert")).toHaveText("¡Descanso terminado!");
  await expect(reloj(page)).toHaveText("0:00");
});

test("elegir 60 s se recuerda para la siguiente serie", async ({ page }) => {
  await empezarPecho(page);
  await guardarSerie(page);
  await page.getByRole("button", { name: "60 s" }).click();
  await expect(reloj(page)).toHaveText(/^(1:00|0:5\d)$/);

  await guardarSerie(page);
  await expect(reloj(page)).toHaveText(/^(1:00|0:5\d)$/);
});

test("al recargar a mitad del descanso la cuenta sigue donde iba", async ({ page }) => {
  await empezarPecho(page);
  await guardarSerie(page);
  await expect(reloj(page)).toHaveText(/^1:(30|29)$/);
  await page.waitForTimeout(2_500);
  await page.reload();
  await expect(reloj(page)).toHaveText(/^1:2\d$/); // no vuelve a 1:30
});
