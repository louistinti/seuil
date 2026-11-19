// Crée le webhook Sanity qui relance le déploiement Vercel à chaque publication.
// Usage : npm run webhook
// Variables : SANITY_PROJECT_ID, SANITY_DATASET, SANITY_AUTH_TOKEN (jeton personnel : `npx sanity debug --secrets`),
//             VERCEL_DEPLOY_HOOK (URL du Deploy Hook créé dans Vercel > Settings > Git > Deploy Hooks).
export {};

const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset = 'production', SANITY_AUTH_TOKEN: token, VERCEL_DEPLOY_HOOK: url } = process.env;

if (!projectId || !token || !url) {
  console.error('Il manque SANITY_PROJECT_ID, SANITY_AUTH_TOKEN ou VERCEL_DEPLOY_HOOK. Voir .env.example.');
  process.exit(1);
}

const corps = {
  type: 'document',
  name: 'Publication vers Vercel',
  description: 'Relance le build du site quand une page ou les réglages sont publiés, modifiés ou supprimés.',
  url,
  httpMethod: 'POST',
  apiVersion: 'v2025-02-19',
  includeDrafts: false,
  dataset,
  rule: {
    on: ['create', 'update', 'delete'],
    filter: '_type in ["page", "reglages"]',
    projection: '{_id, _type}',
  },
  isDisabled: false,
};

const reponse = await fetch(`https://api.sanity.io/v2021-10-04/hooks/projects/${projectId}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(corps),
});

if (!reponse.ok) {
  console.error(`Échec (${reponse.status}) : ${await reponse.text()}`);
  console.error('Solution manuelle : sanity.io/manage > projet > API > Webhooks > Create webhook, avec les réglages ci-dessus.');
  process.exit(1);
}
console.log('Webhook créé. Publiez une page dans le Studio : le site est reconstruit dans la foulée.');
