// Migration du 21 novembre 2026 : corrections de contenu.
//   Tarifs : formule Équipe à 545 €, source La Fabrique du Net (relevé du 28 septembre 2026).
//   Produit : « consultation seule » sur la carte Droits par rôle, texte de la carte SSO,
//   principe de l'IA dans la section « Écrire une règle en langage naturel ».
//
// Usage :
//   npm run migration:corrections -- --essai   montre ce qui changerait dans Sanity, sans rien écrire
//   npm run migration:corrections              écrit dans Sanity (documents publiés), le webhook relance le site
//   npm run migration:corrections -- --local   applique la même transformation à content/pages.json
//
// Transformation pure et idempotente. Elle échoue si une section ou une carte attendue manque.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// LeanPay ne publie pas ses montants sur leanpay.io/tarifs (tarif personnalisé, sur démo, vérifié le 21/11/2026).
// Montants du comparateur La Fabrique du Net, consulté le 21/11/2026 : « L'offre PME (chiffre d'affaires inférieur
// à 15 M€) est à 245 € par mois en paiement mensuel […] ; PME+ à 545 € par mois […] (prix relevés le 28 septembre 2026). »
export const URL_PRIX_LEANPAY = 'https://www.lafabriquedunet.fr/logiciel/leanpay';
export const URL_INSEE_PME = 'https://www.insee.fr/fr/metadonnees/definition/c1962';

export const SOURCE_TARIFS = [
  {
    _key: 'source-tarifs',
    _type: 'block',
    style: 'normal',
    markDefs: [
      { _key: 'lien-prix', _type: 'link', href: URL_PRIX_LEANPAY },
      { _key: 'lien-insee', _type: 'link', href: URL_INSEE_PME },
    ],
    children: [
      {
        _key: 's1',
        _type: 'span',
        marks: [],
        text: 'Prix de démonstration calés sur ceux de LeanPay, logiciel de relance et de recouvrement (formules PME sous 15 M€ et PME+, en paiement mensuel), publiés par le ',
      },
      { _key: 's2', _type: 'span', marks: ['lien-prix'], text: 'comparateur La Fabrique du Net' },
      { _key: 's3', _type: 'span', marks: [], text: ' et relevés le 28 septembre 2026. Seuil de 50 M€ : ' },
      { _key: 's4', _type: 'span', marks: ['lien-insee'], text: "définition de la PME par l'INSEE" },
      { _key: 's5', _type: 'span', marks: [], text: '.' },
    ],
  },
];

export const TEXTE_SSO = "Connexion par le fournisseur d'identité de l'entreprise, en SAML 2.0 ou OpenID Connect.";
export const PRINCIPE_AVANT = "L'IA aide à rédiger";
export const PRINCIPE_APRES = "L'IA traduit uniquement votre phrase en règle";

type Doc = { _id: string; _rev?: string; sections: any[] } & Record<string, any>;

const section = (doc: Doc, trouver: (s: any) => boolean, nom: string) => {
  const s = doc.sections.find(trouver);
  if (!s) throw new Error(`${doc._id} : section ${nom} introuvable`);
  return s;
};
const element = <T extends Record<string, any>>(liste: T[] | undefined, cle: string, valeur: string) => {
  const e = liste?.find((x) => x[cle] === valeur);
  if (!e) throw new Error(`élément « ${valeur} » introuvable`);
  return e;
};

function tarifs(doc: Doc) {
  const t = section(doc, (s) => s._type === 'sectionTarifs', 'sectionTarifs');
  element(t.formules, 'nom', 'Équipe').prix = { _type: 'valeurOuEmplacement', valeur: '545 €' };
  t.source = SOURCE_TARIFS;
}

function produit(doc: Doc) {
  const dsi = section(doc, (s) => s._type === 'sectionIntegrations' && s.variante === 'cartes', 'cartes DSI');
  const droits = element(dsi.elements, 'titre', 'Droits par rôle');
  droits.texte = droits.texte.replace('lecture seule', 'consultation seule');
  const sso = element(dsi.elements, 'titre', 'SSO');
  sso.texte = TEXTE_SSO;
  delete sso.precision; // SAML 2.0 et OpenID Connect sont désormais dans le texte

  const nl = section(doc, (s) => s.ancre === 'langage-naturel', '« langage-naturel »');
  nl.texte = nl.texte.replace(PRINCIPE_AVANT, PRINCIPE_APRES);
}

export const TRANSFORMATIONS: Record<string, (doc: Doc) => void> = {
  'page-tarifs': tarifs,
  'page-produit': produit,
};

export function migrer<T extends Doc>(doc: T): T {
  const transformer = TRANSFORMATIONS[doc._id];
  if (!transformer) throw new Error(`Aucune transformation pour ${doc._id}`);
  const copie = structuredClone(doc);
  transformer(copie);
  return copie;
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
    contenu.pages = contenu.pages.map((p: Doc) => (TRANSFORMATIONS[p._id] ? migrer(p) : p));
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

  const transaction = client.transaction();
  let changements = 0;
  for (const id of Object.keys(TRANSFORMATIONS)) {
    const actuel = await client.getDocument<Doc>(id);
    if (!actuel) throw new Error(`${id} absent de Sanity`);
    if (token && (await client.getDocument(`drafts.${id}`))) {
      throw new Error(`${id} a un brouillon non publié dans le Studio : publiez-le ou supprimez-le d'abord.`);
    }
    const migre = migrer(actuel);
    const aJour = JSON.stringify(trier(actuel.sections)) === JSON.stringify(trier(migre.sections));
    console.log(`${id} : ${aJour ? 'déjà à jour' : 'modifié'}`);
    if (!aJour) {
      changements++;
      transaction.patch(id, (p) => p.ifRevisionId(actuel._rev!).set({ sections: migre.sections }));
    }
  }
  if (essai || !changements) return;
  await transaction.commit();
  console.log(`Migration écrite dans ${projectId}/${dataset}.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/migrations/2026-11-21-corrections-contenu.ts')) {
  await main();
}
