import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    // split the WebGL stack into its own cacheable chunk — three + r3f
    // dominate the bundle (~900kB alone) and rarely change together with
    // app code, so keeping them separate lets a returning visitor skip
    // re-downloading them after any app-only deploy
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          motion: ['gsap', 'lenis'],
        },
      },
    },
  },
  server: {
    host: true,
  },
});
