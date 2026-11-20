// Images de partage (og:image, 1200 × 630), générées au build à partir du titre H1 de chaque page.
// Fond et couleurs du thème produit sombre, lus dans tokens.css : aucune valeur de couleur ni de taille en dur ici.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { typo } from './typo';
import type { Page } from './types';

export const LARGEUR_PARTAGE = 1200;
export const HAUTEUR_PARTAGE = 630;
export const BADGE_PARTAGE = 'Données fictives';

/** Variables CSS de :root, puis celles du thème produit par-dessus, avec les var() résolus. */
export function tokensProduit(css = readFileSync(join(process.cwd(), 'src', 'styles', 'tokens.css'), 'utf8')): Record<string, string> {
  const bloc = (selecteur: string) => {
    const debut = css.indexOf(`${selecteur} {`);
    if (debut < 0) throw new Error(`tokens.css : bloc ${selecteur} introuvable`);
    return css.slice(debut, css.indexOf('\n}', debut));
  };
  const lire = (texte: string) =>
    Object.fromEntries([...texte.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, nom, valeur]) => [nom, valeur.trim()]));
  const brut = { ...lire(bloc(':root')), ...lire(bloc('[data-theme="produit"]')) };
  const resoudre = (valeur: string, profondeur = 0): string => {
    if (profondeur > 10) throw new Error(`tokens.css : référence circulaire (${valeur})`);
    return valeur.replace(/var\((--[\w-]+)\)/g, (_, nom: string) => {
      if (!(nom in brut)) throw new Error(`tokens.css : ${nom} introuvable`);
      return resoudre(brut[nom], profondeur + 1);
    });
  };
  return Object.fromEntries(Object.entries(brut).map(([nom, valeur]) => [nom, resoudre(valeur)]));
}

/** Le titre H1 de la page : celui de sa première section. */
export function titrePage(page: Page): string {
  const titre = (page.sections[0] as { titre?: string } | undefined)?.titre;
  if (!titre) throw new Error(`Page ${page.slug} : pas de titre dans la première section, image de partage impossible`);
  return titre;
}

export const altPartage = (page: Page) => `Seuil : ${titrePage(page)} Données fictives.`;

const px = (valeur: string) => Number.parseFloat(valeur);
const police = (fichier: string) => readFileSync(join(process.cwd(), 'node_modules', '@fontsource', fichier));

type Noeud = { type: string; props: Record<string, unknown> & { children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Noeud => ({ type, props: { style, children } });

export async function imagePartage(page: Page): Promise<Buffer> {
  const t = tokensProduit();
  // Urbanist n'a pas de trait d'union insécable (U+2011) : trait d'union simple, l'espace insécable reste.
  const titre = typo(titrePage(page)).replaceAll('‑', '-');
  const marge = px(t['--space-800']);
  const largeurUtile = LARGEUR_PARTAGE - 2 * marge;
  // Titre long : un cran en dessous, pour tenir sur trois lignes au plus.
  const taille = titre.length > 70 ? 'display-md' : 'display-lg';

  const arbre = el(
    'div',
    {
      // satori ajoute la marge aux dimensions (content-box) : on la retire pour tenir dans 1200 × 630.
      width: largeurUtile,
      height: HAUTEUR_PARTAGE - 2 * marge,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: t['--space-800'],
      backgroundColor: t['--color-bg-page'],
      color: t['--color-text-primary'],
      fontFamily: 'Geist',
    },
    [
      el('div', { display: 'flex', width: largeurUtile, alignItems: 'center', justifyContent: 'space-between' }, [
        el(
          'div',
          {
            fontFamily: 'Urbanist',
            fontSize: t['--title-lg-size'],
            lineHeight: t['--title-lg-line'],
            fontWeight: 600,
            letterSpacing: `${px(t['--title-xl-tracking']) * px(t['--title-lg-size'])}px`,
          },
          'Seuil',
        ),
        el(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            padding: `${t['--space-100']} ${t['--space-200']}`,
            borderRadius: t['--radius-sm'],
            border: `2px solid ${t['--color-border-default']}`,
            color: t['--color-text-secondary'],
            fontSize: t['--title-sm-size'],
            lineHeight: t['--title-sm-line'],
            fontWeight: 500,
          },
          BADGE_PARTAGE,
        ),
      ]),
      el(
        'div',
        {
          display: 'flex',
          width: largeurUtile,
          // Comme les titres du site : lignes équilibrées, pas de mot seul sur la dernière.
          textWrap: 'balance',
          fontFamily: 'Urbanist',
          fontSize: t[`--${taille}-size`],
          lineHeight: t[`--${taille}-line`],
          fontWeight: 500,
          letterSpacing: `${px(t[`--${taille}-tracking`]) * px(t[`--${taille}-size`])}px`,
        },
        titre,
      ),
    ],
  );

  const svg = await satori(arbre as never, {
    width: LARGEUR_PARTAGE,
    height: HAUTEUR_PARTAGE,
    fonts: [
      { name: 'Urbanist', data: police('urbanist/files/urbanist-latin-500-normal.woff'), weight: 500, style: 'normal' },
      { name: 'Urbanist', data: police('urbanist/files/urbanist-latin-600-normal.woff'), weight: 600, style: 'normal' },
      { name: 'Geist', data: police('geist/files/geist-latin-500-normal.woff'), weight: 500, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: LARGEUR_PARTAGE } }).render().asPng();
}
