const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const CHUCK_CHAT_ID = '865040112';
const WEBHOOK_URL = process.env.OPENCLAW_WEBHOOK || '';

async function sendTelegram(text) {
  try {
    const { default: fetch } = await import('node-fetch');
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHUCK_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch(e) { console.error('Telegram error:', e.message); }
}

// Forward to OpenClaw webhook for email sending
async function forwardToWebhook(data) {
  if (!WEBHOOK_URL) return;
  try {
    const { default: fetch } = await import('node-fetch');
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'allincre_lead', data })
    });
  } catch(e) { console.error('Webhook error:', e.message); }
}

app.post('/api/lead', async (req, res) => {
  const d = req.body;
  const isScenario = d.type === 'scenario';

  const tgMsg = isScenario
    ? `🏢 <b>NEW CRE SCENARIO — allincre.co</b>\n\n` +
      `👤 <b>Name:</b> ${d.name}\n📞 <b>Phone:</b> ${d.phone}\n📧 <b>Email:</b> ${d.email}\n` +
      `💼 <b>Loan Type:</b> ${d.loanType}\n💰 <b>Amount:</b> ${d.loanAmount}\n` +
      `🏗 <b>Property Type:</b> ${d.propType || 'N/A'}\n📍 <b>State:</b> ${d.state || 'N/A'}\n` +
      `💵 <b>Value/Price:</b> ${d.price || 'N/A'}\n📊 <b>Credit:</b> ${d.credit || 'N/A'}\n` +
      `⏰ <b>Timeline:</b> ${d.timeline}\n📝 <b>Scenario:</b> ${d.notes}\n\n` +
      `🕐 ${new Date().toLocaleString('en-US', {timeZone:'America/Los_Angeles'})} PT`
    : `🏢 <b>NEW CRE LEAD — allincre.co</b>\n\n` +
      `👤 <b>Name:</b> ${d.name}\n📞 <b>Phone:</b> ${d.phone}\n📧 <b>Email:</b> ${d.email}\n` +
      `💼 <b>Loan Type:</b> ${d.loanType}\n💰 <b>Amount:</b> ${d.loanAmount || 'N/A'}\n` +
      `📍 <b>State:</b> ${d.state || 'N/A'}\n📝 <b>Notes:</b> ${d.notes || 'None'}\n\n` +
      `🕐 ${new Date().toLocaleString('en-US', {timeZone:'America/Los_Angeles'})} PT`;

  await sendTelegram(tgMsg);
  await forwardToWebhook(d);

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('allincre server running on port ' + PORT));
