import type { Image } from './types';

/**
 * Largeurs proposées au navigateur. 1296 et 2592 : la capture desktop affichée en 1296 px, en 1x et en 2x.
 * Seules les largeurs que l'image d'origine (ou son recadrage) atteint sont proposées : le CDN n'invente
 * pas de détail, une image agrandie resterait floue.
 */
const LARGEURS = [480, 768, 1080, 1296, 1440, 1944, 2160, 2592];

/** Zone recadrée en pixels de l'image d'origine (paramètre `rect` du CDN Sanity), ou null sans recadrage. */
export function zoneRecadree(image: Image): { x: number; y: number; largeur: number; hauteur: number } | null {
  const c = image.crop;
  if (!c) return null;
  return {
    x: Math.round(c.left * image.largeur),
    y: Math.round(c.top * image.hauteur),
    largeur: Math.round((1 - c.left - c.right) * image.largeur),
    hauteur: Math.round((1 - c.top - c.bottom) * image.hauteur),
  };
}

function url(image: Image, largeur: number, recadrer: boolean): string {
  const zone = recadrer ? zoneRecadree(image) : null;
  const rect = zone ? `rect=${zone.x},${zone.y},${zone.largeur},${zone.hauteur}&` : '';
  return `${image.url}?${rect}w=${largeur}&auto=format&q=80`;
}

/** Largeur maximale utile : celle de la zone recadrée, ou de l'image entière, plafonnée à 2592 px (1296 px en 2x). */
const largeurMax = (image: Image, recadrer: boolean) =>
  Math.min((recadrer && zoneRecadree(image)?.largeur) || image.largeur, LARGEURS[LARGEURS.length - 1]);

/** srcset : le CDN Sanity redimensionne (et recadre si demandé) ; en local, l'image d'origine seule. */
export function srcset(image: Image, recadrer = false): string | undefined {
  if (!image.sanity) return undefined;
  const max = largeurMax(image, recadrer);
  return [...LARGEURS.filter((l) => l < max), max].map((l) => `${url(image, l, recadrer)} ${l}w`).join(', ');
}

export function src(image: Image, largeur = image.largeur, recadrer = false): string {
  if (!image.sanity) return image.url;
  return url(image, Math.min(largeur, largeurMax(image, recadrer)), recadrer);
}

/** Styles CSS (variables) qui reproduisent un recadrage sans le CDN (contenu local) : image agrandie et décalée. */
export function stylesRecadrage(image: Image): string {
  const c = image.crop ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const largeur = 1 - c.left - c.right;
  const hauteur = 1 - c.top - c.bottom;
  const ratio = (largeur * image.largeur) / (hauteur * image.hauteur);
  return [
    `--ratio: ${ratio.toFixed(4)}`,
    `--echelle: ${(100 / largeur).toFixed(3)}%`,
    `--decalage-x: ${((-c.left / largeur) * 100).toFixed(3)}%`,
    `--decalage-y: ${((-c.top / hauteur) * 100).toFixed(3)}%`,
  ].join('; ');
}
