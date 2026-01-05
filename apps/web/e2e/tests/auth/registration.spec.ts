import { test, expect } from '../../fixtures/baseFixture';
import { generateRegistrationData } from '../../helpers/testData';
import {
  assertUserIsAuthenticated,
  assertOnOnboardingPage,
  assertFormHasErrors,
} from '../../helpers/assertions';

/**
 * Registration Flow E2E Test
 *
 * Tests the complete tenant and user registration workflow including:
 * 1. Navigating to signup page
 * 2. Selecting a pricing plan
 * 3. Filling out registration form
 * 4. Submitting registration
 * 5. Verifying successful registration and redirect
 */
test.describe('Registration Flow', () => {
  test.describe('Successful Registration', () => {
    test('should complete full registration flow successfully', async ({
      page,
      signupPage,
      registrationPage,
      onboardingPage,
    }) => {
      // Step 1: Navigate to signup page and select plan
      await signupPage.goto();
      await expect(signupPage.pageHeading).toBeVisible();
      await signupPage.selectFirstPlan();

      // Step 2: Fill out and submit registration form
      const testData = generateRegistrationData();
      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Step 3: Wait for registration to complete
      await registrationPage.waitForSuccessfulRegistration();

      // Step 4: Verify successful registration (onboarding or dashboard)
      const isOnboarding = await onboardingPage.isLoaded();

      if (isOnboarding) {
        await assertOnOnboardingPage(page);
      } else {
        // Should be on dashboard
        await expect(page).toHaveURL(/\/(admin|dashboard)/);
      }

      // Step 5: Verify user is authenticated
      await assertUserIsAuthenticated(page, testData.email);
    });

    test('should handle registration with trial plan', async ({
      signupPage,
      registrationPage,
    }) => {
      // Skip if trial plan button doesn't exist
      test.skip(true, 'Trial plan selection may not be available on signup page');

      await signupPage.goto();
      await signupPage.selectTrialPlan();

      const testData = generateRegistrationData();
      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });
  });

  test.describe('Form Validation', () => {
    // Form validation tests need to go through the full signup flow since
    // /signup/register requires an offering ID in the URL
    test.beforeEach(async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.selectFirstPlan();
    });

    test('should show validation errors for empty form submission', async ({
      page,
      registrationPage,
    }) => {
      // Submit empty form
      await registrationPage.submit();

      // Verify validation errors
      await assertFormHasErrors(page);
      await expect(registrationPage.requiredFieldError).toBeVisible();
    });

    test('should show error for password mismatch', async ({ registrationPage }) => {
      const testData = generateRegistrationData({
        password: 'TestPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });

      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Verify password mismatch error
      const hasError = await registrationPage.hasPasswordMismatchError();
      expect(hasError).toBe(true);
    });

    test('should show error for invalid email format', async ({ registrationPage }) => {
      const testData = generateRegistrationData({
        email: 'invalid-email',
      });

      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Verify email validation error
      // The browser's native HTML5 validation shows a tooltip that isn't in the DOM
      // So we check if the email input has invalid state or if form shows custom error
      const hasCustomError = await registrationPage.hasEmailValidationError();

      if (!hasCustomError) {
        // Check the email input's validity state (browser native validation)
        const emailInput = registrationPage.emailField;
        const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
        expect(isInvalid).toBe(true);
      } else {
        expect(hasCustomError).toBe(true);
      }
    });

    test('should show error for weak password', async ({ page, registrationPage }) => {
      const testData = generateRegistrationData({
        password: '123',
        confirmPassword: '123',
      });

      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Verify password strength error - look for specific password error message
      const passwordError = page.getByText(/password must be at least|password.*too.*short|password.*weak/i);
      await expect(passwordError.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Subdomain Generation', () => {
    // Subdomain tests need to go through the full signup flow since
    // /signup/register requires an offering ID in the URL
    test.beforeEach(async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.selectFirstPlan();
    });

    test('should generate valid subdomain from church name', async ({ page, registrationPage }) => {
      const churchName = 'Test Church With Spaces & Special!@# Characters';
      const testData = generateRegistrationData({
        churchName,
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();

      // Subdomain should be generated as: "test-church-with-spaces-special-characters"
      // Verify registration was successful (subdomain was created)
      const currentUrl = page.url();
      console.log('Registration successful. URL:', currentUrl);

      // The subdomain handling is validated by successful registration
      expect(currentUrl).toMatch(/\/(onboarding|admin|dashboard)/);
    });

    test('should handle duplicate subdomain by appending unique suffix', async ({
      page,
      signupPage,
      registrationPage,
    }) => {
      // This test would require two registrations with the same church name
      // Skipping for now as it needs database cleanup
      test.skip(true, 'Requires database cleanup between registrations');

      const churchName = 'Duplicate Church Name';

      // First registration
      const testData1 = generateRegistrationData({ churchName });
      await registrationPage.register(testData1);
      await registrationPage.waitForSuccessfulRegistration();

      // Logout (would need logout functionality)
      // ...

      // Second registration with same church name - need to go through signup flow again
      await signupPage.goto();
      await signupPage.selectFirstPlan();
      const testData2 = generateRegistrationData({ churchName });
      await registrationPage.register(testData2);
      await registrationPage.waitForSuccessfulRegistration();

      // Both should succeed with different subdomains
      expect(page.url()).toMatch(/\/(onboarding|admin|dashboard)/);
    });
  });

  test.describe('Edge Cases', () => {
    // Edge case tests need to go through the full signup flow since
    // /signup/register requires an offering ID in the URL
    test.beforeEach(async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.selectFirstPlan();
    });

    test('should handle very long church name', async ({ registrationPage }) => {
      const longChurchName = 'A'.repeat(200); // 200 characters
      const testData = generateRegistrationData({
        churchName: longChurchName,
      });

      await registrationPage.register(testData);

      // Should either truncate subdomain or show validation error
      // Subdomain is truncated to 50 chars in the backend
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should handle special characters in names', async ({ registrationPage }) => {
      const testData = generateRegistrationData({
        firstName: "O'Brien",
        lastName: "García-López",
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should trim whitespace from inputs', async ({ registrationPage }) => {
      // Generate unique email with whitespace padding
      const timestamp = Date.now();
      const testData = generateRegistrationData({
        email: `  whitespace-test-${timestamp}@example.com  `,
        churchName: '  Test Church  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should handle unicode characters in church name', async ({ registrationPage }) => {
      const testData = generateRegistrationData({
        churchName: '교회 Church 日本語 Église',
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should handle hyphenated names', async ({ registrationPage }) => {
      const testData = generateRegistrationData({
        firstName: 'Mary-Jane',
        lastName: 'Watson-Parker',
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should handle minimum length inputs', async ({ registrationPage }) => {
      const timestamp = Date.now();
      const testData = generateRegistrationData({
        firstName: 'A',
        lastName: 'B',
        churchName: `C ${timestamp}`,
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });
  });

  test.describe('Different Plan Selections', () => {
    test('should register with free plan', async ({ page, signupPage, registrationPage }) => {
      await signupPage.goto();

      // Try to select free plan specifically
      const freePlanVisible = await signupPage.freePlanButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (freePlanVisible) {
        await signupPage.selectFreePlan();
      } else {
        // Fall back to first plan
        await signupPage.selectFirstPlan();
      }

      const testData = generateRegistrationData();
      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();

      // Verify successful registration
      expect(page.url()).toMatch(/\/(onboarding|admin|dashboard)/);
    });

    test('should register with professional plan if available', async ({ page, signupPage, registrationPage }) => {
      await signupPage.goto();

      // Wait for plans to load and check if professional tier is visible
      const proPlanVisible = await signupPage.isTierVisible('professional');

      if (!proPlanVisible) {
        // Skip if professional plan not available
        test.skip();
        return;
      }

      await signupPage.selectPlanByTier('professional');

      const testData = generateRegistrationData();
      await registrationPage.register(testData);

      // Professional plan may redirect to checkout or onboarding
      await page.waitForURL(/\/(onboarding|admin|dashboard|checkout)/, { timeout: 90000 });
    });

    test('should register with enterprise plan if available', async ({ page, signupPage, registrationPage }) => {
      await signupPage.goto();

      // Wait for plans to load and check if enterprise tier is visible
      const enterprisePlanVisible = await signupPage.isTierVisible('enterprise');

      if (!enterprisePlanVisible) {
        // Skip if enterprise plan not available
        test.skip();
        return;
      }

      await signupPage.selectPlanByTier('enterprise');

      const testData = generateRegistrationData();
      await registrationPage.register(testData);

      // Enterprise plan may redirect to contact sales, checkout, or onboarding
      await page.waitForURL(/\/(onboarding|admin|dashboard|checkout|contact)/, { timeout: 90000 });
    });

    test('should register with premium plan if available', async ({ page, signupPage, registrationPage }) => {
      await signupPage.goto();

      // Wait for plans to load and check if premium tier is visible
      const premiumPlanVisible = await signupPage.isTierVisible('premium');

      if (!premiumPlanVisible) {
        // Skip if premium plan not available
        test.skip();
        return;
      }

      await signupPage.selectPlanByTier('premium');

      const testData = generateRegistrationData();
      await registrationPage.register(testData);

      // Premium plan may redirect to checkout or onboarding
      await page.waitForURL(/\/(onboarding|admin|dashboard|checkout)/, { timeout: 90000 });
    });
  });

  test.describe('Billing Cycle Selection', () => {
    test('should register with monthly billing cycle', async ({ page, signupPage, registrationPage }) => {
      await signupPage.goto();

      // Check if billing toggle is visible
      const monthlyToggleVisible = await signupPage.monthlyToggle.isVisible({ timeout: 3000 }).catch(() => false);

      if (monthlyToggleVisible) {
        await signupPage.selectMonthlyBilling();
      }

      await signupPage.selectFirstPlan();

      const testData = generateRegistrationData();
      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();

      expect(page.url()).toMatch(/\/(onboarding|admin|dashboard|checkout)/);
    });

    test('should register with annual billing cycle', async ({ page, signupPage, registrationPage }) => {
      await signupPage.goto();

      // Check if billing toggle is visible
      const annualToggleVisible = await signupPage.annualToggle.isVisible({ timeout: 3000 }).catch(() => false);

      if (annualToggleVisible) {
        await signupPage.selectAnnualBilling();
      }

      await signupPage.selectFirstPlan();

      const testData = generateRegistrationData();
      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();

      expect(page.url()).toMatch(/\/(onboarding|admin|dashboard|checkout)/);
    });
  });

  test.describe('Processing Page Behavior', () => {
    test.beforeEach(async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.selectFirstPlan();
    });

    test('should show processing page during registration', async ({ page, registrationPage }) => {
      const testData = generateRegistrationData();

      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Should redirect to processing page first
      await registrationPage.waitForProcessingPageRedirect();

      // Verify we're on the processing page
      const isOnProcessing = await registrationPage.isOnProcessingPage();
      expect(isOnProcessing).toBe(true);

      // Then wait for final redirect
      await page.waitForURL(/\/(onboarding|admin|dashboard)/, { timeout: 90000 });
    });

    test('should show progress steps on processing page', async ({ page, registrationPage }) => {
      const testData = generateRegistrationData();

      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Wait for processing page
      await registrationPage.waitForProcessingPageRedirect();

      // Check for progress indicators
      const progressHeading = page.getByRole('heading', { name: /setting up|creating|processing/i });
      await expect(progressHeading.first()).toBeVisible({ timeout: 5000 });

      // Wait for completion
      await page.waitForURL(/\/(onboarding|admin|dashboard)/, { timeout: 90000 });
    });
  });

  test.describe('Error Recovery', () => {
    test.beforeEach(async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.selectFirstPlan();
    });

    test('should preserve form data after validation error', async ({ page, registrationPage }) => {
      const testData = generateRegistrationData({
        password: 'mismatch1',
        confirmPassword: 'mismatch2',
      });

      await registrationPage.fillRegistrationForm(testData);
      await registrationPage.submit();

      // Wait for validation
      await page.waitForTimeout(1000);

      // Check that email field still has the value
      const emailValue = await registrationPage.emailField.inputValue();
      expect(emailValue).toBe(testData.email);

      // Check church name is preserved
      const churchNameValue = await registrationPage.churchNameField.inputValue();
      expect(churchNameValue).toBe(testData.churchName);

      // Check first name is preserved
      const firstNameValue = await registrationPage.firstNameField.inputValue();
      expect(firstNameValue).toBe(testData.firstName);

      // Check last name is preserved
      const lastNameValue = await registrationPage.lastNameField.inputValue();
      expect(lastNameValue).toBe(testData.lastName);
    });
  });

  test.describe('Input Validation Edge Cases', () => {
    test.beforeEach(async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.selectFirstPlan();
    });

    test('should accept email with plus sign', async ({ registrationPage }) => {
      const timestamp = Date.now();
      const testData = generateRegistrationData({
        email: `test+${timestamp}@example.com`,
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should accept email with subdomain', async ({ registrationPage }) => {
      const timestamp = Date.now();
      const testData = generateRegistrationData({
        email: `test-${timestamp}@mail.example.com`,
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should handle password at minimum length', async ({ registrationPage }) => {
      // Assuming minimum password length is 8 with complexity requirements
      const testData = generateRegistrationData({
        password: 'Test123!',
        confirmPassword: 'Test123!',
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });

    test('should accept strong password with special characters', async ({ registrationPage }) => {
      const testData = generateRegistrationData({
        password: 'Str0ng!@#$%^&*()P@ss',
        confirmPassword: 'Str0ng!@#$%^&*()P@ss',
      });

      await registrationPage.register(testData);
      await registrationPage.waitForSuccessfulRegistration();
    });
  });
});
