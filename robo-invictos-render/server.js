import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const URL_PAINEL =
  process.env.URL_INVICTOS || "https://invictosserver.site/";

const LOGIN = process.env.INVICTOS_LOGIN;
const SENHA = process.env.INVICTOS_PASSWORD;
const ROBOT_SECRET = process.env.ROBOT_SECRET;

app.get("/", (req, res) => {
  res.json({ ok: true });
});

app.post("/renovar", async (req, res) => {
  let browser;

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token !== ROBOT_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "Acesso negado."
      });
    }

    browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage();

    await page.goto(URL_PAINEL, {
      waitUntil: "networkidle",
      timeout: 60000
    });

    await page.waitForTimeout(8000);

    console.log("URL:", page.url());
    console.log("TITLE:", await page.title());

    const html = await page.content();

    console.log("HTML:", html.substring(0, 2000));

    return res.json({
      ok: true,
      message: "Debug gerado."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT);
