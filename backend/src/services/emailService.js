// Sends email over HTTPS (Brevo or Resend). Free hosts such as Render block SMTP ports, an HTTP API is not blocked.
// When email is not set up: in development the message is printed to the console, so flows can still be tested.
const env = require('../config/env');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function post(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Email API answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendEmail({ to, toName = '', subject, text, html }) {
  if (env.isTest) return { skipped: true };
  if (!env.email.enabled) {
    if (!env.isProd) console.log(`\n[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { skipped: true };
  }
  const { provider, apiKey, from, fromName } = env.email;
  if (provider === 'brevo') {
    await post('https://api.brevo.com/v3/smtp/email', { 'api-key': apiKey }, {
      sender: { name: fromName, email: from }, to: [{ email: to, ...(toName && { name: toName }) }], subject, textContent: text, htmlContent: html,
    });
  } else {
    await post('https://api.resend.com/emails', { Authorization: `Bearer ${apiKey}` }, { from: `${fromName} <${from}>`, to: [to], subject, text, html });
  }
  return { sent: true };
}

// small branded layout shared by every email
function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f6f1e7;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#2a2320">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#7a2e3a;margin:0 0 20px">ParamPara</p>
    <div style="background:#fffdf9;border:1px solid #eadfcd;border-radius:14px;padding:28px">
      <h1 style="font-family:Georgia,serif;font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>${bodyHtml}
    </div>
    <p style="font-size:12px;color:#8a7f76;margin-top:18px">You got this email because of activity on your ParamPara account.</p>
  </div></body></html>`;
}

function sendPasswordReset(user, link) {
  const text = `Hi ${user.name},\n\nSomeone (hopefully you) asked to reset your ParamPara password. Open this link within 30 minutes:\n${link}\n\nIf you did not ask for this, ignore this email. Your password stays the same.`;
  const html = layout('Reset your password', `<p>Hi ${escapeHtml(user.name)},</p><p>Someone (hopefully you) asked to reset your ParamPara password. The link works for 30 minutes.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#7a2e3a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a></p>
    <p style="font-size:13px;color:#6b625b">If you did not ask for this, ignore this email. Your password stays the same.</p>`);
  return sendEmail({ to: user.email, toName: user.name, subject: 'Reset your ParamPara password', text, html });
}

module.exports = { sendEmail, sendPasswordReset, escapeHtml };
