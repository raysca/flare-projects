import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
        // Navigate to login page
        await page.goto('/login');

        // Fill login form
        // Assuming these are the selectors - will verify or update if selectors differ
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect to dashboard/home
        await expect(page).toHaveURL('/');

        // Verify user is logged in (check for avatar or logout button)
        // Adjust selector based on actual UI
        await expect(page.getByRole('heading', { name: 'My Issues' })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Adjust error message verification based on actual UI
        await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });
});
