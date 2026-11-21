import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrer, TRANSFORMATIONS, URL_INSEE_PME } from './2026-11-20-tarifs-et-faits';
import { migrer as corriger, TRANSFORMATIONS as CORRECTIONS, URL_PRIX_LEANPAY } from './2026-11-21-corrections-contenu';

const contenu = JSON.parse(readFileSync(join(process.cwd(), 'content', 'pages.json'), 'utf8'));
const page = (id: string) => contenu.pages.find((p: { _id: string }) => p._id === id);
const texte = (o: unknown) => JSON.stringify(o);

describe('migration du 20 novembre 2026 (lot 1)', () => {
  it('est déjà appliquée au contenu local et ne change plus rien si on la relance (suivie des corrections du 21 novembre)', () => {
    const suite = (p: any) => (CORRECTIONS[p._id] ? corriger(migrer(p)) : migrer(p));
    for (const id of Object.keys(TRANSFORMATIONS)) expect(suite(page(id))).toEqual(page(id));
  });

  it('ne laisse aucune trace du critère « clients actifs »', () => {
    expect(texte(contenu)).not.toMatch(/clients? actifs?|clientsActifs/i);
  });

  it('remplit les formules au chiffre d’affaires, avec leur ligne de source et ses deux liens', () => {
    const tarifs = page('page-tarifs').sections.find((s: { _type: string }) => s._type === 'sectionTarifs');
    expect(tarifs.formules.map((f: any) => [f.nom, f.chiffreAffaires.valeur, f.prix.valeur, f.precisionPrix])).toEqual([
      ['Départ', 'moins de 15 M€', '245 €', 'HT par mois'],
      ['Équipe', 'de 15 à 50 M€', '545 €', 'HT par mois'],
      ['Groupe', 'plus de 50 M€', 'Sur devis', undefined],
    ]);
    expect(tarifs.source[0].markDefs.map((d: { href: string }) => d.href)).toEqual([URL_PRIX_LEANPAY, URL_INSEE_PME]);
  });

  it('remplace les emplacements des faits internes, et garde ceux qui attendent une vraie donnée', () => {
    expect(texte(page('page-demo'))).not.toContain('à préciser');
    expect(texte(page('page-produit'))).not.toContain('à préciser');
    expect(texte(page('page-tarifs'))).not.toContain('Modalités à préciser');
    const reste = texte(contenu);
    expect(reste).toContain('donnée sourcée à venir');
  });

  it('échoue au lieu de ne rien faire si une carte attendue a disparu', () => {
    const produit = structuredClone(page('page-produit'));
    produit.sections = produit.sections.map((s: any) =>
      s._type === 'sectionIntegrations' ? { ...s, elements: s.elements.filter((e: any) => e.titre !== 'SSO') } : s,
    );
    expect(() => migrer(produit)).toThrow(/SSO/);
  });

  it('ne contient aucun tiret cadratin', () => {
    expect(texte(contenu)).not.toContain('—');
  });
});
