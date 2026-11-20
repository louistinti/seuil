// Migration du 20 novembre 2026 : crédit en pied de page (« Créé par Louis Tinti », lié au portfolio).
//
// Usage :
//   npm run migration:credit -- --essai   montre ce qui changerait dans Sanity, sans rien écrire
//   npm run migration:credit              écrit dans les réglages publiés, le webhook relance le site
//   npm run migration:credit -- --local   applique la même valeur à content/pages.json
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CREDIT = {
  _type: 'object',
  texte: 'Créé par',
  lien: { _type: 'lien', libelle: 'Louis Tinti', href: 'https://louistdesign.me' },
};

async function main() {
  const arguments_ = process.argv.slice(2);
  const essai = arguments_.includes('--essai');

  if (arguments_.includes('--local')) {
    const fichier = join(process.cwd(), 'content', 'pages.json');
    const contenu = JSON.parse(readFileSync(fichier, 'utf8'));
    contenu.reglages.credit = CREDIT;
    writeFileSync(fichier, `${JSON.stringify(contenu, null, 2)}\n`);
    console.log('content/pages.json mis à jour.');
    return;
  }

  const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset = 'production', SANITY_WRITE_TOKEN: token } = process.env;
  if (!projectId || (!essai && !token)) {
    console.error('Il manque SANITY_PROJECT_ID, ou SANITY_WRITE_TOKEN pour écrire. Voir .env.example.');
    process.exit(1);
  }
  const { createClient } = await import('@sanity/client');
  const client = createClient({ projectId, dataset, token, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw' });
  const reglages = await client.getDocument<{ _rev: string; credit?: unknown }>('reglages');
  if (!reglages) throw new Error('Le document « Réglages du site » est absent de Sanity.');
  if (await client.getDocument('drafts.reglages')) throw new Error('Les réglages ont un brouillon non publié : publiez-le ou supprimez-le d’abord.');
  const { _type, ...attendu } = CREDIT;
  const aJour = JSON.stringify(reglages.credit && { ...(reglages.credit as object), _type: undefined }) === JSON.stringify({ ...attendu, _type: undefined });
  console.log(`reglages : ${aJour ? 'déjà à jour' : 'crédit ajouté'}`);
  if (essai || aJour) return;
  await client.patch('reglages').ifRevisionId(reglages._rev).set({ credit: CREDIT }).commit();
  console.log(`Écrit dans ${projectId}/${dataset}.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/migrations/2026-11-20-credit.ts')) {
  await main();
}
