const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const CHUCK_CHAT_ID = '865040112';
const FUB_API_KEY = process.env.FUB_API_KEY || 'fka_0GFCDfLjPzz6wKIQBfusgvYzNDMDPo0FOx';
const FUB_AUTH = Buffer.from(FUB_API_KEY + ':').toString('base64');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8446603163:AAGfzkQ7eT8ZiBnw6Bq6E2n4vz5AHDF9OjI';

async function sendTelegram(text) {
  try {
    const { default: fetch } = await import('node-fetch');
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHUCK_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch(e) { console.error('Telegram error:', e.message); }
}

async function addToFUB(d) {
  try {
    const { default: fetch } = await import('node-fetch');
    const payload = {
      firstName: d.name ? d.name.split(' ')[0] : '',
      lastName: d.name ? d.name.split(' ').slice(1).join(' ') : '',
      emails: d.email ? [{ value: d.email }] : [],
      phones: d.phone ? [{ value: d.phone }] : [],
      stage: 'Lead',
      source: 'allincre.co',
      tags: [d.loanType || 'CRE Lead']
    };
    const res = await fetch('https://api.followupboss.com/v1/people', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + FUB_AUTH,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log('FUB result:', JSON.stringify(result));
    // Add note with scenario details
    if (result.id) {
      await fetch(`https://api.followupboss.com/v1/notes`, {
        method: 'POST',
        headers: { 'Authorization': '***' + FUB_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: result.id,
          body: `CRE Scenario from allincre.co\nLoan Type: ${d.loanType || 'N/A'}\nAmount: ${d.loanAmount || 'N/A'}\nProperty: ${d.propType || 'N/A'}\nState: ${d.state || 'N/A'}\nPrice: ${d.price || 'N/A'}\nCredit: ${d.credit || 'N/A'}\nTimeline: ${d.timeline || 'N/A'}\nScenario: ${d.notes || 'N/A'}`
        })
      });
    }
  } catch(e) { console.error('FUB error:', e.message); }
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

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('allincre server running on port ' + PORT));
