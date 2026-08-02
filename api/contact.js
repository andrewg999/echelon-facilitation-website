const https = require('https');

const LEADCONNECTOR_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/Xv0P6pRPl9FynUWuz98r/webhook-trigger/ab1e826d-d0d3-4979-98dc-cb0828052332';
const NOTIFICATION_EMAIL = 'andrewdgreenland@gmail.com';

function httpPost(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Request timed out')));
    req.write(data);
    req.end();
  });
}

async function forwardToLeadConnector(formData) {
  const params = new URLSearchParams();
  Object.entries(formData).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const body = params.toString();
  const parsed = new URL(LEADCONNECTOR_WEBHOOK);
  return httpPost({
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);
}

async function sendNotificationEmail(formData) {
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (!resendKey) {
    console.log('RESEND_API_KEY not set — skipping email notification');
    return;
  }

  const name = formData.name || 'Unknown';
  const email = formData.email || 'Not provided';
  const org = formData.organisation || 'Not provided';
  const phone = formData.phone || 'Not provided';
  const role = formData.role || 'Not provided';
  const interest = formData.interest || 'Not provided';
  const message = formData.message || 'No message';
  const website = formData.website || 'Not provided';

  const emailBody = JSON.stringify({
    from: 'Echelon Website <onboarding@resend.dev>',
    to: [NOTIFICATION_EMAIL],
    subject: 'New enquiry: ' + name + ' - ' + (org !== 'Not provided' ? org : interest),
    html: '<h2>New Contact Form Submission</h2>'
      + '<table style="border-collapse:collapse;width:100%;max-width:600px;">'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;width:130px;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">' + name + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:' + email + '">' + email + '</a></td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Phone</td><td style="padding:8px;border-bottom:1px solid #eee;">' + phone + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Organisation</td><td style="padding:8px;border-bottom:1px solid #eee;">' + org + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Website</td><td style="padding:8px;border-bottom:1px solid #eee;">' + website + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Role</td><td style="padding:8px;border-bottom:1px solid #eee;">' + role + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Interest</td><td style="padding:8px;border-bottom:1px solid #eee;">' + interest + '</td></tr>'
      + '</table>'
      + '<h3 style="margin-top:24px;">Message</h3>'
      + '<p style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;">' + message + '</p>'
      + '<hr style="margin-top:32px;border:none;border-top:1px solid #eee;">'
      + '<p style="color:#999;font-size:12px;">Submitted via echelonfacilitation.com contact form</p>',
  });

  try {
    const result = await httpPost({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailBody),
      },
    }, emailBody);
    console.log('Resend: ' + result.status + ' - ' + result.body);
  } catch (err) {
    console.error('Resend failed:', err.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.echelonfacilitation.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('CONTACT FORM: ' + (body.name || '') + ' (' + (body.email || '') + ') - ' + (body.organisation || '') + ' - ' + (body.interest || ''));

    const lcResult = await forwardToLeadConnector(body);
    console.log('LeadConnector: ' + lcResult.status);

    await sendNotificationEmail(body);

    return res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Contact form error:', error.message);
    return res.status(200).json({ success: true, warning: 'Form data logged to Vercel' });
  }
};
