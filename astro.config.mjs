// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://seuil.vercel.app',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
});
