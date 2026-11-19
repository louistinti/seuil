// Remplit Sanity avec le contenu actuel du site (content/pages.json et content/captures/).
// Usage : npm run seed            (envoie)
//         npm run seed -- --essai (montre ce qui serait envoyé, sans rien écrire)
// Variables : SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN (jeton « Editor », dans .env).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@sanity/client';
import { documents, fichiersUtilises, type ContenuLocal } from './preparer-contenu.ts';

const racine = join(import.meta.dirname, '..');
const contenu = JSON.parse(readFileSync(join(racine, 'content', 'pages.json'), 'utf8')) as ContenuLocal;
const essai = process.argv.includes('--essai');
const fichiers = fichiersUtilises(contenu);

if (essai) {
  const faux = Object.fromEntries(fichiers.map((f) => [f, `image-essai-${f}`]));
  const docs = documents(contenu, faux);
  console.log(`Essai : ${docs.length} documents, ${fichiers.length} captures.`);
  for (const d of docs) console.log(`  ${d._type.padEnd(9)} ${d._id}`);
  process.exit(0);
}

const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset = 'production', SANITY_WRITE_TOKEN: token } = process.env;
if (!projectId || !token) {
  console.error('Il manque SANITY_PROJECT_ID ou SANITY_WRITE_TOKEN. Voir .env.example.');
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2025-02-19', useCdn: false });

// Sanity dédoublonne les assets par empreinte : relancer le script ne crée pas de copies.
const assets: Record<string, string> = {};
for (const fichier of fichiers) {
  const asset = await client.assets.upload('image', readFileSync(join(racine, 'content', 'captures', fichier)), { filename: fichier });
  assets[fichier] = asset._id;
  console.log(`Capture envoyée : ${fichier}`);
}

const transaction = client.transaction();
for (const doc of documents(contenu, assets)) transaction.createOrReplace(doc);
const resultat = await transaction.commit();
console.log(`${resultat.results.length} documents publiés dans ${projectId}/${dataset}.`);
