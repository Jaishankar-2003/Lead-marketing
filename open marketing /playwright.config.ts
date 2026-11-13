import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
});
