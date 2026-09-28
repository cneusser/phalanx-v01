import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Version und Bauzeitpunkt fest in das Bundle schreiben.
//
// Anlass: Nach einer Änderung war von aussen nicht zu erkennen, ob sie schon
// live ist. Man sieht dieselbe Seite und weiss nicht, ob der Browser eine alte
// Fassung im Speicher hat, ob der Deploy noch laeuft oder ob gar nicht
// gepusht wurde. Drei sehr verschiedene Ursachen, ein Bild.
//
// Die Version kommt aus package.json, damit es genau eine Quelle gibt.
const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(paket.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
