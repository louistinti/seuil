// Migration du 20 novembre 2026 (audit, lot 1) : tarifs au chiffre d'affaires, prix sourcés, faits internes.
//
// Usage :
//   npm run migration:lot1 -- --essai   montre ce qui changerait dans Sanity, sans rien écrire
//   npm run migration:lot1              écrit dans Sanity (documents publiés), le webhook relance le site
//   npm run migration:lot1 -- --local   applique la même transformation à content/pages.json
//
// La transformation est pure et idempotente : relancée, elle ne change plus rien.
// Elle échoue si une section ou une carte attendue manque, plutôt que de ne rien faire en silence.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// LeanPay ne publie pas ses prix sur son site (leanpay.io/tarifs : tarif sur mesure). Les montants viennent du
// comparateur logiciels.pro, page du 12/04/2026 consultée le 20/11/2026 : « Plan PME : […] 245 euros par mois
// (sans engagement) », « Plan PME + : […] 345 euros par mois (sans engagement) ».
export const URL_PRIX_LEANPAY = 'https://www.logiciels.pro/leanpay/';
export const URL_INSEE_PME = 'https://www.insee.fr/fr/metadonnees/definition/c1962';

type Doc = { _id: string; _rev?: string; description?: string; sections: any[] } & Record<string, any>;

const section = (doc: Doc, type: string) => {
  const s = doc.sections.find((x) => x._type === type);
  if (!s) throw new Error(`${doc._id} : section ${type} introuvable`);
  return s;
};
const element = <T extends Record<string, any>>(liste: T[], cle: string, valeur: string) => {
  const e = liste.find((x) => x[cle] === valeur);
  if (!e) throw new Error(`élément « ${valeur} » introuvable`);
  return e;
};
const sans = (o: Record<string, any>, ...cles: string[]) => {
  for (const c of cles) delete o[c];
  return o;
};

/** Ligne de source en Portable Text : une phrase, deux liens. Clés fixes pour rester idempotent. */
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
        text: 'Prix de démonstration calés sur ceux de LeanPay, logiciel de relance et de recouvrement (formules PME et PME+, sans engagement), publiés par le ',
      },
      { _key: 's2', _type: 'span', marks: ['lien-prix'], text: 'comparateur logiciels.pro' },
      { _key: 's3', _type: 'span', marks: [], text: ' et relevés en novembre 2026. Seuil de 50 M€ : ' },
      { _key: 's4', _type: 'span', marks: ['lien-insee'], text: "définition de la PME par l'INSEE" },
      { _key: 's5', _type: 'span', marks: [], text: '.' },
    ],
  },
];

const FORMULES: Record<string, { ca: string; prix: string; precisionPrix?: string }> = {
  Départ: { ca: 'moins de 15 M€', prix: '245 €', precisionPrix: 'HT par mois' },
  Équipe: { ca: 'de 15 à 50 M€', prix: '345 €', precisionPrix: 'HT par mois' },
  Groupe: { ca: 'plus de 50 M€', prix: 'Sur devis' },
};

function tarifs(doc: Doc) {
  doc.description =
    "Trois formules Seuil selon le chiffre d'affaires annuel, avec des prix de démonstration calés sur un tarif public.";

  const hero = section(doc, 'sectionHero');
  hero.titre = "Trois formules, selon votre chiffre d'affaires.";
  hero.texte =
    "Le prix dépend du chiffre d'affaires annuel de votre entreprise, pas du nombre d'utilisateurs. Les prix affichés sont des prix de démonstration, calés sur un tarif public.";

  const t = section(doc, 'sectionTarifs');
  for (const [nom, v] of Object.entries(FORMULES)) {
    const f = sans(element(t.formules, 'nom', nom), 'clientsActifs', 'precisionPrix');
    f.chiffreAffaires = { _type: 'valeurOuEmplacement', valeur: v.ca };
    f.prix = { _type: 'valeurOuEmplacement', valeur: v.prix };
    if (v.precisionPrix) f.precisionPrix = v.precisionPrix;
  }
  t.source = SOURCE_TARIFS;

  const faq = section(doc, 'sectionFaq');
  const calcul =
    faq.questions.find((q: any) => q.question === "Qu'est-ce qu'un client actif ?") ??
    element(faq.questions, 'question', 'Comment le prix est-il calculé ?');
  calcul.question = 'Comment le prix est-il calculé ?';
  calcul.reponse =
    "Selon le chiffre d'affaires annuel de votre entreprise. Le nombre d'utilisateurs et le nombre de clients suivis ne changent pas le prix.";
  const utilisateurs = faq.questions.find((q: any) => /^Le nombre d'utilisateurs change/.test(q.question));
  if (!utilisateurs) throw new Error('question « Le nombre d’utilisateurs… » introuvable');
  utilisateurs.reponse =
    "Non : les formules dépendent du chiffre d'affaires, pas du nombre de personnes qui utilisent Seuil.";
  element(faq.questions, 'question', "Peut-on changer de formule en cours d'année ?").reponse =
    'Oui. Vous passez à la formule supérieure à tout moment. Le passage à une formule inférieure se fait à la date anniversaire du contrat.';
}

function demo(doc: Doc) {
  const formulaire = section(doc, 'sectionAppelAction');
  sans(formulaire, 'delai').delaiReponse = 'Réponse sous 2 jours ouvrés.';
  sans(section(doc, 'sectionEtapes'), 'emplacement').precision = '45 minutes, en visio.';
}

function produit(doc: Doc) {
  const dsi = doc.sections.find((s) => s._type === 'sectionIntegrations' && s.variante === 'cartes');
  if (!dsi) throw new Error(`${doc._id} : cartes DSI introuvables`);
  const faits: Record<string, string> = {
    Hébergement: 'Données hébergées en France, sauvegardes dans un second centre de données en France.',
    SSO: 'Connexion par SAML 2.0 ou OpenID Connect.',
    Sécurité: 'Audit de sécurité annuel par un cabinet indépendant, rapport remis sur demande.',
  };
  for (const [titre, precision] of Object.entries(faits)) {
    sans(element(dsi.elements, 'titre', titre), 'emplacement').precision = precision;
  }
}

export const TRANSFORMATIONS: Record<string, (doc: Doc) => void> = {
  'page-tarifs': tarifs,
  'page-demo': demo,
  'page-produit': produit,
};

/** Applique la migration à une copie du document. */
export function migrer<T extends Doc>(doc: T): T {
  const copie = structuredClone(doc);
  const transformer = TRANSFORMATIONS[doc._id];
  if (!transformer) throw new Error(`Aucune transformation pour ${doc._id}`);
  transformer(copie);
  return copie;
}

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
  for (const id of Object.keys(TRANSFORMATIONS)) {
    const actuel = await client.getDocument<Doc>(id);
    if (!actuel) throw new Error(`${id} absent de Sanity`);
    const brouillon = await client.getDocument(`drafts.${id}`);
    if (brouillon) throw new Error(`${id} a un brouillon non publié dans le Studio : publiez-le ou supprimez-le d'abord.`);
    const migre = migrer(actuel);
    const avant = JSON.stringify({ d: actuel.description, s: actuel.sections });
    const apres = JSON.stringify({ d: migre.description, s: migre.sections });
    console.log(`${id} : ${avant === apres ? 'déjà à jour' : 'modifié'}`);
    if (avant !== apres) {
      transaction.patch(id, (p) => p.ifRevisionId(actuel._rev!).set({ description: migre.description, sections: migre.sections }));
    }
  }

  if (essai) {
    console.log('Essai : rien n’a été écrit.');
    return;
  }
  await transaction.commit();
  console.log(`Migration écrite dans ${projectId}/${dataset}.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/migrations/2026-11-20-tarifs-et-faits.ts')) {
  await main();
}
