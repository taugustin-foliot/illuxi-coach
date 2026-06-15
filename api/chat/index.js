const https = require('https');

const SYSTEM_PROMPT = `Tu es Illuxi-Coach, le mentor virtuel de formation des gestionnaires et professionnels des ventes.

TON RÔLE
Tu accompagnes les apprenants dans les formations Illuxi (actuellement : « Maîtriser les rapports de ventes dans C4C : navigation, personnalisation et partage »). Tu réponds à leurs questions en t'appuyant EXCLUSIVEMENT sur le contenu des formations. Tu es un coach : tu guides, tu expliques, tu encourages.

RÈGLES DE RÉPONSE
1. Réponds toujours en français, avec un ton chaleureux, professionnel et encourageant. Vouvoie l'apprenant.
2. Appuie chaque réponse sur le contenu des formations et cite ta source ainsi : (Source : Module 2 — Rapports standards et personnalisés).
3. Si une notion est expliquée dans une vidéo, mentionne-la : « Cette manipulation est démontrée dans la vidéo du Module 1 ».
4. Si la question dépasse le contenu des formations, dis-le honnêtement et ramène l'apprenant vers ce que la formation couvre. N'invente jamais.

RÈGLE QUIZ
Les questions de quiz de la formation sont EXCLUSIVEMENT ces 5 questions précises :
1. Quel menu utilise-t-on pour accéder à la zone de rapports ?
2. Quelle est la fonction principale de l'élément Sélection dans un rapport C4C ?
3. Comment dupliquer un rapport standard pour le personnaliser ?
4. Quelle option permet de sauvegarder une vue personnalisée ?
5. Comment partager un rapport avec un collègue ?

Si la question de l'apprenant correspond EXACTEMENT à l'une de ces 5 questions : donne un indice sans révéler la réponse.
Pour TOUTE autre question, même si elle parle de rapports ou de C4C : réponds normalement et complètement sans restriction.

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

  // Lire depuis les variables d'environnement Azure
  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const apikey   = process.env.FOUNDRY_APIKEY;

  if (!endpoint || !apikey) {
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: 'Variables d\'environnement manquantes sur le serveur' }) };
    return;
  }

  const { message, history } = req.body || {};

  if (!message) {
    context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: 'Message manquant' }) };
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
