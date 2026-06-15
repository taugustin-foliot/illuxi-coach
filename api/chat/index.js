const https = require('https');

module.exports = async function (context, req) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS };
    return;
  }

  const { endpoint, apikey, method, path, body } = req.body || {};
  if (!endpoint || !apikey || !path) {
    context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: 'Paramètres manquants' }) };
    return;
  }

  try {
    const url = new URL(endpoint.replace(/\/$/, '') + path);
    const data = body ? JSON.stringify(body) : '';
    const httpMethod = method || 'GET';

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: httpMethod,
        headers: {
          'api-key': apikey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const r = https.request(options, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      });
      r.on('error', reject);
      if (data) r.write(data);
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
