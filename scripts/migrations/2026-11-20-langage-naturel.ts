// Migration du 20 novembre 2026 : section « Écrire une règle en langage naturel » sur la page Produit
// (export Claude Design seuil-export-v2_1), pastille dans le hero, « lecture seule » sur la carte Droits par rôle.
//
// Usage :
//   npm run migration:langage-naturel -- --essai   montre ce qui changerait dans Sanity, sans rien écrire
//   npm run migration:langage-naturel              écrit dans Sanity (document publié), le webhook relance le site
//   npm run migration:langage-naturel -- --local   applique la même transformation à content/pages.json
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Doc = { _id: string; _rev?: string; sections: any[] } & Record<string, any>;

export const SECTION = {
  _type: 'sectionFonctionnalite',
  _key: 'langage-naturel',
  ancre: 'langage-naturel',
  surtitre: 'Moteur de règles',
  titre: 'Écrire une règle en langage naturel.',
  texte:
    "Écrivez la règle comme vous la diriez. Seuil la traduit en blocs, les mêmes que ceux de l'éditeur de règles, et vous corrigez chaque bloc. L'IA aide à rédiger, elle ne décide jamais : la règle est testée, puis publiée après validation de la direction financière.",
  coches: ["Les mêmes blocs que l'éditeur de règles", 'Une question quand la phrase est ambiguë', 'Aucune publication sans validation'],
  visuel: 'langage-naturel',
};
export const PASTILLE = { _type: 'lien', _key: 'lien-langage-naturel', libelle: 'Langage naturel', href: '#langage-naturel' };

/** Transformation pure et idempotente. Échoue si un repère attendu manque. */
export function migrer<T extends Doc>(doc: T): T {
  if (doc._id !== 'page-produit') throw new Error(`Aucune transformation pour ${doc._id}`);
  const d = structuredClone(doc);

  const regles = d.sections.findIndex((s) => s.ancre === 'regles');
  if (regles < 0) throw new Error('page-produit : section « regles » introuvable');
  const existante = d.sections.findIndex((s) => s.ancre === 'langage-naturel');
  if (existante >= 0) d.sections.splice(existante, 1);
  d.sections.splice(d.sections.findIndex((s) => s.ancre === 'regles') + 1, 0, SECTION);

  const hero = d.sections.find((s) => s._type === 'sectionHero');
  if (!hero?.sousNavigation) throw new Error('page-produit : sous-navigation du hero introuvable');
  hero.sousNavigation = hero.sousNavigation.filter((l: { href: string }) => l.href !== PASTILLE.href);
  const apres = hero.sousNavigation.findIndex((l: { href: string }) => l.href === '#regles');
  if (apres < 0) throw new Error('page-produit : lien « Règles » introuvable dans le hero');
  hero.sousNavigation.splice(apres + 1, 0, PASTILLE);

  const dsi = d.sections.find((s) => s._type === 'sectionIntegrations' && s.variante === 'cartes');
  const droits = dsi?.elements?.find((e: { titre: string }) => e.titre === 'Droits par rôle');
  if (!droits) throw new Error('page-produit : carte « Droits par rôle » introuvable');
  droits.texte = droits.texte.replace('consultation seule', 'lecture seule');

  return d;
}

const trier = (o: unknown): unknown =>
  Array.isArray(o)
    ? o.map(trier)
    : o && typeof o === 'object'
      ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, trier((o as Record<string, unknown>)[k])]))
      : o;

async function main() {
  const arguments_ = process.argv.slice(2);
  const essai = arguments_.includes('--essai');

  if (arguments_.includes('--local')) {
    const fichier = join(process.cwd(), 'content', 'pages.json');
    const contenu = JSON.parse(readFileSync(fichier, 'utf8'));
    contenu.pages = contenu.pages.map((p: Doc) => (p._id === 'page-produit' ? migrer(p) : p));
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
  const actuel = await client.getDocument<Doc>('page-produit');
  if (!actuel) throw new Error('page-produit absent de Sanity');
  if (token && (await client.getDocument('drafts.page-produit'))) throw new Error('page-produit a un brouillon non publié : publiez-le ou supprimez-le d’abord.');
  const migre = migrer(actuel);
  const aJour = JSON.stringify(trier(actuel.sections)) === JSON.stringify(trier(migre.sections));
  console.log(`page-produit : ${aJour ? 'déjà à jour' : 'modifié'}`);
  if (essai || aJour) return;
  await client.patch('page-produit').ifRevisionId(actuel._rev!).set({ sections: migre.sections }).commit();
  console.log(`Migration écrite dans ${projectId}/${dataset}.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/migrations/2026-11-20-langage-naturel.ts')) {
  await main();
}
