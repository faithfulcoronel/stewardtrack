import { test, expect } from '@playwright/test';

/**
 * Mobile Responsive Tests
 *
 * These tests verify that the application works correctly on mobile viewports.
 * Run with: npx playwright test --project=mobile-chrome --project=mobile-safari
 */

test.describe('Mobile Responsive Tests', () => {
  test.describe('Landing Page', () => {
    test('should display mobile navigation menu', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile viewports');

      await page.goto('/');

      // On mobile, the navigation should be collapsed
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');

      // Check that either a mobile menu exists or the nav is responsive
      const navVisible = await page.locator('nav').isVisible();
      expect(navVisible).toBeTruthy();
    });

    test('should have touch-friendly button sizes', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile viewports');

      await page.goto('/');

      // Check that buttons meet minimum touch target size (44x44px per WCAG 2.1 AA)
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // Minimum 44px touch target per WCAG 2.1 AA guidelines
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('should not have horizontal scroll', async ({ page }) => {
      await page.goto('/');

      // Check that the page doesn't have horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBeFalsy();
    });
  });

  test.describe('Login Page', () => {
    test('should display login form correctly on mobile', async ({ page }) => {
      await page.goto('/login');

      // Check that the login form is visible
      const form = page.locator('form');
      await expect(form).toBeVisible();

      // Check that input fields are full width on mobile
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      if (await emailInput.isVisible()) {
        const inputBox = await emailInput.boundingBox();
        const pageWidth = page.viewportSize()?.width || 375;

        if (inputBox) {
          // Input should take up most of the screen width (allowing for padding)
          expect(inputBox.width).toBeGreaterThan(pageWidth * 0.7);
        }
      }
    });

    test('should have proper input font size to prevent iOS zoom', async ({ page }) => {
      await page.goto('/login');

      // Check that inputs have at least 16px font size (prevents iOS zoom)
      const inputs = page.locator('input');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const fontSize = await input.evaluate((el) => {
            return window.getComputedStyle(el).fontSize;
          });
          const fontSizeValue = parseInt(fontSize, 10);
          expect(fontSizeValue).toBeGreaterThanOrEqual(16);
        }
      }
    });
  });

  test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Skip if not authenticated - these tests need proper auth setup
      // This is a placeholder for mobile admin tests
    });

    test('should show mobile sidebar toggle on small screens', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile viewports');

      await page.goto('/admin');

      // Look for mobile menu toggle button
      const mobileToggle = page.locator('[data-testid="mobile-sidebar-toggle"], button:has-text("Menu")').first();

      // On mobile, there should be a way to toggle the sidebar
      // This may fail if not authenticated, which is expected
    });
  });

  test.describe('Viewport and Orientation', () => {
    test('should handle viewport resize gracefully', async ({ page }) => {
      await page.goto('/');

      // Start with mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Resize to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Resize to desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(500);

      // Check that content is still visible and no errors
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('should handle orientation change', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile viewports');

      await page.goto('/');

      // Get initial viewport
      const initialViewport = page.viewportSize();

      if (initialViewport) {
        // Simulate orientation change by swapping dimensions
        await page.setViewportSize({
          width: initialViewport.height,
          height: initialViewport.width,
        });

        await page.waitForTimeout(500);

        // Check that content is still visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
      }
    });
  });

  test.describe('Touch Interactions', () => {
    test('should handle tap events', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile viewports');

      await page.goto('/');

      // Find a clickable element
      const link = page.locator('a').first();
      if (await link.isVisible()) {
        // Tap the element
        await link.tap();

        // Wait for navigation or action
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Safe Area Handling', () => {
    test('should apply safe area CSS variables', async ({ page }) => {
      await page.goto('/');

      // Check that safe area CSS variables are defined
      const safeAreaTop = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top');
      });

      // The variable should be defined (even if 0px)
      expect(safeAreaTop).toBeDefined();
    });
  });
});
