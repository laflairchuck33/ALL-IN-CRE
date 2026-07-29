const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const CHUCK_CHAT_ID = '865040112';

// Send Telegram via OpenClaw internal (Chuck's bot token from workspace)
async function sendTelegram(text) {
  try {
    const tokensPath = path.join(__dirname, '../outlook-tokens.json');
    // Use fetch to post to Telegram
    const { default: fetch } = await import('node-fetch');
    // Get bot token from env
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHUCK_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch(e) { console.error('Telegram error:', e.message); }
}

// Send email via Microsoft Graph (Outlook)
async function sendEmail(to, subject, html) {
  try {
    const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '../outlook-tokens.json'), 'utf8'));
    const { default: fetch } = await import('node-fetch');
    await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tokens.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }]
        },
        saveToSentItems: true
      })
    });
  } catch(e) { console.error('Email error:', e.message); }
}

app.post('/api/lead', async (req, res) => {
  const d = req.body;
  const isScenario = d.type === 'scenario';

  // Telegram alert to Chuck
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

  // Email to Sandra
  if (isScenario) {
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0f1f45;padding:24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#c9a84c;margin:0;">New Commercial Scenario — allincre.co</h2>
        </div>
        <div style="background:#f9f9f9;padding:28px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;width:160px;">Name</td><td style="padding:8px 0;">${d.name}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Phone</td><td style="padding:8px 0;">${d.phone}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Email</td><td style="padding:8px 0;">${d.email}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Loan Type</td><td style="padding:8px 0;">${d.loanType}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Loan Amount</td><td style="padding:8px 0;">${d.loanAmount}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Property Type</td><td style="padding:8px 0;">${d.propType || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">State</td><td style="padding:8px 0;">${d.state || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Purchase Price</td><td style="padding:8px 0;">${d.price || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Credit Score</td><td style="padding:8px 0;">${d.credit || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#0f1f45;">Timeline</td><td style="padding:8px 0;">${d.timeline}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#fff;border-left:4px solid #c9a84c;border-radius:4px;">
            <strong style="color:#0f1f45;">Scenario Details:</strong>
            <p style="margin:8px 0 0;color:#333;">${d.notes}</p>
          </div>
          <p style="margin-top:20px;font-size:12px;color:#999;">Submitted via allincre.co — ${new Date().toLocaleString()}</p>
        </div>
      </div>`;

    await sendEmail('sandra@loanbossco.com', `New CRE Scenario: ${d.name} — ${d.loanType} | ${d.loanAmount}`, emailHtml);
    await sendEmail('claflair@clearmortgagecapital.com', `New CRE Scenario: ${d.name} — ${d.loanType} | ${d.loanAmount}`, emailHtml);
  }

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('allincre server running on port ' + PORT));
