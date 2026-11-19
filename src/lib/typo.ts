// Typographie française appliquée au rendu : espaces insécables et traits d'union insécables.
const INSECABLE = ' ';
const TRAIT_INSECABLE = '‑';

export function typo(texte?: string | null): string {
  if (!texte) return '';
  return texte
    .replace(/ ([?!:;»%€])/g, `${INSECABLE}$1`)
    .replace(/« /g, `«${INSECABLE}`)
    .replace(/(\w)-t-(elle|il|on|ils|elles)\b/g, `$1${TRAIT_INSECABLE}t${TRAIT_INSECABLE}$2`);
}

/** Lien interne vers une ancre de la page courante, ou vers une autre page. */
export function estExterne(href: string): boolean {
  return /^https?:\/\//.test(href);
}
