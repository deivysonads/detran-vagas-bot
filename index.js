const puppeteer = require("puppeteer");
const cron = require("node-cron");
const axios = require("axios");

const BREVO_API_KEY = "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";
const EMAIL_DESTINO = "seuemail@exemplo.com"; // <-- Troque aqui pelo seu email real

const remetente = {
  name: "Vagas dentra",
  email: "noreply@nextmembers.com.br"
};

async function checarVagas() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.detran.al.gov.br/habilitacao/agendamento-de-exames/", { waitUntil: "domcontentloaded" });

    // Etapa 1
    await page.type("#cpf", "13021791441");
    await page.select("#nacionalidade", "Brasileira");
    await page.select("#ufNascimento", "Pernambuco");
    await page.select("#municipioNascimento", "BARREIROS");
    await page.type("#dataNascimento", "23/09/2003");
    await page.click("button[type=submit]");
    await page.waitForNavigation();

    // Etapa 2
    await page.select("#tipoExame", "Pratico");
    await page.select("#categoria", "B");
    await page.select("#localExame", "Maceio, Avenida Menino Marcelo num 99, Cidade Universitária, DETRAN SEDE");
    await page.click("button[type=submit]");
    await page.waitForNavigation();

    // Etapa 3
    const msg = await page.$eval(".alert-danger", el => el.innerText.trim());

    if (!msg.includes("NÃO HÁ VAGAS DISPONÍVEIS")) {
      await enviarEmailComVaga();
      console.log("✅ Vaga encontrada! E-mail enviado.");
    } else {
      console.log("❌ Ainda sem vagas.");
    }

  } catch (err) {
    console.error("Erro ao checar vagas:", err.message);
  } finally {
    await browser.close();
  }
}

async function enviarEmailComVaga() {
  await axios.post("https://api.brevo.com/v3/smtp/email", {
    sender: remetente,
    to: [{ email: EMAIL_DESTINO }],
    subject: "teve vegas hoje? veja",
    htmlContent: `
      <h2>🎉 Ei! Parece que abriram vagas no Detran/AL!</h2>
      <p>Acesse agora: <a href="https://www.detran.al.gov.br/habilitacao/agendamento-de-exames/">Clique aqui para agendar</a></p>
      <p><strong>Corre, pode acabar rápido!</strong></p>
    `
  }, {
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      "accept": "application/json"
    }
  });
}

async function enviarResumoSemVaga() {
  await axios.post("https://api.brevo.com/v3/smtp/email", {
    sender: remetente,
    to: [{ email: EMAIL_DESTINO }],
    subject: "teve vegas hoje? veja",
    htmlContent: `
      <p>Infelizmente, hoje não houve nenhuma vaga disponível durante as verificações automáticas no site do Detran/AL.</p>
      <p>Mas fique tranquilo! Continuaremos monitorando e te avisamos se surgir alguma.</p>
      <p>🕒 Última verificação: 20:00h</p>
    `
  }, {
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      "accept": "application/json"
    }
  });
}

// Agendamento: checar a cada 10 minutos
cron.schedule("*/10 * * * *", () => {
  console.log("🔎 Verificando vagas...");
  checarVagas();
});

// Enviar e-mail diário às 20:00h se nenhuma vaga foi encontrada
cron.schedule("0 20 * * *", () => {
  enviarResumoSemVaga();
});
