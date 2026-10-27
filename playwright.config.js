const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  use: { baseURL: process.env.SITE_URL || 'http://127.0.0.1:8765', browserName: 'chromium' },
  webServer: process.env.SITE_URL ? undefined : { command: 'python3 -m http.server 8765 --bind 127.0.0.1 --directory docs', port: 8765, reuseExistingServer: true },
  reporter: 'list',
  timeout: 30000,
});
