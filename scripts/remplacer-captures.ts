// Remplace les captures produit par leurs exports haute densité :
//   - les trois écrans en 2880 × 2000 (App-Editeur-regles, App-Fiche-client, App-File-exceptions) ;
//   - leurs recadrages mobiles, exportés à part en 3x (<nom>-recadrage-mobile.png), qui remplacent le recadrage
//     Sanity (crop) de l'écran desktop : l'image mobile devient un fichier à part entière, sans crop ;
//   - la vue téléphone en 3x (App-Mobile-commande.png, 1170 × 2532).
//
// Usage :
//   npm run captures:hd -- <dossier> --essai   vérifie les fichiers et montre ce qui changerait, sans rien écrire
//   npm run captures:hd -- <dossier>           envoie les images dans Sanity, repointe les pages, met à jour content/
//
// Les anciens assets restent dans la médiathèque Sanity (rien n'est supprimé).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Dimensions = { largeur: number; hauteur: number };

export const ECRANS = ['App-Editeur-regles.png', 'App-Fiche-client.png', 'App-File-exceptions.png'];
export const TELEPHONE = 'App-Mobile-commande.png';
export const recadrageMobile = (ecran: string) => ecran.replace(/\.png$/, '-recadrage-mobile.png');
export const DIMENSIONS_ECRAN: Dimensions = { largeur: 2880, hauteur: 2000 };
export const DIMENSIONS_TELEPHONE: Dimensions = { largeur: 1170, hauteur: 2532 };

/** Largeur et hauteur lues dans l'en-tête PNG (bloc IHDR). */
export function dimensionsPng(tampon: Buffer): Dimensions {
  if (tampon.toString('ascii', 1, 4) !== 'PNG') throw new Error('ce fichier n’est pas un PNG');
  return { largeur: tampon.readUInt32BE(16), hauteur: tampon.readUInt32BE(20) };
}

type Crop = { top: number; bottom: number; left: number; right: number };

/** Proportions (largeur / hauteur) de la zone recadrée d'une image. */
export const proportionsCrop = (image: Dimensions, crop: Crop) =>
  (image.largeur * (1 - crop.left - crop.right)) / (image.hauteur * (1 - crop.top - crop.bottom));

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

/**
 * Copie profonde où chaque `captureMobile` recadrée dans un écran desktop (ancien asset + crop) pointe vers
 * le recadrage exporté à part : nouvel asset, crop et hotspot retirés. Le texte alternatif est gardé.
 */
export function remplacerRecadrages<T>(valeur: T, recadrages: Record<string, string>): { valeur: T; remplacements: number } {
  let remplacements = 0;
  const parcourir = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(parcourir);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v).map(([cle, x]) => {
          const image = x as { asset?: { _ref?: string }; crop?: unknown } | null;
          const nouveau = image?.asset?._ref ? recadrages[image.asset._ref] : undefined;
          if (cle === 'captureMobile' && nouveau && image?.crop) {
            remplacements++;
            const { crop, hotspot, ...reste } = image as Record<string, any>;
            return [cle, { ...reste, asset: { ...reste.asset, _ref: nouveau } }];
          }
          return [cle, parcourir(x)];
        }),
      );
    }
    return v;
  };
  return { valeur: parcourir(valeur) as T, remplacements };
}

/** Même transformation pour content/pages.json, où les images sont désignées par leur nom de fichier. */
export function remplacerRecadragesLocaux<T>(valeur: T): T {
  const parcourir = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(parcourir);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v).map(([cle, x]) => {
          const image = x as { fichier?: string; crop?: unknown } | null;
          if (cle === 'captureMobile' && image?.crop && image.fichier && ECRANS.includes(image.fichier)) {
            const { crop, hotspot, ...reste } = image as Record<string, any>;
            return [cle, { ...reste, fichier: recadrageMobile(image.fichier) }];
          }
          return [cle, parcourir(x)];
        }),
      );
    }
    return v;
  };
  return parcourir(valeur) as T;
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const essai = arguments_.includes('--essai');
  const dossier = arguments_.find((a) => !a.startsWith('--'));
  if (!dossier) {
    console.error('Indiquez le dossier des exports : npm run captures:hd -- <dossier> [--essai]');
    process.exit(1);
  }

  // 1. Les fichiers : présents, PNG, aux dimensions attendues (les recadrages sont vérifiés à l'étape 2).
  const attendus: Record<string, Dimensions | null> = { [TELEPHONE]: DIMENSIONS_TELEPHONE };
  for (const e of ECRANS) Object.assign(attendus, { [e]: DIMENSIONS_ECRAN, [recadrageMobile(e)]: null });
  const erreurs: string[] = [];
  const tampons: Record<string, Buffer> = {};
  const dimensions: Record<string, Dimensions> = {};
  for (const [nom, attendu] of Object.entries(attendus)) {
    const chemin = join(resolve(dossier), nom);
    if (!existsSync(chemin)) {
      erreurs.push(`${nom} : absent du dossier`);
      continue;
    }
    tampons[nom] = readFileSync(chemin);
    dimensions[nom] = dimensionsPng(tampons[nom]);
    const { largeur, hauteur } = dimensions[nom];
    if (attendu && (largeur !== attendu.largeur || hauteur !== attendu.hauteur)) {
      erreurs.push(`${nom} : ${largeur} × ${hauteur}, attendu ${attendu.largeur} × ${attendu.hauteur}`);
    }
  }
  if (erreurs.length) {
    console.error(`Exports refusés :\n  ${erreurs.join('\n  ')}`);
    process.exit(1);
  }

  // 2. Chaque recadrage exporté doit couvrir la même zone que le recadrage actuel (mêmes proportions, à 1 % près).
  const pages = JSON.parse(readFileSync(join(process.cwd(), 'content', 'pages.json'), 'utf8'));
  const cropsActuels: Record<string, Crop> = {};
  const relever = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(relever);
    if (v && typeof v === 'object') {
      const m = (v as any).captureMobile;
      if (m?.crop && ECRANS.includes(m.fichier)) cropsActuels[m.fichier] = m.crop;
      Object.values(v).forEach(relever);
    }
  };
  relever(pages);
  for (const e of ECRANS) {
    const crop = cropsActuels[e];
    if (!crop) continue; // déjà remplacé lors d'un passage précédent
    const voulu = proportionsCrop(DIMENSIONS_ECRAN, crop);
    const d = dimensions[recadrageMobile(e)];
    const recu = d.largeur / d.hauteur;
    if (Math.abs(recu / voulu - 1) > 0.01) erreurs.push(`${recadrageMobile(e)} : proportions ${recu.toFixed(3)}, attendu ${voulu.toFixed(3)}`);
  }
  if (erreurs.length) {
    console.error(`Recadrages refusés :\n  ${erreurs.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Exports vérifiés : ${Object.keys(attendus).length} PNG.`);

  const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset = 'production', SANITY_WRITE_TOKEN: token } = process.env;
  if (!projectId || !token) {
    console.error('Il manque SANITY_PROJECT_ID ou SANITY_WRITE_TOKEN (jeton « Editor », dans .env).');
    process.exit(1);
  }
  const { createClient } = await import('@sanity/client');
  const client = createClient({ projectId, dataset, token, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw' });

  // 3. Les assets actuels, retrouvés par leur nom de fichier d'origine (celui du seed).
  const remplaces = [...ECRANS, TELEPHONE];
  const actuels = await client.fetch<{ _id: string; originalFilename: string }[]>(
    '*[_type == "sanity.imageAsset" && originalFilename in $noms]{_id, originalFilename}',
    { noms: remplaces },
  );
  for (const nom of remplaces) {
    if (!actuels.some((a) => a.originalFilename === nom)) throw new Error(`Aucun asset « ${nom} » dans Sanity : lancez d'abord npm run seed.`);
  }

  // 4. Les documents qui les utilisent. Un brouillon en cours bloquerait : on préfère s'arrêter.
  const ids = actuels.map((a) => a._id);
  const documentsLies = await client.fetch<{ _id: string; _rev: string; sections?: unknown[] }[]>('*[references($ids)]{_id, _rev, sections}', { ids });
  const brouillons = documentsLies.filter((d) => d._id.startsWith('drafts.'));
  if (brouillons.length) throw new Error(`Brouillons non publiés : ${brouillons.map((d) => d._id).join(', ')}. Publiez-les ou supprimez-les dans le Studio.`);
  console.log(`Pages concernées : ${documentsLies.map((d) => d._id).join(', ')}.`);

  if (essai) {
    console.log('Essai : rien n’a été envoyé ni modifié.');
    return;
  }

  // 5. Envoi des nouvelles images, puis repointage des pages en une transaction :
  //    d'abord les recadrages mobiles (ancien écran + crop → recadrage exporté), puis le reste (ancien → nouveau).
  const nouveaux: Record<string, string> = {};
  for (const nom of Object.keys(attendus)) {
    nouveaux[nom] = (await client.assets.upload('image', tampons[nom], { filename: nom }))._id;
    console.log(`Envoyé : ${nom} → ${nouveaux[nom]}`);
  }
  const correspondances: Record<string, string> = {};
  const recadrages: Record<string, string> = {};
  for (const a of actuels) {
    if (a._id === nouveaux[a.originalFilename]) continue;
    correspondances[a._id] = nouveaux[a.originalFilename];
    if (ECRANS.includes(a.originalFilename)) recadrages[a._id] = nouveaux[recadrageMobile(a.originalFilename)];
  }
  const transaction = client.transaction();
  for (const doc of documentsLies) {
    const mobiles = remplacerRecadrages(doc.sections ?? [], recadrages);
    const { valeur, remplacements } = repointer(mobiles.valeur, correspondances);
    if (mobiles.remplacements + remplacements) transaction.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({ sections: valeur }));
    console.log(`${doc._id} : ${mobiles.remplacements} recadrage(s) mobile(s), ${remplacements} capture(s) repointée(s)`);
  }
  await transaction.commit();

  // 6. Le contenu local (repli et seed) suit : fichiers, recadrages mobiles et textes alternatifs.
  for (const nom of Object.keys(attendus)) copyFileSync(join(resolve(dossier), nom), join(process.cwd(), 'content', 'captures', nom));
  const local = remplacerRecadragesLocaux(pages);
  for (const e of ECRANS) local.captures[recadrageMobile(e)] ??= local.captures[e];
  writeFileSync(join(process.cwd(), 'content', 'pages.json'), `${JSON.stringify(local, null, 2)}\n`);
  console.log('content/captures et content/pages.json mis à jour. Le webhook relance le site.');
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/remplacer-captures.ts')) {
  await main();
}
