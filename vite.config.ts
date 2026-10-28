import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  const outDir = isFirefox ? 'dist-firefox' : 'dist';
  const manifestFile = isFirefox ? 'manifest.firefox.json' : 'manifest.chrome.json';

  return {
    publicDir: false,
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: `public/${manifestFile}`,
            dest: '.',
            rename: 'manifest.json'
          },
          {
            src: 'public/icons/*',
            dest: 'icons'
          }
        ]
      })
    ],
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          background: resolve(__dirname, 'src/background/index.ts')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'background.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    test: {
      globals: true,
      environment: 'node'
    }
  };
});
