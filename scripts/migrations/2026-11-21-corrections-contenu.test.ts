import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrer, TEXTE_SSO, TRANSFORMATIONS, URL_PRIX_LEANPAY } from './2026-11-21-corrections-contenu';

const contenu = JSON.parse(readFileSync(join(process.cwd(), 'content', 'pages.json'), 'utf8'));
const page = (id: string) => contenu.pages.find((p: { _id: string }) => p._id === id);
const cartes = () =>
  page('page-produit').sections.find((s: any) => s._type === 'sectionIntegrations' && s.variante === 'cartes').elements;

describe('corrections de contenu du 21 novembre 2026', () => {
  it('sont déjà appliquées au contenu local et ne changent plus rien si on les relance', () => {
    for (const id of Object.keys(TRANSFORMATIONS)) expect(migrer(page(id))).toEqual(page(id));
  });

  it('formule Équipe à 545 €, source La Fabrique du Net datée du relevé', () => {
    const tarifs = page('page-tarifs').sections.find((s: { _type: string }) => s._type === 'sectionTarifs');
    expect(tarifs.formules.find((f: any) => f.nom === 'Équipe').prix.valeur).toBe('545 €');
    expect(tarifs.source[0].markDefs[0].href).toBe(URL_PRIX_LEANPAY);
    const phrase = tarifs.source[0].children.map((c: { text: string }) => c.text).join('');
    expect(phrase).toContain('La Fabrique du Net');
    expect(phrase).toContain('28 septembre 2026');
    expect(JSON.stringify(contenu)).not.toContain('logiciels.pro');
  });

  it('cartes Droits par rôle et SSO', () => {
    const droits = cartes().find((e: any) => e.titre === 'Droits par rôle');
    expect(droits.texte).toContain('consultation seule');
    const sso = cartes().find((e: any) => e.titre === 'SSO');
    expect(sso.texte).toBe(TEXTE_SSO);
    expect(sso.precision).toBeUndefined();
    expect(JSON.stringify(contenu)).not.toMatch(/retirés automatiquement/);
  });

  it('principe de l’IA dans la section langage naturel', () => {
    const nl = page('page-produit').sections.find((s: any) => s.ancre === 'langage-naturel');
    expect(nl.texte).toContain("L'IA traduit uniquement votre phrase en règle, elle ne décide jamais");
    expect(JSON.stringify(contenu)).not.toContain('aide à rédiger');
  });
});
