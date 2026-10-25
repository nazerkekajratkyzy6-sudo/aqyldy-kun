import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ARTIFACT=1 — салыстырмалы жолдар (статикалық алдын ала қарау үшін); Vercel үшін әдепкі '/'
  base: process.env.ARTIFACT === '1' ? './' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['motion'],
        },
      },
    },
  },
});
