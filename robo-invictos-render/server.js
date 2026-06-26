import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const PANEL_URL = process.env.INVICTOS_URL || 'https://invictosserver.site/#/sign-in';
const PANEL_USER = process.env.INVICTOS_LOGIN;
const PANEL_PASS = process.env.INVICTOS_PASSWORD;
const ROBOT_SECRET = process.env.ROBOT_SECRET;

function checkConfig() {
  const missing = [];
  if (!PANEL_USER) missing.push('INVICTOS_LOGIN');
  if (!PANEL_PASS) missing.push('INVICTOS_PASSWORD');
  if (!ROBOT_SECRET) missing.push('ROBOT_SECRET');
  return missing;
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Robô Invictos Render', time: new Date().toISOString() });
});

app.post('/renovar', async (req, res) => {
  try {
    const secret = req.headers['x-robot-secret'];
    if (!ROBOT_SECRET || secret !== ROBOT_SECRET) {
      return res.status(401).json({ ok: false, error: 'Acesso negado ao robô.' });
    }

    const missing = checkConfig();
    if (missing.length) {
      return res.status(500).json({ ok: false, error: 'Variáveis ausentes', missing });
    }

    const { usuario, connections = 2, planoTexto = 'MENSAL COMPLETO C/ADULTOS' } = req.body || {};
    if (!usuario) {
      return res.status(400).json({ ok: false, error: 'Campo usuario obrigatório.' });
    }

    const resultado = await renovarCliente({ usuario, connections, planoTexto });
    return res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('ERRO_ROBO:', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

async function renovarCliente({ usuario, connections, planoTexto }) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('Abrindo login...');
    await page.goto(PANEL_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);

    console.log('Preenchendo login...');
    await page.getByLabel(/Usuário|E-mail|Email/i).fill(PANEL_USER, { timeout: 30000 });
    await page.getByLabel(/Senha/i).fill(PANEL_PASS, { timeout: 30000 });

    const checkbox = page.getByText(/Verificado/i).first();
    try { await checkbox.click({ timeout: 3000 }); } catch {}

    await page.getByRole('button', { name: /Continuar|Entrar|Login/i }).click({ timeout: 30000 });
    await page.waitForTimeout(8000);

    console.log('Indo para clientes...');
    await page.goto('https://invictosserver.site/#/customers', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000);

    console.log('Buscando usuário:', usuario);
    const inputBusca = page.locator('input').filter({ hasNotText: /^$/ }).first();
    await inputBusca.fill(String(usuario));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);

    console.log('Clicando em renovar...');
    const renovarBtn = page.getByText(/^Renovar$/i).first();
    await renovarBtn.click({ timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Selecionando plano/conexões...');
    // Na maioria dos casos, o plano já vem selecionado. Este bloco tenta selecionar se precisar.
    try {
      const plano = page.getByText(planoTexto, { exact: false }).first();
      await plano.click({ timeout: 5000 });
    } catch {}

    // Ajusta conexões caso o campo esteja diferente. Se falhar, segue com o padrão do painel.
    try {
      const inputs = page.locator('input');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const value = await inputs.nth(i).inputValue().catch(() => '');
        if (/^\d+$/.test(value)) {
          await inputs.nth(i).fill(String(connections));
          break;
        }
      }
    } catch {}

    console.log('Confirmando renovação...');
    await page.getByRole('button', { name: /^Renovar/i }).last().click({ timeout: 30000 });
    await page.waitForTimeout(8000);

    const bodyText = await page.locator('body').innerText({ timeout: 30000 });
    console.log('Texto após renovar:', bodyText.slice(0, 500));

    const sucesso = /Confirmação de Renovação|Próximo Vencimento|renovado|sucesso/i.test(bodyText);
    if (!sucesso) {
      throw new Error('Não encontrei confirmação de renovação na tela. Verifique se o botão/fluxo mudou.');
    }

    const vencimentoMatch = bodyText.match(/Próximo Vencimento[:\s]+([^\n]+)/i);
    return {
      usuario,
      renovado: true,
      proximo_vencimento: vencimentoMatch ? vencimentoMatch[1].trim() : null
    };
  } finally {
    await browser.close();
  }
}

app.listen(PORT, () => console.log(`Robô rodando na porta ${PORT}`));
