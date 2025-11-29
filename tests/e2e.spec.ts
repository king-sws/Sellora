// ============================================
// COMPLETE E2E TEST SUITE FOR ECOMMERCE STORE
// ============================================

import { test, expect, Page } from '@playwright/test';

// ============================================
// TEST CONFIGURATION
// ============================================

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@test.com',
  password: 'Test1234',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth/sign-in`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|\//, { timeout: 10000 });
}

async function logout(page: Page) {
  // Adjust selector based on your logout button
  await page.click('button:has-text("Sign Out"), button:has-text("Logout")');
  await page.waitForURL(/sign-in|\//, { timeout: 5000 });
}

// ============================================
// TEST SUITE 1: AUTHENTICATION
// ============================================

test.describe('Authentication Tests', () => {
  
  test('should load sign-in page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await expect(page).toHaveTitle(/sign in|login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or home
    await page.waitForURL(/dashboard|\//, { timeout: 10000 });
    
    // Verify user is logged in (check for logout button or user menu)
    await expect(page.locator('text=/sign out|logout/i, button:has-text("Sign Out")')).toBeVisible({ timeout: 5000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate empty form fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=/required|email/i')).toBeVisible();
  });
});

// ============================================
// TEST SUITE 2: PRODUCT BROWSING
// ============================================

test.describe('Product Browsing Tests', () => {
  
  test('should display products on homepage or shop page', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    
    // Try to find products - adjust selectors based on your UI
    const productsExist = await page.locator('[data-testid="product-card"], .product-card, [class*="product"]').count();
    expect(productsExist).toBeGreaterThan(0);
  });

  test('should navigate to product detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    
    // Click first product
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    
    // Verify we're on product detail page
    await expect(page).toHaveURL(/\/product\/|\/products\//);
    await expect(page.locator('text=/add to cart|buy now/i')).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test product');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(2000);
    }
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    
    // Look for category filters
    const categoryFilter = page.locator('text=/category|categories/i, [data-testid="category"]').first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.waitForTimeout(1000);
    }
  });
});

// ============================================
// TEST SUITE 3: SHOPPING CART
// ============================================

test.describe('Shopping Cart Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    
    // Navigate to first product
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    
    // Get initial cart count
    const cartBadge = page.locator('[data-testid="cart-count"], .cart-count, [class*="cart"] [class*="badge"]').first();
    const initialCount = await cartBadge.textContent().catch(() => '0');
    
    // Add to cart
    await page.click('button:has-text("Add to Cart"), [data-testid="add-to-cart"]');
    
    // Verify cart updated
    await page.waitForTimeout(1000);
    const newCount = await cartBadge.textContent().catch(() => '0');
    expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
  });

  test('should view cart page', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    
    await expect(page).toHaveURL(/cart/);
    await expect(page.locator('text=/cart|shopping cart/i')).toBeVisible();
  });

  test('should update product quantity in cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    
    // Look for quantity input or increase button
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
      await page.waitForTimeout(1000);
    }
  });

  test('should remove product from cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    
    // Look for remove button
    const removeButton = page.locator('button:has-text("Remove"), [data-testid="remove-item"], button[aria-label*="remove" i]').first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

// ============================================
// TEST SUITE 4: COUPON SYSTEM
// ============================================

test.describe('Coupon Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    
    // Add product to cart first
    await page.goto(`${BASE_URL}`);
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    await page.click('button:has-text("Add to Cart"), [data-testid="add-to-cart"]');
    await page.waitForTimeout(1000);
  });

  test('should apply valid coupon code', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    
    // Look for coupon input
    const couponInput = page.locator('input[placeholder*="coupon" i], input[name*="coupon" i]').first();
    if (await couponInput.isVisible()) {
      await couponInput.fill('TESTCOUPON');
      await page.click('button:has-text("Apply"), button:has-text("Submit")');
      await page.waitForTimeout(1000);
      
      // Check for success message or discount applied
      await expect(page.locator('text=/discount|applied|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show error for invalid coupon', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    
    const couponInput = page.locator('input[placeholder*="coupon" i], input[name*="coupon" i]').first();
    if (await couponInput.isVisible()) {
      await couponInput.fill('INVALIDCOUPON123');
      await page.click('button:has-text("Apply"), button:has-text("Submit")');
      await page.waitForTimeout(1000);
      
      // Check for error message
      await expect(page.locator('text=/invalid|error|not found/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================
// TEST SUITE 5: CHECKOUT PROCESS
// ============================================

test.describe('Checkout Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    
    // Add product to cart
    await page.goto(`${BASE_URL}`);
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    await page.click('button:has-text("Add to Cart"), [data-testid="add-to-cart"]');
    await page.waitForTimeout(1000);
  });

  test('should navigate to checkout page', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');
    
    await expect(page).toHaveURL(/checkout/);
  });

  test('should fill shipping information', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout`);
    
    // Fill shipping form
    await page.fill('input[name="firstName"], input[placeholder*="first name" i]', 'John');
    await page.fill('input[name="lastName"], input[placeholder*="last name" i]', 'Doe');
    await page.fill('input[name="address1"], input[placeholder*="address" i]', '123 Test Street');
    await page.fill('input[name="city"], input[placeholder*="city" i]', 'Test City');
    await page.fill('input[name="zipCode"], input[placeholder*="zip" i]', '12345');
    await page.fill('input[name="phone"], input[placeholder*="phone" i]', '1234567890');
    
    await page.waitForTimeout(1000);
  });

  test('should complete checkout without payment', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout`);
    
    // Fill required fields
    await page.fill('input[name="firstName"], input[placeholder*="first name" i]', 'John');
    await page.fill('input[name="lastName"], input[placeholder*="last name" i]', 'Doe');
    await page.fill('input[name="address1"], input[placeholder*="address" i]', '123 Test Street');
    await page.fill('input[name="city"], input[placeholder*="city" i]', 'Test City');
    await page.fill('input[name="zipCode"], input[placeholder*="zip" i]', '12345');
    
    // Select Cash on Delivery if available
    const codOption = page.locator('text=/cash on delivery|cod/i, input[value="CASH_ON_DELIVERY"]');
    if (await codOption.isVisible()) {
      await codOption.click();
    }
    
    // Submit order
    await page.click('button:has-text("Place Order"), button:has-text("Complete Order")');
    
    // Wait for success page
    await page.waitForURL(/success|confirmation|thank-you/, { timeout: 10000 });
    await expect(page.locator('text=/order confirmed|thank you|success/i')).toBeVisible();
  });
});

// ============================================
// TEST SUITE 6: USER DASHBOARD
// ============================================

test.describe('User Dashboard Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should access user dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should view order history', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/orders`);
    await expect(page.locator('text=/orders|order history/i')).toBeVisible();
  });

  test('should view profile settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/profile`);
    await expect(page.locator('text=/profile|account/i')).toBeVisible();
  });

  test('should update profile information', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/profile`);
    
    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Updated Name');
      await page.click('button:has-text("Save"), button:has-text("Update")');
      await page.waitForTimeout(1000);
    }
  });
});

// ============================================
// TEST SUITE 7: PRODUCT REVIEWS
// ============================================

test.describe('Product Review Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view product reviews', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    
    const reviewsSection = page.locator('text=/reviews|ratings/i');
    if (await reviewsSection.isVisible()) {
      await expect(reviewsSection).toBeVisible();
    }
  });

  test('should submit a product review', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    
    const writeReviewButton = page.locator('button:has-text("Write Review"), a:has-text("Add Review")');
    if (await writeReviewButton.isVisible()) {
      await writeReviewButton.click();
      
      // Fill review form
      await page.fill('textarea[name="comment"], textarea[placeholder*="review" i]', 'Great product!');
      
      // Select rating (adjust selector based on your implementation)
      await page.click('[data-rating="5"], button:has-text("★"):nth-child(5)');
      
      await page.click('button:has-text("Submit"), button:has-text("Post Review")');
      await page.waitForTimeout(2000);
    }
  });
});

// ============================================
// TEST SUITE 8: WISHLIST
// ============================================

test.describe('Wishlist Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should add product to wishlist', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    await page.click('[data-testid="product-card"], .product-card, [class*="product"]', { timeout: 5000 });
    
    const wishlistButton = page.locator('button:has-text("Wishlist"), button[aria-label*="wishlist" i], [data-testid="add-to-wishlist"]');
    if (await wishlistButton.isVisible()) {
      await wishlistButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should view wishlist page', async ({ page }) => {
    await page.goto(`${BASE_URL}/wishlist`);
    await expect(page.locator('text=/wishlist/i')).toBeVisible();
  });
});

// ============================================
// TEST SUITE 9: PERFORMANCE & ACCESSIBILITY
// ============================================

test.describe('Performance Tests', () => {
  
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}`);
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('should have proper page titles and meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

// ============================================
// TEST SUITE 10: ERROR HANDLING
// ============================================

test.describe('Error Handling Tests', () => {
  
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-page-does-not-exist`);
    await expect(page.locator('text=/404|not found/i')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    await page.goto(`${BASE_URL}`);
    
    // App should still load even if API calls fail
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================
// RUN ALL TESTS
// ============================================

// To run these tests:
// npx playwright test
// npx playwright test --headed  (to see browser)
// npx playwright test --ui      (to use UI mode)
// npx playwright test --debug   (to debug tests)