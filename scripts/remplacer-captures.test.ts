import { describe, expect, it } from 'vitest';
import {
  DIMENSIONS_ECRAN,
  dimensionsPng,
  proportionsCrop,
  recadrageMobile,
  remplacerRecadrages,
  remplacerRecadragesLocaux,
  repointer,
} from './remplacer-captures';

/** En-tête PNG minimal : signature, puis bloc IHDR avec largeur et hauteur. */
const entetePng = (largeur: number, hauteur: number) => {
  const t = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(t, 0);
  t.write('IHDR', 12, 'ascii');
  t.writeUInt32BE(largeur, 16);
  t.writeUInt32BE(hauteur, 20);
  return t;
};

const ANCIEN = 'image-ancien-1440x1000-png';
const crop = { top: 0.1939, bottom: 0.4061, left: 0.6885, right: 0.0117 };
const sections = () => [
  {
    _type: 'sectionFonctionnalite',
    capture: { _type: 'imageCommentee', alt: 'Fiche', asset: { _type: 'reference', _ref: ANCIEN } },
    captureMobile: { _type: 'imageCommentee', alt: 'Panneau', crop, hotspot: { x: 0.5 }, asset: { _type: 'reference', _ref: ANCIEN } },
  },
  { _type: 'sectionHero', captureMobile: { _type: 'imageCommentee', alt: 'Téléphone', asset: { _type: 'reference', _ref: 'image-tel' } } },
];

describe('remplacement des captures haute densité', () => {
  it('lit les dimensions dans l’en-tête PNG', () => {
    expect(dimensionsPng(entetePng(2880, 2000))).toEqual({ largeur: 2880, hauteur: 2000 });
  });

  it('refuse un fichier qui n’est pas un PNG', () => {
    expect(() => dimensionsPng(Buffer.from('pas une image, juste du texte'))).toThrow(/PNG/);
  });

  it('nomme le recadrage mobile d’après l’écran', () => {
    expect(recadrageMobile('App-Fiche-client.png')).toBe('App-Fiche-client-recadrage-mobile.png');
  });

  it('calcule les proportions de la zone recadrée (fiche client : 1296 × 1200 exporté)', () => {
    expect(proportionsCrop(DIMENSIONS_ECRAN, crop)).toBeCloseTo(1296 / 1200, 2);
  });

  it('repointe les références vers les nouveaux assets et garde le recadrage', () => {
    const avant = sections();
    const { valeur, remplacements } = repointer(avant, { [ANCIEN]: 'image-nouveau-2880x2000-png' });
    expect(remplacements).toBe(2);
    expect(JSON.stringify(valeur)).not.toContain('image-ancien');
    expect((valeur[0] as any).captureMobile.crop).toEqual(crop);
    expect(avant[0].capture?.asset._ref).toBe(ANCIEN);
  });

  it('remplace un recadrage Sanity par le recadrage exporté, sans crop ni hotspot, alt gardé', () => {
    const { valeur, remplacements } = remplacerRecadrages(sections(), { [ANCIEN]: 'image-recadrage-1296x1200-png' });
    expect(remplacements).toBe(1);
    const mobile = (valeur[0] as any).captureMobile;
    expect(mobile).toEqual({ _type: 'imageCommentee', alt: 'Panneau', asset: { _type: 'reference', _ref: 'image-recadrage-1296x1200-png' } });
    expect((valeur[0] as any).capture.asset._ref).toBe(ANCIEN); // l'écran desktop est repointé à l'étape suivante
    expect((valeur[1] as any).captureMobile.asset._ref).toBe('image-tel'); // sans crop : intact
  });

  it('fait de même dans le contenu local, désigné par nom de fichier', () => {
    const local = { pages: [{ captureMobile: { fichier: 'App-Fiche-client.png', crop } }, { captureMobile: { fichier: 'App-Mobile-commande.png' } }] };
    expect(remplacerRecadragesLocaux(local)).toEqual({
      pages: [{ captureMobile: { fichier: 'App-Fiche-client-recadrage-mobile.png' } }, { captureMobile: { fichier: 'App-Mobile-commande.png' } }],
    });
  });
});
