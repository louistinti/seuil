// Image de partage de chaque page : /partage/<slug>.png, générée au build (1200 × 630).
import type { APIRoute, GetStaticPaths } from 'astro';
import { chargerContenu } from '../../lib/contenu';
import { imagePartage } from '../../lib/partage';
import type { Page } from '../../lib/types';

export const getStaticPaths = (async () => {
  const { pages } = await chargerContenu();
  return pages.map((page) => ({ params: { slug: page.slug }, props: { page } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await imagePartage((props as { page: Page }).page);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
