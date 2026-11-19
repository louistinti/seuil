import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { documents, fichiersUtilises, type ContenuLocal } from './preparer-contenu';

const contenu = JSON.parse(readFileSync(join(process.cwd(), 'content', 'pages.json'), 'utf8')) as ContenuLocal;
const faux = Object.fromEntries(fichiersUtilises(contenu).map((f) => [f, `image-${f}`]));
const docs = documents(contenu, faux);

function parcourir(v: unknown, visite: (o: Record<string, unknown>, dansTableau: boolean) => void, dansTableau = false) {
  if (Array.isArray(v)) v.forEach((e) => parcourir(e, visite, true));
  else if (v && typeof v === 'object') {
    visite(v as Record<string, unknown>, dansTableau);
    Object.values(v).forEach((e) => parcourir(e, visite));
  }
}

describe('contenu envoyé à Sanity', () => {
  it('les 6 pages et les réglages', () => {
    expect(docs.map((d) => d._id).sort()).toEqual(
      ['page-accueil', 'page-commerciaux', 'page-demo', 'page-finance', 'page-produit', 'page-tarifs', 'reglages'].sort(),
    );
  });

  it('chaque objet de tableau a une _key unique dans son tableau', () => {
    const verifier = (v: unknown) => {
      if (Array.isArray(v)) {
        const objets = v.filter((e) => e && typeof e === 'object');
        const cles = objets.map((e) => (e as { _key?: string })._key);
        expect(cles.every(Boolean)).toBe(true);
        expect(new Set(cles).size).toBe(cles.length);
        v.forEach(verifier);
      } else if (v && typeof v === 'object') Object.values(v).forEach(verifier);
    };
    docs.forEach(verifier);
  });

  it('chaque image référence un asset et a un texte alternatif', () => {
    let images = 0;
    for (const d of docs) {
      parcourir(d, (o) => {
        if (o._type === 'imageCommentee') {
          images++;
          expect(o.fichier).toBeUndefined();
          expect((o.asset as { _ref: string })._ref).toMatch(/^image-/);
          expect(String(o.alt).length).toBeGreaterThan(20);
        }
      });
    }
    expect(images).toBeGreaterThan(0);
  });

  it('aucun tiret cadratin dans les textes', () => {
    expect(JSON.stringify(contenu)).not.toContain('—');
  });

  it('la mention de fiction est intacte', () => {
    expect(contenu.reglages.mention).toBe('Seuil est une entreprise fictive, conçue comme démonstration.');
  });
});
