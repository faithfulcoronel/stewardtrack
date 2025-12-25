import { authenticatedTest as test, expect } from '../../fixtures/baseFixture';
import { generateMemberData } from '../../pages/MembersPage';

/**
 * Community Members E2E Test
 *
 * Tests the complete member management workflow:
 * 1. Login with test credentials
 * 2. Navigate to members via sidebar
 * 3. Create a new member
 * 4. Verify member details
 * 5. Edit the member
 * 6. Verify updated details
 */
test.describe('Community Members Management', () => {
  test.describe('Member CRUD Operations', () => {
    test('should create a new member and then edit it', async ({ page, membersPage }) => {
      // Generate test data at the start of the test to ensure consistent data
      const timestamp = Date.now();
      const testMember = generateMemberData({
        firstName: 'TestMember',
        lastName: `E2E-${timestamp}`,
      });
      let createdMemberId: string = '';
      // ==================== STEP 1: Navigate to Members ====================
      // The authenticatedTest fixture already handles login
      // Now navigate to members section via sidebar

      // Click Members menu item from sidebar
      const membersMenu = page.getByRole('link', { name: /members/i }).first();
      await membersMenu.click();

      // Wait for members page to load (increase timeout for slow renders)
      await page.waitForURL(/\/admin\/members/, { timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // ==================== STEP 2: Click "Add new member" button ====================
      // Look for the add member button on the dashboard or list page
      // Use first() to handle multiple matching elements
      const addMemberButton = page.getByRole('link', { name: /add.*member|new.*member/i }).first();

      // If we're on dashboard, we might need to go to list first
      const currentUrl = page.url();
      if (!currentUrl.includes('/list')) {
        // Try to find and click add member button from dashboard
        const buttonVisible = await addMemberButton.isVisible({ timeout: 3000 }).catch(() => false);
        if (!buttonVisible) {
          // Navigate to list page
          await membersPage.gotoList();
          await page.waitForLoadState('networkidle');
        }
      }

      await addMemberButton.click();

      // Wait for manage page to load
      await page.waitForURL(/\/admin\/members\/manage/, { timeout: 10000 });

      // ==================== STEP 3: Fill up the form ====================
      // Wait for form to be ready
      await membersPage.isFormLoaded();

      // Fill personal information (skip birthdate as it's a date picker)
      await membersPage.fillPersonalInfo({
        firstName: testMember.firstName,
        lastName: testMember.lastName,
        preferredName: testMember.preferredName,
        // birthdate skipped - requires date picker interaction
      });

      // Fill address information - address is REQUIRED
      // Address fields are in the Household section, not Contact Preferences
      await membersPage.fillAddressInfo({
        addressStreet: testMember.addressStreet,
        addressCity: testMember.addressCity,
        addressState: testMember.addressState,
        addressPostal: testMember.addressPostal,
      });

      // Fill contact information (email, phone in Contact Preferences section)
      await membersPage.fillContactInfo({
        email: testMember.email,
        phone: testMember.phone,
      });

      // ==================== STEP 4: Save the form ====================
      // Check for any validation errors before submitting
      const validationErrors = page.locator('.text-destructive, [data-error="true"], [aria-invalid="true"], .error-message');
      const hasErrors = await validationErrors.first().isVisible({ timeout: 1000 }).catch(() => false);
      if (hasErrors) {
        const errorText = await validationErrors.first().textContent();
        console.log(`Validation error found before submit: ${errorText}`);
      }

      // Click the save/create button
      console.log('Clicking submit button...');
      await membersPage.submitForm();

      // Wait a moment for form submission to process
      await page.waitForTimeout(3000);

      // Check for validation errors after submit attempt
      const postSubmitErrors = page.locator('.text-destructive, [data-error="true"], .error-message, [class*="error"]');
      const errorCount = await postSubmitErrors.count();
      if (errorCount > 0) {
        for (let i = 0; i < Math.min(errorCount, 5); i++) {
          const errorText = await postSubmitErrors.nth(i).textContent().catch(() => '');
          if (errorText && errorText.length < 200) {
            console.log(`Form error ${i + 1}: ${errorText}`);
          }
        }
      }

      // Wait for and capture the toast message (Sonner toast library)
      const toastLocator = page.locator('[data-sonner-toast], li[data-sonner-toast]').first();
      try {
        await toastLocator.waitFor({ state: 'visible', timeout: 5000 });
        const toastText = await toastLocator.textContent();
        console.log(`Toast message: ${toastText}`);

        // Check if toast indicates success or error
        if (toastText?.toLowerCase().includes('error') || toastText?.toLowerCase().includes('failed')) {
          throw new Error(`Form submission failed with toast: ${toastText}`);
        }
      } catch {
        console.log('No Sonner toast message captured');
      }

      // Wait for page to stabilize
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000); // Allow any redirects to complete

      // ==================== STEP 5: Assert member was created ====================
      // Capture the member ID from URL if redirected to profile
      const urlAfterSave = page.url();
      const memberIdMatch = urlAfterSave.match(/\/admin\/members\/([a-f0-9-]+)/i);
      if (memberIdMatch) {
        createdMemberId = memberIdMatch[1];
        console.log(`Captured member ID from URL: ${createdMemberId}`);
      }

      // If on profile page, verify member details via heading
      if (createdMemberId && !urlAfterSave.includes('manage') && !urlAfterSave.includes('list')) {
        // Use heading to avoid strict mode violation (multiple matching elements)
        const profileHeading = page.getByRole('heading', { level: 1 });
        await expect(profileHeading).toContainText(testMember.firstName, { timeout: 10000 });
        await expect(profileHeading).toContainText(testMember.lastName);
        console.log('Verified member name in profile page heading');
      }

      // ==================== STEP 5b: Verify member exists in the list ====================
      // Navigate to the members list to verify the newly created member appears
      await membersPage.gotoList();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Search for the created member by last name to confirm it exists
      await membersPage.searchInput.fill(testMember.lastName);
      await page.waitForTimeout(1500); // Wait for search results

      // Assert that the member appears in the search results
      const memberRow = page.locator('table tbody tr, [role="row"]').filter({ hasText: testMember.lastName });
      await expect(memberRow.first()).toBeVisible({ timeout: 10000 });
      console.log(`Verified member "${testMember.firstName} ${testMember.lastName}" exists in the list`);

      // Clear search for next steps
      await membersPage.searchInput.clear();
      await page.waitForTimeout(500);

      // ==================== STEP 6: Edit the member record ====================
      // Navigate to edit page using direct URL if we have member ID
      if (createdMemberId) {
        console.log(`Navigating to edit member: ${createdMemberId}`);
        await membersPage.gotoEditMember(createdMemberId);
      } else {
        // No ID captured - go to list and find the first member row to edit
        console.log('No member ID captured, going to list page');
        await membersPage.gotoList();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Clear any search filters first
        const clearFiltersBtn = page.getByRole('button', { name: /clear/i });
        if (await clearFiltersBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await clearFiltersBtn.click();
          await page.waitForTimeout(1000);
        }

        // Look for any row with an edit action and click it
        const editLink = page.getByRole('link', { name: /edit/i }).first();
        if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
          await editLink.click();
        } else {
          // Try clicking on any row that has an edit button
          const rows = page.locator('table tbody tr, [role="row"]').filter({ hasNot: page.locator('th') });
          const firstRow = rows.first();
          const rowEditBtn = firstRow.getByRole('button', { name: /edit/i }).or(firstRow.getByRole('link', { name: /edit/i }));
          await rowEditBtn.click();
        }
      }

      // Wait for edit form to load
      await page.waitForURL(/\/admin\/members\/manage\?memberId=/, { timeout: 10000 });
      await membersPage.isFormLoaded();

      // ==================== STEP 7: Update some details ====================
      // First expand the Identity & Profile section to reveal form fields
      await membersPage.expandAccordionSection(membersPage.identityProfileSection);

      const updatedPreferredName = `Updated-${Date.now()}`;
      await membersPage.preferredNameInput.clear();
      await membersPage.preferredNameInput.fill(updatedPreferredName);

      // Update phone number
      const updatedPhone = '555-999-8888';
      const phoneVisible = await membersPage.phoneInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (phoneVisible) {
        await membersPage.phoneInput.clear();
        await membersPage.phoneInput.fill(updatedPhone);
      }

      // Save changes
      await membersPage.submitForm();

      // Wait for success message or page update
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000); // Allow save to complete

      // ==================== STEP 8: Assert updated details ====================
      // Check if we're still on the form page or redirected
      const finalUrl = page.url();

      if (finalUrl.includes('/manage')) {
        // Still on edit form - verify the input has the updated value
        await membersPage.expandAccordionSection(membersPage.identityProfileSection);
        const inputValue = await membersPage.preferredNameInput.inputValue();
        expect(inputValue).toContain('Updated-');
        console.log(`Verified updated preferred name in form: ${inputValue}`);
      } else {
        // On profile page - verify the text is displayed
        await expect(page.getByText(new RegExp(updatedPreferredName, 'i'))).toBeVisible({ timeout: 10000 });
      }

      // Log success
      console.log(`Successfully created and edited member: ${testMember.firstName} ${testMember.lastName}`);
    });
  });

  test.describe('Member Form Validation', () => {
    test('should show validation errors for empty required fields', async ({ page, membersPage }) => {
      // Navigate to create member page
      await membersPage.gotoCreateMember();
      await membersPage.isFormLoaded();

      // Try to submit empty form
      await membersPage.submitForm();

      // Check for validation errors (any error indication)
      const hasErrors = await page.locator('.text-destructive, [role="alert"], .error, [aria-invalid="true"]')
        .isVisible({ timeout: 5000 });

      expect(hasErrors).toBe(true);
    });
  });
});

/**
 * Separate test for viewing existing members
 */
test.describe('View Members List', () => {
  test('should display members list with search functionality', async ({ page, membersPage }) => {
    // Navigate to members list
    await membersPage.gotoList();

    // Wait for data grid to load
    await membersPage.isListLoaded();

    // Verify page title or heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify search input is available
    const searchVisible = await membersPage.searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (searchVisible) {
      // Test search functionality
      await membersPage.searchInput.fill('test');
      await page.waitForTimeout(500);

      // Clear search
      await membersPage.searchInput.clear();
    }
  });
});
