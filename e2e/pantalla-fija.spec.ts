import { expect, test, type Locator, type Page } from "@playwright/test";
import { abrirPredefinida, entrenar, irA, nombreUnico, registrar, serieEntrenando } from "./cuentas";

/*
 * Fase 9e2. En un iPhone con iOS 26, al deslizar, la barra de pestañas se quedaba a media pantalla:
 * se deslizaba el documento entero y Safari, al encoger o agrandar su barra de direcciones, no
 * recolocaba lo fijado abajo. Aquí se comprueba que el documento no se mueve nunca (solo el
 * contenido) y, simulando la barra de Safari con cambios de alto, que lo fijo sigue pegado abajo.
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, "solo con tamaño de móvil");

const ALTO = 844;
const ALTO_BARRA_SAFARI_ENCOGIDA = 750;

/**
 * Desliza `dy` px con el dedo en mitad de la pantalla. En Chromium, con la rueda (lo hace el
 * navegador). WebKit móvil no admite la rueda: se desliza lo que deslizaría el dedo, el primer
 * contenedor con scroll bajo el punto tocado o, si no hay, el documento.
 */
async function deslizar(page: Page, dy: number) {
  if (page.context().browser()?.browserType().name() === "chromium") {
    await page.mouse.move(195, 300);
    await page.mouse.wheel(0, dy);
  } else {
    await page.evaluate((d) => {
      let el = document.elementFromPoint(195, 300);
      while (el && el !== document.documentElement && el !== document.body) {
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) {
          el.scrollBy(0, d);
          return;
        }
        el = el.parentElement;
      }
      document.scrollingElement?.scrollBy(0, d);
    }, dy);
  }
  await quieto(page);
}

/** Desliza hasta el final. */
async function bajarDelTodo(page: Page) {
  for (let i = 0; i < 6; i++) await deslizar(page, 3000);
}

/** La rueda es asíncrona: espera a que el deslizamiento se detenga. */
async function quieto(page: Page) {
  let antes = -1;
  await expect
    .poll(async () => {
      const ahora = await desplazamiento(page);
      const parado = ahora === antes;
      antes = ahora;
      return parado;
    }, { intervals: [150] })
    .toBe(true);
}

/** Cuánto se ha deslizado: el documento o el contenedor del contenido, lo que sea mayor. */
function desplazamiento(page: Page) {
  return page.evaluate(() =>
    Math.max(window.scrollY, document.scrollingElement?.scrollTop ?? 0, document.getElementById("root")?.scrollTop ?? 0),
  );
}

/** El documento en sí no se ha deslizado. */
async function documentoQuieto(page: Page, donde: string) {
  const { y, top } = await page.evaluate(() => ({
    y: window.scrollY,
    top: document.scrollingElement?.scrollTop ?? 0,
  }));
  expect(y, `el documento se ha deslizado en ${donde}`).toBe(0);
  expect(top, `el documento se ha deslizado en ${donde}`).toBe(0);
}

/** El borde inferior del elemento coincide con el de la pantalla visible. */
async function pegadoAbajo(el: Locator, alto: number, que: string, margen = 0) {
  await expect(el, `${que} no se ve`).toBeVisible(); // la pantalla puede estar aún cargando
  const caja = (await el.boundingBox())!;
  expect(caja, `${que} no se ve`).not.toBeNull();
  expect(Math.abs(caja.y + caja.height + margen - alto), `${que} no está pegado abajo (alto ${alto})`).toBeLessThanOrEqual(2);
}

const barra = (page: Page) => page.getByRole("navigation", { name: "Secciones" });

/** Comprueba la barra arriba del todo, tras bajar y con la barra de Safari encogida y vuelta. */
async function revisarBarra(page: Page, donde: string) {
  await pegadoAbajo(barra(page), ALTO, `la barra en ${donde}`);
  await bajarDelTodo(page);
  await documentoQuieto(page, donde);
  await pegadoAbajo(barra(page), ALTO, `la barra en ${donde} tras bajar`);

  // Safari encoge su barra a mitad de deslizar: cambia el alto visible
  await page.setViewportSize({ width: 390, height: ALTO_BARRA_SAFARI_ENCOGIDA });
  await deslizar(page, -400);
  await documentoQuieto(page, `${donde} (barra de Safari encogida)`);
  await pegadoAbajo(barra(page), ALTO_BARRA_SAFARI_ENCOGIDA, `la barra en ${donde} con Safari encogido`);
  await page.setViewportSize({ width: 390, height: ALTO });
  await deslizar(page, 400);
  await documentoQuieto(page, `${donde} (barra de Safari de vuelta)`);
  await pegadoAbajo(barra(page), ALTO, `la barra en ${donde} con Safari de vuelta`);
}

/** Lo último de la pantalla, tras bajar del todo, queda visible y por encima de `tapa`. */
async function finalVisible(page: Page, ultimo: Locator, tapa: Locator, que: string) {
  await bajarDelTodo(page);
  const u = (await ultimo.boundingBox())!;
  const t = (await tapa.boundingBox())!;
  expect(u.y + u.height, `${que} queda tapado`).toBeLessThanOrEqual(t.y + 1);
  expect(u.y, `${que} queda por encima de la pantalla`).toBeGreaterThanOrEqual(0);
}

test("al deslizar, el documento no se mueve y la barra sigue abajo (Inicio, Diario y Perfil)", async ({ page }) => {
  test.slow(); // entrena una vez para que el diario sea largo
  await registrar(page, nombreUnico("fija"));
  await entrenar(page, "Mixta", [["Press de banca", "60", "10"]]);

  await irA(page, "Diario");
  await expect(page.getByRole("region", { name: "Progreso" })).toBeVisible();
  await revisarBarra(page, "Diario");
  await finalVisible(page, page.getByRole("list", { name: "Entrenamientos" }).getByRole("listitem").last(), barra(page), "el último entreno del diario");

  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Último entrenamiento" })).toBeVisible();
  await revisarBarra(page, "Inicio");

  await irA(page, "Perfil");
  await revisarBarra(page, "Perfil");
  await finalVisible(page, page.getByRole("button", { name: "Cerrar sesión" }), barra(page), "«Cerrar sesión»");
});

test("al cambiar de pantalla, el contenido empieza arriba", async ({ page }) => {
  test.slow();
  // Pantalla baja: así Inicio también es más alta que la pantalla y se nota si hereda el scroll
  await page.setViewportSize({ width: 390, height: 560 });
  await registrar(page, nombreUnico("arriba"));
  await entrenar(page, "Mixta", [["Press de banca", "60", "10"]]);
  await irA(page, "Diario");
  await expect(page.getByRole("region", { name: "Progreso" })).toBeVisible();
  await bajarDelTodo(page);
  expect(await desplazamiento(page)).toBeGreaterThan(300);

  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Último entrenamiento" })).toBeVisible();
  await quieto(page);
  expect(await desplazamiento(page), "Inicio hereda el scroll del Diario").toBe(0);
  await expect(page.locator(".saludo")).toBeInViewport();
});

test("al entrenar, el botón fijo y el aviso siguen abajo al deslizar, con teclado y con Safari encogido", async ({
  page,
}) => {
  await registrar(page, nombreUnico("fijo"));
  await abrirPredefinida(page, "Pecho");
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  // La rutina también tiene botón fijo: esperar a estar ya entrenando antes de medir
  await expect(page.getByRole("button", { name: "Hecha · empezar descanso" })).toBeVisible();
  const fijo = page.locator(".boton-fijo");
  await pegadoAbajo(fijo, ALTO, "el botón fijo");

  // Escribir en un campo (en el iPhone abre el teclado) y salir: el botón vuelve a su sitio
  const peso = page.getByLabel("Peso (kg)");
  await peso.click();
  await peso.fill("70");
  await page.getByRole("heading", { name: "Press de banca" }).click();
  await documentoQuieto(page, "entrenar tras escribir");
  await pegadoAbajo(fijo, ALTO, "el botón fijo tras escribir");

  await serieEntrenando(page, "Press de banca", "80", "8");
  const aviso = page.locator(".aviso");
  await expect(aviso).toBeVisible();
  await deslizar(page, 1500);
  await documentoQuieto(page, "entrenar");
  await pegadoAbajo(fijo, ALTO, "el botón fijo tras deslizar");

  await page.setViewportSize({ width: 390, height: ALTO_BARRA_SAFARI_ENCOGIDA });
  await documentoQuieto(page, "entrenar con Safari encogido");
  await pegadoAbajo(fijo, ALTO_BARRA_SAFARI_ENCOGIDA, "el botón fijo con Safari encogido");
  // El aviso va justo encima del botón fijo, sin pisarlo
  const a = (await aviso.boundingBox())!;
  const f = (await fijo.boundingBox())!;
  expect(a.y + a.height, "el aviso pisa el botón fijo").toBeLessThanOrEqual(f.y + 1);

  // Lo último del ejercicio queda por encima del botón fijo
  await page.setViewportSize({ width: 390, height: ALTO });
  await finalVisible(page, page.getByRole("link", { name: "Ver historial" }), fijo, "«Ver historial»");
});

test("sin scroll lateral ni en el documento ni en el contenido", async ({ page }) => {
  await registrar(page, nombreUnico("lateral"));
  for (const pantalla of ["Inicio", "Diario", "Ejercicios", "Perfil"] as const) {
    await irA(page, pantalla);
    const anchos = await page.evaluate(() => {
      const raiz = document.getElementById("root")!;
      return {
        documento: document.documentElement.scrollWidth,
        contenido: raiz.scrollWidth - raiz.clientWidth,
        visible: window.innerWidth,
      };
    });
    expect(anchos.documento, `scroll lateral del documento en ${pantalla}`).toBeLessThanOrEqual(anchos.visible);
    expect(anchos.contenido, `scroll lateral del contenido en ${pantalla}`).toBeLessThanOrEqual(0);
  }
});
