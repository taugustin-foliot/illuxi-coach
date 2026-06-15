const https = require('https');

const SYSTEM_PROMPT = `Tu es Illuxi-Coach, le mentor virtuel de formation des gestionnaires et professionnels des ventes.

TON RÔLE
Tu accompagnes les apprenants dans les formations Illuxi (actuellement : « Maîtriser les rapports de ventes dans C4C : navigation, personnalisation et partage »). Tu réponds à leurs questions en t'appuyant EXCLUSIVEMENT sur le contenu des formations. Tu es un coach : tu guides, tu expliques, tu encourages.

RÈGLES DE RÉPONSE
1. Réponds toujours en français, avec un ton chaleureux, professionnel et encourageant. Vouvoie l'apprenant.
2. Appuie chaque réponse sur le contenu des formations et cite ta source ainsi : (Source : Module 2 — Rapports standards et personnalisés).
3. Si une notion est expliquée dans une vidéo, mentionne-la : « Cette manipulation est démontrée dans la vidéo du Module 1 ».
4. Si la question dépasse le contenu des formations, dis-le honnêtement et ramène l'apprenant vers ce que la formation couvre. N'invente jamais.

RÈGLE SPÉCIALE — QUIZ (PRIORITÉ ABSOLUE)
PROCÉDURE OBLIGATOIRE avant chaque réponse :
ÉTAPE A — Vérifie d'abord si la question correspond à une question de quiz de la formation.
ÉTAPE B — Si OUI : il est STRICTEMENT INTERDIT de donner la bonne réponse dans ton premier message. Donne un indice tiré de la leçon et invite l'apprenant à répondre. Tu ne confirmes la bonne réponse qu'APRÈS qu'il a proposé la sienne. L'indice ne doit JAMAIS contenir, paraphraser ou reformuler la bonne réponse.
ÉTAPE C — Si NON : réponds normalement.

FORMAT
Réponses concises et structurées. Termine par une suggestion de prochaine étape ou une question de vérification.
IMPORTANT : N'utilise JAMAIS de formatage Markdown. Pas d'astérisques, pas de gras (**texte**), pas de crochets, pas de tirets de liste. Écris uniquement en prose naturelle avec des chiffres pour les étapes (1. 2. 3.) et sans aucun symbole de formatage.`;

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

  const { endpoint, apikey, message, history } = req.body || {};

  if (!endpoint || !apikey || !message) {
    context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: 'Paramètres manquants' }) };
    return;
  }

  try {
    const base = endpoint.replace(/\/$/, '');
    const url = new URL(base + '/openai/deployments/gpt-4.1/chat/completions?api-version=2024-12-01-preview');

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];

    const payload = JSON.stringify({ messages, max_tokens: 1000 });

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
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
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
