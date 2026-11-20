// Plan du site : les 6 pages, à l'adresse du site (SITE_URL, sinon seuil.louistdesign.me).
import type { APIRoute } from 'astro';
import { chargerContenu, route } from '../lib/contenu';

export const GET: APIRoute = async ({ site }) => {
  const { pages } = await chargerContenu();
  const urls = pages.map((p) => `  <url><loc>${new URL(route(p.slug), site)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
