import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { alphaTab } from '@coderline/alphatab-vite';

// alphaTab プラグイン: Web Worker / AudioWorklet の設定と、
// フォント(Bravura)・SoundFont(SONiVOX)を /font, /soundfont に配置してくれる
export default defineConfig({
  plugins: [react(), alphaTab()],
  server: {
    proxy: {
      '/api/songsterr': {
        target: 'https://www.songsterr.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/songsterr/, '/api'),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
      },
    },
  },
});
