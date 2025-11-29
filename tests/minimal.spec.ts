// tests/minimal.spec.ts
// Simple test to verify basic authentication flow works
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Minimal Authentication Test', () => {
  
  test('Step 1: Can we reach the sign-in page?', async ({ page }) => {
    console.log('🔍 Navigating to sign-in page...');
    
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright/test-screenshots/01-signin-page.png',
      fullPage: true 
    });
    
    console.log('✅ Sign-in page loaded');
    console.log('📸 Screenshot saved to playwright/test-screenshots/01-signin-page.png');
    
    // Just verify the page loaded
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Page body is visible');
  });

  test('Step 2: What form elements exist?', async ({ page }) => {
    console.log('🔍 Analyzing form elements...');
    
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.waitForLoadState('networkidle');
    
    // Find all inputs
    const allInputs = await page.locator('input').all();
    console.log(`\n📝 Found ${allInputs.length} input fields:\n`);
    
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      const className = await input.getAttribute('class');
      
      console.log(`  Input ${i + 1}:`);
      console.log(`    - type: ${type}`);
      console.log(`    - name: ${name}`);
      console.log(`    - id: ${id}`);
      console.log(`    - placeholder: ${placeholder}`);
      console.log(`    - class: ${className}`);
      console.log('');
    }
    
    // Find all buttons
    const allButtons = await page.locator('button').all();
    console.log(`\n🔘 Found ${allButtons.length} buttons:\n`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const type = await button.getAttribute('type');
      const text = await button.textContent();
      const className = await button.getAttribute('class');
      
      console.log(`  Button ${i + 1}:`);
      console.log(`    - type: ${type}`);
      console.log(`    - text: "${text?.trim()}"`);
      console.log(`    - class: ${className}`);
      console.log('');
    }
    
    // Verify we have at least some form elements
    expect(allInputs.length).toBeGreaterThan(0);
    expect(allButtons.length).toBeGreaterThan(0);
    
    console.log('✅ Form elements detected');
  });

  test('Step 3: Can we fill the form?', async ({ page }) => {
    console.log('🔍 Attempting to fill login form...');
    
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.waitForLoadState('networkidle');
    
    // Try multiple possible selectors for email
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[autocomplete="email"]',
    ];
    
    let emailInput = null;
    let emailSelector = '';
    
    for (const selector of emailSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 })) {
          emailInput = input;
          emailSelector = selector;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (emailInput) {
      console.log(`✅ Found email input with selector: ${emailSelector}`);
      await emailInput.fill('test@test.com');
      console.log('✅ Filled email field');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'playwright/test-screenshots/02-email-filled.png',
        fullPage: true 
      });
    } else {
      console.log('❌ Could not find email input');
      await page.screenshot({ 
        path: 'playwright/test-screenshots/02-no-email-input.png',
        fullPage: true 
      });
      throw new Error('Email input not found');
    }
    
    // Try multiple possible selectors for password
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]',
    ];
    
    let passwordInput = null;
    let passwordSelector = '';
    
    for (const selector of passwordSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 })) {
          passwordInput = input;
          passwordSelector = selector;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (passwordInput) {
      console.log(`✅ Found password input with selector: ${passwordSelector}`);
      await passwordInput.fill('Test1234');
      console.log('✅ Filled password field');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'playwright/test-screenshots/03-password-filled.png',
        fullPage: true 
      });
    } else {
      console.log('❌ Could not find password input');
      await page.screenshot({ 
        path: 'playwright/test-screenshots/03-no-password-input.png',
        fullPage: true 
      });
      throw new Error('Password input not found');
    }
    
    console.log('✅ Form filled successfully');
  });

  test('Step 4: Can we submit the form?', async ({ page }) => {
    console.log('🔍 Attempting to submit login form...');
    
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.waitForLoadState('networkidle');
    
    // Fill the form first
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    await emailInput.fill('test@test.com');
    await passwordInput.fill('Test1234');
    
    console.log('✅ Form filled');
    
    // Find submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Log In")',
      'button:has-text("Continue")',
    ];
    
    let submitButton = null;
    let submitSelector = '';
    
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          submitButton = button;
          submitSelector = selector;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!submitButton) {
      console.log('❌ Could not find submit button');
      await page.screenshot({ 
        path: 'playwright/test-screenshots/04-no-submit-button.png',
        fullPage: true 
      });
      throw new Error('Submit button not found');
    }
    
    console.log(`✅ Found submit button with selector: ${submitSelector}`);
    
    // Take screenshot before submit
    await page.screenshot({ 
      path: 'playwright/test-screenshots/04-before-submit.png',
      fullPage: true 
    });
    
    // Click submit
    await submitButton.click();
    console.log('✅ Clicked submit button');
    
    // Wait a bit for navigation
    await page.waitForTimeout(3000);
    
    // Take screenshot after submit
    await page.screenshot({ 
      path: 'playwright/test-screenshots/05-after-submit.png',
      fullPage: true 
    });
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check if we're still on sign-in page
    if (currentUrl.includes('sign-in')) {
      console.log('⚠️  Still on sign-in page - check for error messages');
      
      // Look for error messages
      const errorMessages = await page.locator('[role="alert"], .error, [class*="error"]').all();
      if (errorMessages.length > 0) {
        console.log(`❌ Found ${errorMessages.length} error message(s):`);
        for (const error of errorMessages) {
          const text = await error.textContent();
          console.log(`   - ${text}`);
        }
      }
    } else {
      console.log('✅ Navigation occurred - likely successful!');
    }
  });

test('Step 5: Full login flow test', async ({ page }) => {
  console.log('🔍 Testing complete login flow...');
  
  await page.goto(`${BASE_URL}/auth/sign-in`);
  await page.waitForLoadState('networkidle');
  console.log('✅ Navigated to sign-in page');
  
  // Wait for form to be fully hydrated and interactive
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');
  
  // Ensure form is ready (not disabled)
  await expect(emailInput).toBeEditable();
  await expect(passwordInput).toBeEditable();
  await expect(submitButton).toBeEnabled();
  
  // Fill form
  await emailInput.fill('test@test.com');
  await passwordInput.fill('Test1234');
  console.log('✅ Form filled');
  
  // Wait for any client-side validation to complete
  await page.waitForTimeout(500);
  
  // Click submit and wait for navigation
  await submitButton.click();
  console.log('✅ Form submitted');
  
  // Wait for navigation away from auth pages
  await page.waitForURL(url => !url.pathname.startsWith('/auth'), { 
    timeout: 15000 
  });
  
  console.log('✅ Successfully navigated after login');
  const finalUrl = page.url();
  console.log(`📍 Final URL: ${finalUrl}`);
  
  // Take success screenshot
  await page.screenshot({ 
    path: 'playwright/test-screenshots/06-login-success.png',
    fullPage: true 
  });
  
  // Verify we're not on sign-in page anymore
  expect(page.url()).not.toContain('/auth');
  console.log('✅ Login successful!');
});
});

test.describe('Quick Homepage Test', () => {
  
  test('Can we access the homepage?', async ({ page }) => {
    console.log('🔍 Testing homepage access...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'playwright/test-screenshots/07-homepage.png',
      fullPage: true 
    });
    
    console.log('✅ Homepage loaded');
    console.log(`📍 URL: ${page.url()}`);
    
    await expect(page.locator('body')).toBeVisible();
  });
});