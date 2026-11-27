import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/san-carlos-treasure-quest/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
