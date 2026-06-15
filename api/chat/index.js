const https = require('https');

module.exports = async function (context, req) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS };
    return;
  }

  const { endpoint, apikey, agentname, agentversion, message } = req.body || {};

  if (!endpoint || !apikey || !agentname || !message) {
    context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: 'Paramètres manquants' }) };
    return;
  }

  try {
    const base = endpoint.replace(/\/$/, '');
    const url = new URL(base + '/responses?api-version=2025-05-15-preview');
    const payload = JSON.stringify({
      input: [{ role: 'user', content: message }],
      extra_body: {
        agent_reference: {
          name: agentname,
          version: agentversion || '0',
          type: 'agent_reference'
        }
      }
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'api-key': apikey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const r = https.request(options, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      });
      r.on('error', reject);
      r.write(payload);
      r.end();
    });

    context.res = {
      status: result.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: result.body
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
