// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://seuil-beta.vercel.app',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
});
