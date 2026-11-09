import { expect, test } from "@playwright/test";
import { API_URL } from "./entorno";

test("la web se abre y muestra el nombre de la app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Gym Log" })).toBeVisible();
});

test("la API responde en /health", async ({ request }) => {
  const res = await request.get(`${API_URL}/health`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
