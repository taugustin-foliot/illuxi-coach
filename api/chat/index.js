const https = require('https');
const http = require('http');

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '169.254.169.254',
      port: 80,
      path: '/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fcognitiveservices.azure.com%2F',
      method: 'GET',
      headers: { 'Metadata': 'true' }
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error('Token manquant: ' + data));
        } catch(e) { reject(new Error('Parse token: ' + data)); }
      });
    });
    r.on('error', reject);
    r.end();
  });
}

async function callFoundry(token, endpoint, agentname, message) {
  const base = endpoint.replace(/\/$/, '');
  const url = new URL(base + '/responses?api-version=2025-05-15-preview');
  const payload = JSON.stringify({
    input: [{ role: 'user', content: message }],
    extra_body: {
      agent_reference: {
        name: agentname,
        version: '0',
        type: 'agent_reference'
      }
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const r = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    r.write(payload);
    r.end();
  });
}

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

  const { endpoint, agentname, message } = req.body || {};

  if (!endpoint || !agentname || !message) {
    context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: 'Paramètres manquants' }) };
    return;
  }

  try {
    const token = await getAccessToken();
    const result = await callFoundry(token, endpoint, agentname, message);
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
