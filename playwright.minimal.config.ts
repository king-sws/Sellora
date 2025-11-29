import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  // Only run the minimal test file
  testMatch: '**/minimal.spec.ts',
  
  // Run tests sequentially for easier debugging
  fullyParallel: false,
  workers: 1,
  
  // No retries for debugging
  retries: 0,
  
  // Longer timeout for debugging
  timeout: 30000,
  
  // Reporter to use
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    
    // Always capture traces and screenshots for debugging
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    
    // Slower actions for visibility
    actionTimeout: 10000,
  },

  // Single browser for simplicity
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Make sure dev server is running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Use existing server if already running
    timeout: 120000,
  },
});