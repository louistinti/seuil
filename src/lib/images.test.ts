import { describe, expect, it } from 'vitest';
import { src, srcset, zoneRecadree } from './images';
import type { Image } from './types';

const capture = (largeur: number, hauteur: number, crop: Image['crop'] = null): Image => ({
  url: 'https://cdn.sanity.io/images/p/d/capture.png',
  largeur,
  hauteur,
  alt: 'Capture',
  crop,
  sanity: true,
});
const largeurs = (s?: string) => (s ?? '').split(', ').map((e) => Number(e.split(' ')[1].replace('w', '')));

describe('srcset des captures', () => {
  it('propose jusqu’à 2592 px (1296 px en 2x) quand l’export fait 2880 px', () => {
    expect(largeurs(srcset(capture(2880, 2000)))).toEqual([480, 768, 1080, 1296, 1440, 1944, 2160, 2592]);
  });

  it('ne propose jamais une largeur plus grande que l’image d’origine', () => {
    expect(largeurs(srcset(capture(1440, 1000)))).toEqual([480, 768, 1080, 1296, 1440]);
  });

  it('en local, sans CDN, ne propose pas de srcset', () => {
    expect(srcset({ ...capture(1440, 1000), sanity: false })).toBeUndefined();
  });
});

describe('variante mobile recadrée', () => {
  const crop = { top: 0.1, bottom: 0.4, left: 0.6, right: 0.1 };

  it('demande au CDN la seule zone recadrée, en pixels de l’image d’origine', () => {
    expect(zoneRecadree(capture(2880, 2000, crop))).toEqual({ x: 1728, y: 200, largeur: 864, hauteur: 1000 });
    expect(src(capture(2880, 2000, crop), 1080, true)).toBe('https://cdn.sanity.io/images/p/d/capture.png?rect=1728,200,864,1000&w=864&auto=format&q=80');
  });

  it('plafonne le srcset à la largeur de la zone recadrée', () => {
    const s = srcset(capture(2880, 2000, crop), true);
    expect(largeurs(s)).toEqual([480, 768, 864]);
    expect(s).toContain('rect=1728,200,864,1000');
  });
});
