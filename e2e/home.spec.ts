import { expect, test } from "@playwright/test";

test("la web se abre y muestra el nombre de la app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Gym Log" })).toBeVisible();
});

test("la API responde en /health", async ({ request }) => {
  const res = await request.get("http://localhost:8000/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
