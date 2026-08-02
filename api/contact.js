const https = require('https');

const LEADCONNECTOR_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/Xv0P6pRPl9FynUWuz98r/webhook-trigger/ab1e826d-d0d3-4979-98dc-cb0828052332';

function forwardRequest(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = body;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body: responseBody });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timed out'));
    });
    req.write(data);
    req.end();
  });
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
    const name = body.name || 'Unknown';
    const email = body.email || 'No email';
    const org = body.organisation || '';
    const role = body.role || '';
    const interest = body.interest || '';
    const message = body.message || '';
    const phone = body.phone || '';
    const website = body.website || '';

    console.log(`CONTACT FORM: ${name} (${email}) - ${org} - ${interest}`);

    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });

    const result = await forwardRequest(LEADCONNECTOR_WEBHOOK, params.toString());

    if (result.status >= 200 && result.status < 300) {
      console.log(`LeadConnector OK: ${result.status}`);
      return res.status(200).json({ success: true, message: 'Form submitted successfully' });
    } else {
      console.error(`LeadConnector error: ${result.status} - ${result.body}`);
      return res.status(200).json({
        success: true,
        warning: 'LeadConnector returned non-200 but form data was logged',
        lcStatus: result.status,
      });
    }
  } catch (error) {
    console.error('Contact form error:', error.message);
    return res.status(200).json({
      success: true,
      warning: 'LeadConnector unreachable but form data was logged to Vercel',
    });
  }
};
