// Tracés des icônes en trait (16 × 16). Partagés par Icone.astro (rendu serveur) et les scripts (rendu client).
export const TRACES = {
  fleche: 'M3 8h10M9 4l4 4-4 4',
  haut: 'M8 13V3M4 7l4-4 4 4',
  coche: 'M3 8.5l3.2 3.2L13 5',
  croix: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  horloge: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 5v3.2l2.2 1.4',
  menu: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11',
  alerte: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 5.2v3.3M8 10.6v.2',
  info: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 7.4v3.4M8 5.2v.2',
  question: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM6.4 6.6a1.7 1.7 0 0 1 3.3.5c0 1.1-1.7 1.4-1.7 2.4M8 11v.2',
  chevron: 'M4 6l4 4 4-4',
  fermer: 'M4 4l8 8M12 4l-8 8',
} as const;

export type NomIcone = keyof typeof TRACES;

/** SVG décoratif (aria-hidden), identique à celui d'Icone.astro. */
export function svgIcone(nom: NomIcone, taille = 16): string {
  return `<svg aria-hidden="true" width="${taille}" height="${taille}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${TRACES[nom]}"></path></svg>`;
}
