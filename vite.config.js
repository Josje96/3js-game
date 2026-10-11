import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any static host (itch.io, GitHub Pages, a USB stick...).
  base: './',
  server: { host: true },
});
