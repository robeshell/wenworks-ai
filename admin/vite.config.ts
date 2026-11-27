import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `npm run dev` serves the interface on :5173 and sends /api/ to `wrangler dev` on :8787.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
});
