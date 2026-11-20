import { describe, expect, it } from 'vitest';
import { altPartage, imagePartage, titrePage, tokensProduit } from './partage';
import type { Page } from './types';

const page = (titre: string) => ({ slug: 'essai', titre: 'Essai', sections: [{ _type: 'sectionHero', titre }] }) as unknown as Page;

describe('images de partage', () => {
  it('lit les couleurs du thème produit dans tokens.css, var() résolus', () => {
    const t = tokensProduit();
    expect(t['--color-bg-page']).toBe('#121516');
    expect(t['--color-text-primary']).toBe('#F3F4F4');
    expect(t['--color-text-secondary']).toBe('#A0A7AA');
  });

  it('prend le titre H1 de la page, et le texte alternatif le reprend avec le badge', () => {
    const p = page('Trois formules, selon votre chiffre d’affaires.');
    expect(titrePage(p)).toBe('Trois formules, selon votre chiffre d’affaires.');
    expect(altPartage(p)).toBe('Seuil : Trois formules, selon votre chiffre d’affaires. Données fictives.');
  });

  it('refuse une page sans titre plutôt que de produire une image vide', () => {
    expect(() => titrePage({ slug: 'vide', sections: [] } as unknown as Page)).toThrow(/titre/);
  });

  it('produit un PNG de 1200 × 630', async () => {
    const png = await imagePartage(page('Cette commande passe-t-elle ? Vous le savez avant de raccrocher.'));
    expect(png.toString('ascii', 1, 4)).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
});
