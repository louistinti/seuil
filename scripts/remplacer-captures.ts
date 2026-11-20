// Remplace les trois captures produit (1440 × 1000) par leurs exports haute densité (2880 × 2000).
//
// Usage :
//   npm run captures:hd -- <dossier> --essai   vérifie les fichiers et montre ce qui changerait, sans rien écrire
//   npm run captures:hd -- <dossier>           envoie les images dans Sanity, repointe les pages, met à jour content/captures
//
// Le dossier contient les exports sous les mêmes noms : App-Editeur-regles.png, App-Fiche-client.png, App-File-exceptions.png.
// Les recadrages mobiles sont stockés en fractions de l'image : ils restent justes, car les proportions ne changent pas.
// Les anciens assets restent dans la médiathèque Sanity (rien n'est supprimé).
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const CAPTURES_HD = ['App-Editeur-regles.png', 'App-Fiche-client.png', 'App-File-exceptions.png'];
export const DIMENSIONS_HD = { largeur: 2880, hauteur: 2000 };

/** Largeur et hauteur lues dans l'en-tête PNG (bloc IHDR). */
export function dimensionsPng(tampon: Buffer): { largeur: number; hauteur: number } {
  if (tampon.toString('ascii', 1, 4) !== 'PNG') throw new Error('ce fichier n’est pas un PNG');
  return { largeur: tampon.readUInt32BE(16), hauteur: tampon.readUInt32BE(20) };
}

/** Copie profonde où chaque référence `_ref` vers un ancien asset pointe vers le nouveau. Renvoie aussi le nombre de remplacements. */
export function repointer<T>(valeur: T, correspondances: Record<string, string>): { valeur: T; remplacements: number } {
  let remplacements = 0;
  const parcourir = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(parcourir);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v).map(([cle, x]) => {
          if (cle === '_ref' && typeof x === 'string' && correspondances[x]) {
            remplacements++;
            return [cle, correspondances[x]];
          }
          return [cle, parcourir(x)];
        }),
      );
    }
    return v;
  };
  return { valeur: parcourir(valeur) as T, remplacements };
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const essai = arguments_.includes('--essai');
  const dossier = arguments_.find((a) => !a.startsWith('--'));
  if (!dossier) {
    console.error('Indiquez le dossier des exports : npm run captures:hd -- <dossier> [--essai]');
    process.exit(1);
  }

  // 1. Les fichiers : présents, PNG, exactement 2880 × 2000.
  const erreurs: string[] = [];
  const tampons: Record<string, Buffer> = {};
  for (const nom of CAPTURES_HD) {
    const chemin = join(resolve(dossier), nom);
    if (!existsSync(chemin)) {
      erreurs.push(`${nom} : absent du dossier`);
      continue;
    }
    const tampon = readFileSync(chemin);
    const { largeur, hauteur } = dimensionsPng(tampon);
    if (largeur !== DIMENSIONS_HD.largeur || hauteur !== DIMENSIONS_HD.hauteur) {
      erreurs.push(`${nom} : ${largeur} × ${hauteur}, attendu ${DIMENSIONS_HD.largeur} × ${DIMENSIONS_HD.hauteur} (mêmes proportions, sinon les recadrages mobiles seraient faux)`);
    }
    tampons[nom] = tampon;
  }
  if (erreurs.length) {
    console.error(`Exports refusés :\n  ${erreurs.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Exports vérifiés : ${CAPTURES_HD.length} PNG en ${DIMENSIONS_HD.largeur} × ${DIMENSIONS_HD.hauteur}.`);

  const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset = 'production', SANITY_WRITE_TOKEN: token } = process.env;
  if (!projectId || !token) {
    console.error('Il manque SANITY_PROJECT_ID ou SANITY_WRITE_TOKEN (jeton « Editor », dans .env).');
    process.exit(1);
  }
  const { createClient } = await import('@sanity/client');
  const client = createClient({ projectId, dataset, token, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw' });

  // 2. Les assets actuels, retrouvés par leur nom de fichier d'origine (celui du seed).
  const actuels = await client.fetch<{ _id: string; originalFilename: string }[]>(
    '*[_type == "sanity.imageAsset" && originalFilename in $noms]{_id, originalFilename}',
    { noms: CAPTURES_HD },
  );
  for (const nom of CAPTURES_HD) {
    if (!actuels.some((a) => a.originalFilename === nom)) throw new Error(`Aucun asset « ${nom} » dans Sanity : lancez d'abord npm run seed.`);
  }

  // 3. Les documents qui les utilisent. Un brouillon en cours bloquerait : on préfère s'arrêter.
  const ids = actuels.map((a) => a._id);
  const documentsLies = await client.fetch<{ _id: string; _rev: string; sections?: unknown[] }[]>('*[references($ids)]{_id, _rev, sections}', { ids });
  const brouillons = documentsLies.filter((d) => d._id.startsWith('drafts.'));
  if (brouillons.length) throw new Error(`Brouillons non publiés : ${brouillons.map((d) => d._id).join(', ')}. Publiez-les ou supprimez-les dans le Studio.`);
  console.log(`Pages concernées : ${documentsLies.map((d) => d._id).join(', ')}.`);

  if (essai) {
    console.log('Essai : rien n’a été envoyé ni modifié.');
    return;
  }

  // 4. Envoi des nouvelles images, puis repointage des pages en une transaction.
  const correspondances: Record<string, string> = {};
  for (const nom of CAPTURES_HD) {
    const nouveau = await client.assets.upload('image', tampons[nom], { filename: nom });
    for (const ancien of actuels.filter((a) => a.originalFilename === nom && a._id !== nouveau._id)) correspondances[ancien._id] = nouveau._id;
    console.log(`Envoyé : ${nom} → ${nouveau._id}`);
  }
  const transaction = client.transaction();
  for (const doc of documentsLies) {
    const { valeur, remplacements } = repointer(doc.sections ?? [], correspondances);
    if (remplacements) transaction.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({ sections: valeur }));
    console.log(`${doc._id} : ${remplacements} capture(s) repointée(s)`);
  }
  await transaction.commit();

  // 5. Le contenu local (repli et seed) suit.
  for (const nom of CAPTURES_HD) copyFileSync(join(resolve(dossier), nom), join(process.cwd(), 'content', 'captures', nom));
  console.log('content/captures mis à jour. Le webhook relance le site.');
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/remplacer-captures.ts')) {
  await main();
}
