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

// RENOVAR
app.post("/renovar", async (req, res) => {
  try {
    // AUTENTICAÇÃO
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

    const browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage();

    // LOGIN
    await page.goto(URL_PAINEL);

    await page.fill('input[type="text"]', LOGIN);
    await page.fill('input[type="password"]', SENHA);

    await page.click("button");

    await page.waitForTimeout(4000);

    // CLIENTES
    await page.goto("https://invictosserver.site/#/customers");

    await page.waitForTimeout(3000);

    // BUSCAR CLIENTE
    const searchInput = await page.locator("input").first();
    await searchInput.fill(usuario);

    await page.waitForTimeout(3000);

    // CLICAR RENOVAR
    await page.click("text=Renovar");

    await page.waitForTimeout(2000);

    // SELECIONAR PLANO
    if (planoTexto) {
      await page.click("select");
      await page.selectOption("select", { label: planoTexto });
    }

    // CONEXÕES
    if (connections) {
      const conexoesInput = await page.locator('input[type="number"]').first();
      await conexoesInput.fill(String(connections));
    }

    await page.waitForTimeout(1000);

    // CONFIRMAR
    await page.click("text=Renovar");

    await page.waitForTimeout(5000);

    await browser.close();

    return res.json({
      ok: true,
      message: "Cliente renovado com sucesso."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Robô rodando na porta ${PORT}`);
});
