// Chargement du contenu au moment du build.
// Avec SANITY_PROJECT_ID : le contenu publié dans Sanity (source de vérité en ligne).
// Sans : content/pages.json, le même contenu que celui envoyé par `npm run seed`, pour travailler hors ligne.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@sanity/client';
import local from '../../content/pages.json';
import type { Image, Page, Reglages, Section } from './types';

const projectId = import.meta.env.SANITY_PROJECT_ID as string | undefined;
const dataset = (import.meta.env.SANITY_DATASET as string | undefined) ?? 'production';

if (!projectId && (process.env.VERCEL || process.env.CI_EXIGE_SANITY)) {
  // En ligne, on ne publie jamais un site construit sur le contenu de secours.
  throw new Error('SANITY_PROJECT_ID manque : le site en ligne doit lire son contenu dans Sanity.');
}

export const sourceDuContenu = projectId ? `Sanity (${projectId}/${dataset})` : 'content/pages.json (local)';

const client = projectId
  ? createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, perspective: 'published' })
  : null;

const IMAGE = `{alt, crop, "url": asset->url, "largeur": asset->metadata.dimensions.width, "hauteur": asset->metadata.dimensions.height}`;
const REQUETE_PAGES = `*[_type == "page" && defined(slug.current)] | order(ordre asc) {
  _id, titre, "slug": slug.current, description, "imagePartage": imagePartage${IMAGE},
  sections[] { ..., "capture": capture${IMAGE}, "captureMobile": captureMobile${IMAGE} }
}`;
const REQUETE_REGLAGES = `*[_id == "reglages"][0]`;

type ImageBrute = { alt?: string; crop?: Image['crop']; url?: string; largeur?: number; hauteur?: number; fichier?: string } | null | undefined;

// Captures locales : content/captures/*.png, servies par Vite.
const urlsLocales = import.meta.glob<string>('/content/captures/*.png', { eager: true, query: '?url', import: 'default' });
const altsLocaux = (local as { captures: Record<string, string> }).captures;

function dimensionsPng(fichier: string): [number, number] {
  const tampon = readFileSync(join(process.cwd(), 'content', 'captures', fichier));
  return [tampon.readUInt32BE(16), tampon.readUInt32BE(20)];
}

function image(brute: ImageBrute): Image | null {
  if (!brute) return null;
  if (brute.fichier) {
    const url = urlsLocales[`/content/captures/${brute.fichier}`];
    if (!url) throw new Error(`Capture introuvable : content/captures/${brute.fichier}`);
    const [largeur, hauteur] = dimensionsPng(brute.fichier);
    return { url, largeur, hauteur, alt: altsLocaux[brute.fichier] ?? '', crop: brute.crop ?? null, sanity: false };
  }
  if (!brute.url) return null;
  return { url: brute.url, largeur: brute.largeur ?? 1440, hauteur: brute.hauteur ?? 1000, alt: brute.alt ?? '', crop: brute.crop ?? null, sanity: true };
}

function normaliser(page: Record<string, any>): Page {
  const sections = (page.sections ?? []).map((s: Record<string, any>, i: number) => {
    const section: Record<string, any> = { ...s, _key: s._key ?? `${page._id}-${i}` };
    if ('capture' in s) section.capture = image(s.capture);
    if ('captureMobile' in s) section.captureMobile = image(s.captureMobile);
    return section as Section;
  });
  const slug = typeof page.slug === 'string' ? page.slug : page.slug?.current;
  return { _id: page._id, titre: page.titre, slug, description: page.description, imagePartage: image(page.imagePartage), sections };
}

let cache: Promise<{ pages: Page[]; reglages: Reglages }> | undefined;

export function chargerContenu() {
  cache ??= (async () => {
    if (client) {
      const [pages, reglages] = await Promise.all([client.fetch(REQUETE_PAGES), client.fetch(REQUETE_REGLAGES)]);
      if (!reglages) throw new Error('Le document « Réglages du site » est absent de Sanity. Lancez npm run seed.');
      return { pages: (pages as Record<string, any>[]).map(normaliser), reglages: reglages as Reglages };
    }
    const donnees = local as unknown as { pages: Record<string, any>[]; reglages: Reglages };
    return { pages: donnees.pages.map(normaliser), reglages: donnees.reglages };
  })();
  return cache;
}

/** Route publique d'une page : « accueil » est la racine. */
export const route = (slug: string) => (slug === 'accueil' ? '/' : `/${slug}`);
