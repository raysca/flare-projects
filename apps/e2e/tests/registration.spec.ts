import { test, expect } from '@playwright/test';

test.describe('Registration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/signup');
    });

    test('should display registration form with all required fields', async ({ page }) => {
        // Verify page title
        await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
        await expect(page.getByText('Get started with LinearFlow today')).toBeVisible();

        // Verify form fields are present
        await expect(page.locator('input#name')).toBeVisible();
        await expect(page.locator('input#email')).toBeVisible();
        await expect(page.locator('input#password')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

        // Verify link to login page
        await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    });

    test('should register successfully with valid credentials', async ({ page }) => {
        // Generate unique email to avoid conflicts
        const uniqueEmail = `test.user.${Date.now()}@example.com`;

        // Fill registration form
        await page.fill('input#name', 'Test User');
        await page.fill('input#email', uniqueEmail);
        await page.fill('input#password', 'password123');

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect to dashboard/home (successful registration)
        await expect(page).toHaveURL('/');

        // Verify we're no longer on signup page and the page has loaded
        await expect(page.getByRole('heading', { name: 'Create an account' })).not.toBeVisible();
    });

    test('should show error when email already exists', async ({ page }) => {
        // Use an email that already exists in the system
        await page.fill('input#name', 'John Doe');
        await page.fill('input#email', 'john@linearflow.dev');
        await page.fill('input#password', 'password123');

        await page.click('button[type="submit"]');

        // Verify error message is shown
        await expect(page.locator('text=already exists')).toBeVisible();
    });

    test('should show validation error for password less than 8 characters', async ({ page }) => {
        await page.fill('input#name', 'Test User');
        await page.fill('input#email', 'newuser@example.com');
        await page.fill('input#password', 'short');

        await page.click('button[type="submit"]');

        // Browser's native validation or API error for short password
        // The form has minLength=8 which triggers browser validation
        const passwordInput = page.locator('input#password');
        await expect(passwordInput).toHaveAttribute('minlength', '8');
    });

    test('should show validation error for invalid email format', async ({ page }) => {
        await page.fill('input#name', 'Test User');
        await page.fill('input#email', 'invalid-email');
        await page.fill('input#password', 'password123');

        // The email input type="email" triggers browser validation
        const emailInput = page.locator('input#email');
        await expect(emailInput).toHaveAttribute('type', 'email');

        // Try to submit - browser validation should prevent it
        await page.click('button[type="submit"]');

        // Page should still be on signup (form not submitted due to validation)
        await expect(page).toHaveURL('/signup');
    });

    test('should require all fields to be filled', async ({ page }) => {
        // Try submitting with empty form
        await page.click('button[type="submit"]');

        // Should stay on signup page due to required validation
        await expect(page).toHaveURL('/signup');

        // Verify required attributes
        await expect(page.locator('input#name')).toHaveAttribute('required', '');
        await expect(page.locator('input#email')).toHaveAttribute('required', '');
        await expect(page.locator('input#password')).toHaveAttribute('required', '');
    });

    test('should show loading state during submission', async ({ page }) => {
        const uniqueEmail = `test.loading.${Date.now()}@example.com`;

        await page.fill('input#name', 'Test User');
        await page.fill('input#email', uniqueEmail);
        await page.fill('input#password', 'password123');

        // Click submit and check for loading state
        const submitButton = page.getByRole('button', { name: 'Create account' });
        await submitButton.click();

        // Button should show loading text briefly
        await expect(page.getByRole('button', { name: 'Creating account...' })).toBeVisible();

        // Wait for navigation to complete
        await expect(page).toHaveURL('/');
    });

    test('should navigate to login page when clicking sign in link', async ({ page }) => {
        await page.click('text=Sign in');

        await expect(page).toHaveURL('/login');
        // Login page has "LinearFlow" as heading and "Sign in to your account" as description
        await expect(page.getByRole('heading', { name: 'LinearFlow' })).toBeVisible();
    });

    test('should display password requirements hint', async ({ page }) => {
        await expect(page.getByText('Must be at least 8 characters long')).toBeVisible();
    });

    test('should have correct input placeholders', async ({ page }) => {
        await expect(page.locator('input#name')).toHaveAttribute('placeholder', 'John Doe');
        await expect(page.locator('input#email')).toHaveAttribute('placeholder', 'name@example.com');
    });

    test('should disable submit button while loading', async ({ page }) => {
        const uniqueEmail = `test.disabled.${Date.now()}@example.com`;

        await page.fill('input#name', 'Test User');
        await page.fill('input#email', uniqueEmail);
        await page.fill('input#password', 'password123');

        // Intercept the API call to slow it down
        await page.route('**/auth/signup', async (route) => {
            // Add a delay to observe the loading state
            await new Promise((resolve) => setTimeout(resolve, 500));
            await route.continue();
        });

        const submitButton = page.getByRole('button', { name: 'Create account' });
        await submitButton.click();

        // Button should be disabled during submission
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });
});
