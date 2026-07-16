// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import netlify from '@astrojs/netlify';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://flagmingos.fr',
  vite: {
      plugins: [tailwindcss()],
  },

  adapter: netlify(),
  integrations: [sitemap()],
});