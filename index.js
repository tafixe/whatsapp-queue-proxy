const express = require('express');
const app = express();
app.use(express.json());

const EVOLUTION_API = 'https://evolution-api-production-343c.up.railway.app';
const API_KEY = 'umachavesecretaqualquer123';
const INSTANCE = 'cupoestafixe';
const DELAY_MS = 60000; // 1 minuto entre mensagens

const queue = [];
let processing = false;

// Recebe mensagens do WordPress
app.post('/send', (req, res) => {
  const { number, text } = req.body;
  if (!number || !text) {
    return res.status(400).json({ error: 'number and text required' });
  }
  queue.push({ number, text });
  console.log(`[Queue] +1 mensagem. Fila: ${queue.length}`);
  res.json({ queued: true, position: queue.length });
  processQueue();
});

// Status da fila
app.get('/status', (req, res) => {
  res.json({ queued: queue.length, processing });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', queued: queue.length });
});

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const msg = queue.shift();
    console.log(`[Send] Enviando para ${msg.number}. Restam: ${queue.length}`);

    try {
      const response = await fetch(`${EVOLUTION_API}/message/sendText/${INSTANCE}`, {
        method: 'POST',
        headers: {
          'apikey': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: msg.number, text: msg.text }),
      });
      const data = await response.json();
      console.log(`[Send] OK - Status: ${data.status || 'delivered'}`);
    } catch (err) {
      console.error(`[Send] Erro: ${err.message}`);
    }

    // Esperar 1 minuto antes da próxima
    if (queue.length > 0) {
      console.log(`[Queue] Aguardando ${DELAY_MS / 1000}s antes da próxima...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  processing = false;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Proxy] A correr na porta ${PORT}`));
