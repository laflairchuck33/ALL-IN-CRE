const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHUCK_CHAT_ID = '865040112';

async function sendTelegram(chatId, text) {
  const { default: fetch } = await import('node-fetch');
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

app.post('/api/lead', async (req, res) => {
  const { name, phone, email, loanType, loanAmount, state, notes } = req.body;
  const msg = `🏢 <b>NEW CRE LEAD — allincre.co</b>\n\n` +
    `👤 <b>Name:</b> ${name}\n` +
    `📞 <b>Phone:</b> ${phone}\n` +
    `📧 <b>Email:</b> ${email}\n` +
    `💼 <b>Loan Type:</b> ${loanType}\n` +
    `💰 <b>Amount:</b> ${loanAmount || 'Not specified'}\n` +
    `📍 <b>State:</b> ${state || 'Not specified'}\n` +
    `📝 <b>Notes:</b> ${notes || 'None'}\n\n` +
    `⏰ ${new Date().toLocaleString('en-US', {timeZone:'America/Los_Angeles'})} PT`;

  try {
    await sendTelegram(CHUCK_CHAT_ID, msg);
  } catch(e) { console.error('Telegram error:', e.message); }

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('allincre server running on port ' + PORT));
