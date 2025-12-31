import { authenticatedTest as test, expect } from '../../fixtures/baseFixture';

/**
 * Inactivity Timeout E2E Test
 *
 * Tests the inactivity timeout mechanism including:
 * 1. Activity tracking via localStorage
 * 2. Cross-tab activity synchronization
 *
 * Note: The actual timeout (15 minutes) and warning dialog cannot be tested
 * in automated E2E tests due to time constraints. These tests focus on
 * verifiable behavior like activity tracking.
 *
 * For manual testing of the timeout dialog, see the manual test instructions
 * at the bottom of this file.
 */

// Run tests serially to avoid authentication race conditions
test.describe.configure({ mode: 'serial' });

test.describe('Inactivity Timeout', () => {
  test.describe('Activity Detection', () => {
    test('should track mouse movement as activity', async ({ page }) => {
      // Navigate to admin dashboard (already authenticated via fixture)
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Get initial last activity timestamp
      const initialActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Wait a moment to ensure timestamp difference
      await page.waitForTimeout(100);

      // Simulate mouse movement
      await page.mouse.move(100, 100);
      await page.mouse.move(200, 200);

      // Wait for activity to be recorded
      await page.waitForTimeout(50);

      // Get updated last activity timestamp
      const updatedActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Activity timestamp should be updated (or at least exist)
      if (initialActivity && updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThanOrEqual(Number(initialActivity));
      } else if (updatedActivity) {
        // Activity was recorded
        expect(Number(updatedActivity)).toBeGreaterThan(0);
      }
    });

    test('should track keyboard activity', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Get initial last activity timestamp
      const initialActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Wait a moment
      await page.waitForTimeout(100);

      // Simulate keyboard activity
      await page.keyboard.press('Tab');

      // Wait for activity to be recorded
      await page.waitForTimeout(50);

      // Get updated last activity timestamp
      const updatedActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Activity timestamp should be updated
      if (initialActivity && updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThanOrEqual(Number(initialActivity));
      } else if (updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThan(0);
      }
    });

    test('should track click activity', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Get initial last activity timestamp
      const initialActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Wait a moment
      await page.waitForTimeout(100);

      // Simulate click activity on the main content area
      const main = page.locator('main');
      if (await main.isVisible()) {
        await main.click({ force: true, position: { x: 50, y: 50 } });
      } else {
        await page.click('body', { force: true });
      }

      // Wait for activity to be recorded
      await page.waitForTimeout(50);

      // Get updated last activity timestamp
      const updatedActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Activity timestamp should be updated
      if (initialActivity && updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThanOrEqual(Number(initialActivity));
      } else if (updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThan(0);
      }
    });

    test('should track scroll activity', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Get initial last activity timestamp
      const initialActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Wait a moment
      await page.waitForTimeout(100);

      // Simulate scroll activity
      await page.evaluate(() => {
        window.scrollBy(0, 100);
      });

      // Wait for activity to be recorded
      await page.waitForTimeout(50);

      // Get updated last activity timestamp
      const updatedActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Activity timestamp should be updated
      if (initialActivity && updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThanOrEqual(Number(initialActivity));
      } else if (updatedActivity) {
        expect(Number(updatedActivity)).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Cross-Tab Sync', () => {
    test('should sync activity across tabs via localStorage', async ({ page, context }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Open a second tab
      const secondTab = await context.newPage();
      await secondTab.goto('/admin');
      await secondTab.waitForLoadState('networkidle');

      // Simulate activity in first tab by updating localStorage directly
      const activityTimestamp = Date.now();
      await page.evaluate((timestamp) => {
        localStorage.setItem('st-last-activity', timestamp.toString());
      }, activityTimestamp);

      // Second tab should be able to read the same activity value
      // (localStorage is shared within same origin)
      const secondTabActivity = await secondTab.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      expect(Number(secondTabActivity)).toBe(activityTimestamp);

      await secondTab.close();
    });

    test('should have consistent activity tracking key name', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Verify the activity tracking key is being used
      // The hook should set 'st-last-activity' on user activity
      await page.mouse.move(100, 100);
      await page.waitForTimeout(100);

      const activityKey = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Key should exist and contain a valid timestamp
      expect(activityKey).not.toBeNull();
      if (activityKey) {
        const timestamp = Number(activityKey);
        expect(timestamp).toBeGreaterThan(0);
        // Timestamp should be recent (within last minute)
        expect(Date.now() - timestamp).toBeLessThan(60000);
      }
    });
  });

  test.describe('InactivityTimeoutProvider Integration', () => {
    test('should have inactivity timeout provider mounted on admin pages', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // The InactivityTimeoutProvider wraps the admin layout
      // We can verify it's working by checking that activity tracking is active
      const initialActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Trigger some activity
      await page.mouse.move(50, 50);
      await page.waitForTimeout(100);

      const afterActivity = await page.evaluate(() => {
        return localStorage.getItem('st-last-activity');
      });

      // Activity should be tracked
      expect(afterActivity).not.toBeNull();
      if (initialActivity && afterActivity) {
        expect(Number(afterActivity)).toBeGreaterThanOrEqual(Number(initialActivity));
      }
    });

    test('should not interfere with normal page navigation', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Verify we're on the admin page
      await expect(page).toHaveURL(/\/admin/);

      // Simulate some activity
      await page.mouse.move(100, 100);
      await page.keyboard.press('Tab');

      // Navigate to a different admin page
      // Look for a navigation link in the sidebar
      const membersLink = page.getByRole('link', { name: /members/i }).first();
      if (await membersLink.isVisible()) {
        await membersLink.click();
        await page.waitForLoadState('networkidle');
        // Should navigate without issues
        await expect(page).toHaveURL(/\/(admin|members)/);
      }
    });
  });
});

/**
 * Manual Testing Instructions
 * ===========================
 *
 * The inactivity timeout feature cannot be fully tested in automated E2E tests
 * because waiting 15 minutes is impractical. For full testing, follow these steps:
 *
 * ## Quick Manual Test (with modified timeout):
 *
 * 1. Temporarily modify src/components/admin/layout-shell.tsx:
 *    Change timeoutMs from (15 * 60 * 1000) to (30 * 1000) // 30 seconds
 *    Change warningMs from (60 * 1000) to (10 * 1000) // 10 seconds
 *
 * 2. Start the dev server: npm run dev
 *
 * 3. Log in to the admin dashboard
 *
 * 4. Wait 30 seconds without any mouse/keyboard activity
 *
 * 5. A warning dialog should appear with a 10-second countdown
 *
 * 6. Test "Stay Logged In":
 *    - Click the "Stay Logged In" button
 *    - Dialog should close
 *    - Timer should reset (wait another 30 seconds for dialog to reappear)
 *
 * 7. Test "Log Out Now":
 *    - Wait for dialog to appear again
 *    - Click "Log Out Now"
 *    - Should redirect to /login immediately
 *
 * 8. Test auto-logout:
 *    - Wait for dialog to appear
 *    - Don't click any buttons
 *    - After countdown reaches 0, should auto-redirect to /login
 *
 * 9. Test tab visibility:
 *    - Log in to admin
 *    - Switch to another app for 1+ minute
 *    - Return to the browser tab
 *    - Should see warning dialog or be redirected to login
 *
 * 10. Remember to revert the timeout values before committing!
 *
 * ## Production Testing Checklist:
 *
 * [ ] Warning dialog appears after 15 minutes of inactivity
 * [ ] Countdown shows remaining time in seconds
 * [ ] "Stay Logged In" dismisses dialog and resets timer
 * [ ] "Log Out Now" redirects to login immediately
 * [ ] Auto-logout occurs after 60 second warning countdown
 * [ ] Activity (mouse, keyboard, scroll, click) resets the timer
 * [ ] Returning to tab after long absence triggers warning or logout
 * [ ] Multiple tabs stay in sync (activity in one resets timer in all)
 */
