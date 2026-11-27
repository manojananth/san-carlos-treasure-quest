import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/san-carlos-treasure-quest/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
