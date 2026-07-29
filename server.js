const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const CHUCK_CHAT_ID = '865040112';
const WEBHOOK_URL = process.env.OPENCLAW_WEBHOOK || '';
const FUB_API_KEY = process.env.FUB_API_KEY || 'fka_0GFCDfLjPzz6wKIQBfusgvYzNDMDPo0FOx';
const FUB_AUTH = Buffer.from(FUB_API_KEY + ':').toString('base64');

async function sendTelegram(text) {
  try {
    const { default: fetch } = await import('node-fetch');
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8446603163:AAGfzkQ7eT8ZiBnw6Bq6E2n4vz5AHDF9OjI';
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHUCK_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch(e) { console.error('Telegram error:', e.message); }
}

// Add lead to Sandra's Follow Up Boss
async function addToFUB(d) {
  try {
    const { default: fetch } = await import('node-fetch');
    const payload = {
      firstName: d.name ? d.name.split(' ')[0] : '',
      lastName: d.name ? d.name.split(' ').slice(1).join(' ') : '',
      emails: d.email ? [{ value: d.email }] : [],
      phones: d.phone ? [{ value: d.phone }] : [],
      stage: 'New Lead',
      source: 'allincre.co',
      tags: [d.loanType || 'CRE Lead'],
      notes: [
        `Loan Type: ${d.loanType || 'N/A'}`,
        `Loan Amount: ${d.loanAmount || 'N/A'}`,
        `Property Type: ${d.propType || 'N/A'}`,
        `State: ${d.state || 'N/A'}`,
        `Purchase Price: ${d.price || 'N/A'}`,
        `Credit Score: ${d.credit || 'N/A'}`,
        `Timeline: ${d.timeline || 'N/A'}`,
        `Scenario: ${d.notes || 'N/A'}`
      ].join('\n')
    };
    const res = await fetch('https://api.followupboss.com/v1/people', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + FUB_AUTH,
        'Content-Type': 'application/json',
        'X-System': 'All In CRE',
        'X-System-Key': FUB_API_KEY
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log('FUB lead created:', result.id || result);
  } catch(e) { console.error('FUB error:', e.message); }
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
  await addToFUB(d);
  await forwardToWebhook(d);

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('allincre server running on port ' + PORT));
