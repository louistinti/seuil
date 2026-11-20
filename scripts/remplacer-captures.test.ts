import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dimensionsPng, repointer } from './remplacer-captures';

describe('remplacement des captures haute densité', () => {
  it('lit les dimensions dans l’en-tête PNG', () => {
    const tampon = readFileSync(join(process.cwd(), 'content', 'captures', 'App-Fiche-client.png'));
    expect(dimensionsPng(tampon)).toEqual({ largeur: 1440, hauteur: 1000 });
  });

  it('refuse un fichier qui n’est pas un PNG', () => {
    expect(() => dimensionsPng(Buffer.from('pas une image, juste du texte'))).toThrow(/PNG/);
  });

  it('repointe les références vers les nouveaux assets et garde le recadrage', () => {
    const sections = [
      {
        _type: 'sectionFonctionnalite',
        capture: { _type: 'imageCommentee', alt: 'Fiche', asset: { _type: 'reference', _ref: 'image-ancien-1440x1000-png' } },
        captureMobile: {
          _type: 'imageCommentee',
          alt: 'Panneau',
          crop: { top: 0.1, bottom: 0.4, left: 0.6, right: 0.1 },
          asset: { _type: 'reference', _ref: 'image-ancien-1440x1000-png' },
        },
      },
      { _type: 'sectionHero', titre: 'Sans capture' },
    ];
    const { valeur, remplacements } = repointer(sections, { 'image-ancien-1440x1000-png': 'image-nouveau-2880x2000-png' });
    expect(remplacements).toBe(2);
    expect(JSON.stringify(valeur)).not.toContain('image-ancien');
    expect((valeur[0] as any).captureMobile.crop).toEqual({ top: 0.1, bottom: 0.4, left: 0.6, right: 0.1 });
    expect(sections[0].capture?.asset._ref).toBe('image-ancien-1440x1000-png');
  });
});
