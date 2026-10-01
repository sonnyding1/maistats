import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [cloudflare()],
    define: {
      'import.meta.env.SONG_DATABASE_URL': JSON.stringify(env.SONG_DATABASE_URL ?? ''),
      'import.meta.env.RECORD_COLLECTOR_SERVER_URL': JSON.stringify(
        env.RECORD_COLLECTOR_SERVER_URL ?? '',
      ),
    },
    server: {
      host: true,
      port: 5174,
      // Mirror what nginx does in the container so the dev server is also
      // same-origin and the collector URL never has to be set by hand.
      proxy: {
        '/api': 'http://localhost:3000',
        '/health': 'http://localhost:3000',
      },
    },
  };
});
