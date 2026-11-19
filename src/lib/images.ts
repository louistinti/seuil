import type { Image } from './types';

const LARGEURS = [480, 768, 1080, 1440, 2160];

/** srcset : le CDN Sanity redimensionne ; en local, l'image d'origine. */
export function srcset(image: Image, largeurMax = image.largeur): string | undefined {
  if (!image.sanity) return undefined;
  return LARGEURS.filter((l) => l <= largeurMax * 2)
    .map((l) => `${image.url}?w=${l}&auto=format&q=80 ${l}w`)
    .join(', ');
}

export function src(image: Image, largeur = image.largeur): string {
  return image.sanity ? `${image.url}?w=${largeur}&auto=format&q=80` : image.url;
}

/** Styles CSS (variables) qui reproduisent un recadrage Sanity sans retoucher l'image. */
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
