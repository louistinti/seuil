// Migration du 22 novembre 2026 : image de partage de l'accueil (1200 × 630), fournie à la place de l'image générée.
// Les autres pages gardent l'image générée au build (/partage/<slug>.png).
//
// Usage :
//   npm run migration:partage-accueil -- --essai   vérifie le fichier et montre ce qui changerait, sans rien écrire
//   npm run migration:partage-accueil              envoie l'image dans Sanity et la rattache à page-accueil
//   npm run migration:partage-accueil -- --local   rattache content/captures/Partage-accueil.png dans content/pages.json
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FICHIER = 'Partage-accueil.png';
export const ALT =
  'Seuil : décidez des limites de crédit en quelques secondes. Une commande de 38 000 € de Menuiseries Valdorre est acceptée par la règle 2. Données fictives.';
const DIMENSIONS = { largeur: 1200, hauteur: 630 };

const chemin = join(process.cwd(), 'content', 'captures', FICHIER);

function verifier(tampon: Buffer) {
  if (tampon.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${FICHIER} n'est pas un PNG`);
  const largeur = tampon.readUInt32BE(16);
  const hauteur = tampon.readUInt32BE(20);
  if (largeur !== DIMENSIONS.largeur || hauteur !== DIMENSIONS.hauteur) {
    throw new Error(`${FICHIER} : ${largeur} × ${hauteur}, attendu ${DIMENSIONS.largeur} × ${DIMENSIONS.hauteur}`);
  }
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const essai = arguments_.includes('--essai');
  const tampon = readFileSync(chemin);
  verifier(tampon);

  if (arguments_.includes('--local')) {
    const fichier = join(process.cwd(), 'content', 'pages.json');
    const contenu = JSON.parse(readFileSync(fichier, 'utf8'));
    const accueil = contenu.pages.find((p: { _id: string }) => p._id === 'page-accueil');
    if (!accueil) throw new Error('page-accueil absente de content/pages.json');
    accueil.imagePartage = { fichier: FICHIER };
    contenu.captures[FICHIER] = ALT;
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
  const actuel = await client.getDocument<{ _rev: string; imagePartage?: { alt?: string; asset?: { _ref: string } } }>('page-accueil');
  if (!actuel) throw new Error('page-accueil absente de Sanity');
  if (token && (await client.getDocument('drafts.page-accueil'))) throw new Error('page-accueil a un brouillon non publié : publiez-le ou supprimez-le d’abord.');

  const existant = actuel.imagePartage?.asset?._ref
    ? await client.fetch<string | null>('*[_id == $id][0].originalFilename', { id: actuel.imagePartage.asset._ref })
    : null;
  const aJour = existant === FICHIER && actuel.imagePartage?.alt === ALT;
  console.log(`page-accueil : ${aJour ? 'déjà à jour' : 'modifié'}`);
  if (essai || aJour) return;

  const asset = await client.assets.upload('image', tampon, { filename: FICHIER });
  await client
    .patch('page-accueil')
    .ifRevisionId(actuel._rev)
    .set({ imagePartage: { _type: 'imageCommentee', alt: ALT, asset: { _type: 'reference', _ref: asset._id } } })
    .commit();
  console.log(`Image envoyée (${asset._id}) et rattachée à page-accueil dans ${projectId}/${dataset}.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/migrations/2026-11-22-image-partage-accueil.ts')) {
  await main();
}
