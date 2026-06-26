import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;

const URL_PAINEL =
  process.env.URL_INVICTOS || "https://invictosserver.site/#/sign-in";

const LOGIN = process.env.INVICTOS_LOGIN;
const SENHA = process.env.INVICTOS_PASSWORD;
const ROBOT_SECRET = process.env.ROBOT_SECRET;

// STATUS
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Robô Invictos Render",
    time: new Date().toISOString()
  });
});

// RENOVAÇÃO
app.post("/renovar", async (req, res) => {
  let browser;

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || token !== ROBOT_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "Acesso negado ao robô."
      });
    }

    const { usuario, connections, planoTexto } = req.body;

    if (!usuario) {
      return res.status(400).json({
        ok: false,
        error: "Usuário não informado."
      });
    }

    console.log("Iniciando renovação:", {
      usuario,
      connections,
      planoTexto
    });

    browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage();

    // ENTRA NO PAINEL
    await page.goto(URL_PAINEL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    console.log("URL atual:", page.url());
    console.log("Título:", await page.title());

    // PEGA TODOS OS INPUTS
    const inputs = page.locator("input");
    const totalInputs = await inputs.count();

    console.log("Total de inputs encontrados:", totalInputs);

    if (totalInputs < 2) {
      throw new Error("Campos de login não encontrados.");
    }

    // LOGIN
    await inputs.nth(0).fill(LOGIN);
    await inputs.nth(1).fill(SENHA);

    // BOTÃO CONTINUAR
    await page.locator("button").first().click();

    await page.waitForTimeout(5000);

    console.log("Login feito. URL:", page.url());

    // VAI PRA ÁREA DE CLIENTES
    await page.goto("https://invictosserver.site/#/customers", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    console.log("Página clientes carregada.");

    // BUSCAR CLIENTE
    const searchInput = page.locator("input").first();

    await searchInput.fill(usuario);

    await page.waitForTimeout(3000);

    // CLICAR RENOVAR
    await page.locator("text=Renovar").first().click();

    await page.waitForTimeout(3000);

    // SELECIONAR PLANO
    if (planoTexto) {
      const select = page.locator("select").first();

      await select.selectOption({ label: planoTexto });

      console.log("Plano selecionado:", planoTexto);
    }

    // AJUSTAR CONEXÕES
    if (connections) {
      const numberInput = page.locator('input[type="number"]').first();

      await numberInput.fill(String(connections));

      console.log("Conexões ajustadas:", connections);
    }

    await page.waitForTimeout(2000);

    // CONFIRMAR RENOVAÇÃO
    await page.locator("text=Renovar").last().click();

    await page.waitForTimeout(5000);

    console.log("Renovação concluída.");

    return res.json({
      ok: true,
      message: "Cliente renovado com sucesso."
    });
  } catch (error) {
    console.error("ERRO:", error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Robô rodando na porta ${PORT}`);
});
