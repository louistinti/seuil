// Transforme content/pages.json en documents Sanity : clés de tableau, références d'images.
// Fonctions pures, testées par Vitest (scripts/preparer-contenu.test.ts).

export interface ImageLocale {
  _type: 'imageCommentee';
  fichier: string;
  crop?: Record<string, unknown>;
  hotspot?: Record<string, unknown>;
}

export interface ContenuLocal {
  reglages: Record<string, unknown>;
  pages: Record<string, unknown>[];
  captures: Record<string, string>;
}

/** Clé stable et lisible, unique dans son tableau. */
function cle(chemin: string): string {
  let h = 0;
  for (const c of chemin) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h.toString(36).padStart(7, '0').slice(0, 12);
}

/** Ajoute un `_key` à chaque objet d'un tableau, à toutes les profondeurs. */
export function ajouterCles(valeur: unknown, chemin = ''): unknown {
  if (Array.isArray(valeur)) {
    return valeur.map((v, i) => {
      const enfant = ajouterCles(v, `${chemin}[${i}]`);
      return enfant && typeof enfant === 'object' && !Array.isArray(enfant) ? { _key: cle(`${chemin}[${i}]`), ...enfant } : enfant;
    });
  }
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, ajouterCles(v, `${chemin}.${k}`)]));
  }
  return valeur;
}

/** Remplace chaque image locale ({ fichier }) par une image Sanity qui référence l'asset envoyé. */
export function remplacerImages(valeur: unknown, assets: Record<string, string>, alts: Record<string, string>): unknown {
  if (Array.isArray(valeur)) return valeur.map((v) => remplacerImages(v, assets, alts));
  if (valeur && typeof valeur === 'object') {
    const objet = valeur as Record<string, unknown>;
    if (typeof objet.fichier === 'string') {
      const { fichier, ...reste } = objet as unknown as ImageLocale & Record<string, unknown>;
      const ref = assets[fichier];
      if (!ref) throw new Error(`Asset manquant pour ${fichier}`);
      return { ...reste, _type: 'imageCommentee', asset: { _type: 'reference', _ref: ref }, alt: alts[fichier] ?? '' };
    }
    return Object.fromEntries(Object.entries(objet).map(([k, v]) => [k, remplacerImages(v, assets, alts)]));
  }
  return valeur;
}

/** Liste des fichiers de capture utilisés par le contenu. */
export function fichiersUtilises(contenu: ContenuLocal): string[] {
  const trouves = new Set<string>();
  const parcourir = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(parcourir);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.fichier === 'string') trouves.add(o.fichier);
      Object.values(o).forEach(parcourir);
    }
  };
  parcourir(contenu.pages);
  return [...trouves].sort();
}

/** Documents prêts pour createOrReplace. */
export function documents(contenu: ContenuLocal, assets: Record<string, string>) {
  const docs = [contenu.reglages, ...contenu.pages];
  return docs.map((d) => ajouterCles(remplacerImages(d, assets, contenu.captures)) as Record<string, unknown> & { _id: string; _type: string });
}
