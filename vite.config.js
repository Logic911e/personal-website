import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves from /<repo-name>/, so the deploy sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
});
