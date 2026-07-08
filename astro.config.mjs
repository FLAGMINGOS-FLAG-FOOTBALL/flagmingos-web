// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
    },
    fonts: [{
        provider: fontProviders.google(),
        name: 'Inter',
        cssVariable: '--font-inter',
    },
    {
        provider: fontProviders.google(),
        name: 'Oswald',
        cssVariable: '--font-oswald',
    },
    {
        provider: fontProviders.google(),
        name: 'Bebas Neue',
        cssVariable: '--font-bebas-neue',
    },
],
});
