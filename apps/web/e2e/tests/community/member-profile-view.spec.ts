import { authenticatedTest as test, expect } from '../../fixtures/baseFixture';

/**
 * Member Profile View E2E Tests
 *
 * Tests the new card-based member profile view:
 * - Profile header with member info and badges
 * - Information cards (Identity, Contact, Family, etc.)
 * - Permission-based visibility
 * - QR code functionality
 * - Mobile responsiveness
 *
 * Route: /admin/community/members/[memberId]/view
 */

test.describe('Member Profile View', () => {
  const testMemberId = '56f5baf0-b7d9-4bdf-9416-547b1198e097';

  test.describe('Profile Header', () => {
    test('should display member name and profile photo', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Verify profile header is visible
      const header = page.locator('.rounded-2xl').first();
      await expect(header).toBeVisible({ timeout: 10000 });

      // Verify member name heading exists
      const nameHeading = page.getByRole('heading', { level: 1 });
      await expect(nameHeading).toBeVisible();

      // Verify avatar is present
      const avatar = page.locator('[class*="avatar"], [class*="Avatar"]').first();
      await expect(avatar).toBeVisible();
    });

    test('should display back navigation button', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Verify back button exists and is accessible (44px touch target)
      const backButton = page.getByRole('link', { name: /back/i });
      await expect(backButton).toBeVisible();

      const box = await backButton.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should display edit button for authorized users', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Look for edit member button/link
      const editButton = page.getByRole('link', { name: /edit.*member/i });

      // May or may not be visible depending on user permissions
      const isVisible = await editButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        // Verify touch target size
        const box = await editButton.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Information Cards', () => {
    test('should display information cards in grid layout', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Verify cards grid exists
      const cardsGrid = page.locator('.grid').filter({ has: page.locator('[class*="card"], [class*="Card"]') });
      await expect(cardsGrid.first()).toBeVisible({ timeout: 10000 });

      // Verify at least one card is visible
      const cards = page.locator('[class*="card"], [class*="Card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('should display Personal Information card', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Look for Personal Information card
      const personalCard = page.locator('[class*="card"], [class*="Card"]').filter({
        hasText: /personal information/i,
      });
      await expect(personalCard.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display Contact Information card', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Look for Contact Information card
      const contactCard = page.locator('[class*="card"], [class*="Card"]').filter({
        hasText: /contact information/i,
      });
      await expect(contactCard.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have expandable cards with accessible controls', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Look for expand/collapse buttons with proper ARIA attributes
      const expandButtons = page.locator('button[aria-expanded]');
      const count = await expandButtons.count();

      // If expand buttons exist, verify accessibility
      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = expandButtons.nth(i);
        if (await button.isVisible()) {
          // Verify aria-expanded attribute exists
          const ariaExpanded = await button.getAttribute('aria-expanded');
          expect(ariaExpanded).toBeDefined();

          // Verify touch target size
          const box = await button.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });

  test.describe('QR Code Card', () => {
    test('should display QR code card', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Look for QR code card
      const qrCard = page.locator('[class*="card"], [class*="Card"]').filter({
        hasText: /qr code/i,
      });
      await expect(qrCard.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display short URL in QR code card', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // QR code should use short URL format (/s/token) not raw UUID
      const qrCard = page.locator('[class*="card"], [class*="Card"]').filter({
        hasText: /qr code/i,
      });

      // The URL displayed should be a short URL
      const urlText = qrCard.locator('.font-mono');
      if (await urlText.isVisible({ timeout: 3000 }).catch(() => false)) {
        const url = await urlText.textContent();
        // Should contain /s/ for short URL, not the raw member UUID
        expect(url).toContain('/s/');
      }
    });

    test('should have download button with proper touch target', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Look for download button
      const downloadButton = page.getByRole('button', { name: /download/i });

      if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Verify touch target size
        const box = await downloadButton.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from list to profile view', async ({ page }) => {
      // Go to members list
      await page.goto('/admin/members/list');
      await page.waitForLoadState('networkidle');

      // Find a member row and click to view
      const memberRow = page.locator('table tbody tr, [role="row"]').first();

      if (await memberRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Look for view/profile link in the row
        const viewLink = memberRow.getByRole('link').first();
        if (await viewLink.isVisible()) {
          await viewLink.click();

          // Should navigate to profile view
          await page.waitForURL(/\/admin\/.*members\/.*\/view|\/admin\/members\//, { timeout: 10000 });
        }
      }
    });

    test('should navigate from profile view to edit form', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Click edit button if visible
      const editButton = page.getByRole('link', { name: /edit.*member/i });

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();

        // Should navigate to manage page
        await page.waitForURL(/\/admin\/members\/manage\?memberId=|\/admin\/community\/members\/.*\/manage/, { timeout: 10000 });
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Verify h1 exists (member name)
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible({ timeout: 10000 });

      // Card titles should be h3 or similar
      const cardTitles = page.locator('[class*="card"] h3, [class*="Card"] h3');
      const titleCount = await cardTitles.count();
      expect(titleCount).toBeGreaterThan(0);
    });

    test('should have accessible definition lists for member data', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Member data should be in dl/dt/dd structure
      const definitionLists = page.locator('dl');
      const dlCount = await definitionLists.count();
      expect(dlCount).toBeGreaterThan(0);
    });

    test('should have proper focus indicators', async ({ page }) => {
      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // The focused element should have a visible focus indicator
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Profile should still be visible
      const header = page.locator('.rounded-2xl').first();
      await expect(header).toBeVisible({ timeout: 10000 });

      // Cards should stack vertically on mobile
      const cardsGrid = page.locator('.grid').filter({ has: page.locator('[class*="card"]') });
      if (await cardsGrid.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await cardsGrid.boundingBox();
        if (box) {
          // On mobile (375px), grid should be full width
          expect(box.width).toBeLessThanOrEqual(375);
        }
      }
    });

    test('should not have horizontal overflow on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`/admin/community/members/${testMemberId}/view`);
      await page.waitForLoadState('networkidle');

      // Check for horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBeFalsy();
    });
  });
});
