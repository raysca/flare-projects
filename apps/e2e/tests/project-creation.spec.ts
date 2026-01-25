import { test, expect } from '@playwright/test';

test.describe('Project Creation', () => {
    // Login before each test since project creation requires authentication
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');

        // Navigate to projects page
        await page.goto('/projects/new');
    });

    test('should display the project creation form', async ({ page }) => {
        // Verify page heading
        await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();

        // Verify back link
        await expect(page.getByRole('link', { name: /Back to Projects/i })).toBeVisible();

        // Verify form fields
        await expect(page.locator('input#name')).toBeVisible();
        await expect(page.locator('input#identifier')).toBeVisible();
        await expect(page.locator('textarea#description')).toBeVisible();
        await expect(page.locator('input#startDate')).toBeVisible();
        await expect(page.locator('input#targetDate')).toBeVisible();

        // Verify action buttons
        await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('should create a project successfully with required fields only', async ({ page }) => {
        const uniqueName = `Test Project ${Date.now()}`;

        // Fill required fields
        await page.fill('input#name', uniqueName);
        // Identifier is auto-generated, but let's set a custom one
        await page.fill('input#identifier', 'TST');

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect to projects list
        await expect(page).toHaveURL('/projects');

        // Verify project appears in the list (use first() since name appears in multiple elements)
        await expect(page.getByText(uniqueName).first()).toBeVisible();
    });

    test('should create a project with all fields filled', async ({ page }) => {
        const uniqueName = `Full Project ${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Fill all fields
        await page.fill('input#name', uniqueName);
        await page.fill('input#identifier', 'FULL');
        await page.fill('textarea#description', 'This is a test project with all fields filled.');
        await page.fill('input#startDate', today);
        await page.fill('input#targetDate', futureDate);

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect
        await expect(page).toHaveURL('/projects');

        // Verify project appears in the list (use first() since name appears in multiple elements)
        await expect(page.getByText(uniqueName).first()).toBeVisible();
    });

    test('should auto-generate identifier from project name', async ({ page }) => {
        // Type a project name with multiple words
        await page.fill('input#name', 'My Awesome Project');

        // Verify identifier is auto-generated (first letters of each word: MAP)
        const identifierInput = page.locator('input#identifier');
        await expect(identifierInput).toHaveValue('MAP');
    });

    test('should auto-generate identifier from long project name (max 4 words)', async ({ page }) => {
        // Type a project name with more than 4 words
        await page.fill('input#name', 'Very Long Project Name Here');

        // Should only take first 4 words: VLPN
        const identifierInput = page.locator('input#identifier');
        await expect(identifierInput).toHaveValue('VLPN');
    });

    test('should convert identifier to uppercase', async ({ page }) => {
        await page.fill('input#name', 'Test Project');
        await page.fill('input#identifier', 'test');

        const identifierInput = page.locator('input#identifier');
        await expect(identifierInput).toHaveValue('TEST');
    });

    test('should enforce max length of 5 characters for identifier', async ({ page }) => {
        await page.fill('input#name', 'Test Project');

        // Try to type more than 5 characters
        await page.fill('input#identifier', 'TOOLONG');

        const identifierInput = page.locator('input#identifier');
        // Should be truncated to 5 chars
        await expect(identifierInput).toHaveAttribute('maxlength', '5');
    });

    test('should show error when project name is empty', async ({ page }) => {
        // Only fill identifier
        await page.fill('input#identifier', 'TST');

        // Try to submit
        await page.click('button[type="submit"]');

        // Verify error message
        await expect(page.getByText('Project name is required')).toBeVisible();

        // Should stay on the form
        await expect(page).toHaveURL('/projects/new');
    });

    test('should show error when identifier is empty', async ({ page }) => {
        // Fill name and clear the auto-generated identifier
        await page.fill('input#name', 'Test Project');
        await page.fill('input#identifier', '');

        // Try to submit
        await page.click('button[type="submit"]');

        // Verify error message
        await expect(page.getByText('Project identifier is required')).toBeVisible();
    });

    test('should show error for invalid identifier characters', async ({ page }) => {
        await page.fill('input#name', 'Test Project');
        await page.fill('input#identifier', 'T@#');

        await page.click('button[type="submit"]');

        // Verify error message about alphanumeric only
        await expect(page.getByText('Identifier must contain only letters and numbers')).toBeVisible();
    });

    test('should navigate back to projects when clicking cancel', async ({ page }) => {
        await page.click('button:has-text("Cancel")');

        await expect(page).toHaveURL('/projects');
    });

    test('should navigate back to projects when clicking back link', async ({ page }) => {
        await page.click('text=Back to Projects');

        await expect(page).toHaveURL('/projects');
    });

    test('should show loading state during submission', async ({ page }) => {
        const uniqueName = `Loading Test ${Date.now()}`;

        await page.fill('input#name', uniqueName);
        await page.fill('input#identifier', 'LOAD');

        // Intercept API to add delay
        await page.route('**/projects', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await route.continue();
        });

        const submitButton = page.getByRole('button', { name: 'Create Project' });
        await submitButton.click();

        // Button should show loading state
        await expect(page.getByRole('button', { name: 'Creating...' })).toBeVisible();

        // Button should be disabled
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should display identifier hint text', async ({ page }) => {
        await expect(page.getByText(/Used for quick reference/)).toBeVisible();
    });

    test('should have correct placeholder texts', async ({ page }) => {
        await expect(page.locator('input#name')).toHaveAttribute('placeholder', 'e.g. Q1 Product Roadmap');
        await expect(page.locator('input#identifier')).toHaveAttribute('placeholder', 'e.g. Q1PR');
        await expect(page.locator('textarea#description')).toHaveAttribute('placeholder', 'Describe the project goals and scope...');
    });

    test('should autofocus on project name field', async ({ page }) => {
        // The name input should have autofocus
        await expect(page.locator('input#name')).toBeFocused();
    });
});

test.describe('Project Creation - From Projects List', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    test('should navigate to project creation from New Project button', async ({ page }) => {
        await page.goto('/projects');

        // Click New Project button
        await page.click('button:has-text("New Project")');

        await expect(page).toHaveURL('/projects/new');
        await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();
    });

    test('should show Create Project button in empty state', async ({ page }) => {
        // This test assumes the user has no projects
        // In a real scenario, we might need to set up a fresh user
        await page.goto('/projects');

        // If there are no projects, there should be an empty state with Create Project button
        const emptyStateButton = page.locator('text=No projects yet').first();

        if (await emptyStateButton.isVisible()) {
            await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
        }
    });
});

test.describe('Project Creation - Status Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/projects/new');
    });

    test('should have status dropdown with default value', async ({ page }) => {
        // Status label should be visible
        await expect(page.getByText('Status').first()).toBeVisible();

        // Default status should be "Planned" - check the select trigger
        const statusTrigger = page.locator('button[role="combobox"]').first();
        await expect(statusTrigger).toContainText('Planned');
    });

    test('should be able to select different status', async ({ page }) => {
        // Click on the status dropdown trigger (Radix UI Select)
        await page.locator('button[role="combobox"]').first().click();

        // Wait for dropdown to open and select "Active" status
        await page.getByRole('option', { name: /Active/i }).click();

        // Verify selection changed - the trigger should now show Active
        await expect(page.locator('button[role="combobox"]').first()).toContainText('Active');
    });
});

test.describe('Project Creation - Lead Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/projects/new');
    });

    test('should have lead selector', async ({ page }) => {
        // Lead label should be visible
        await expect(page.getByText('Lead').first()).toBeVisible();
    });
});

test.describe('Project Creation - Dates', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/projects/new');
    });

    test('should accept valid date inputs', async ({ page }) => {
        const startDate = '2024-01-15';
        const targetDate = '2024-06-30';

        await page.fill('input#startDate', startDate);
        await page.fill('input#targetDate', targetDate);

        await expect(page.locator('input#startDate')).toHaveValue(startDate);
        await expect(page.locator('input#targetDate')).toHaveValue(targetDate);
    });

    test('should have date inputs with correct type', async ({ page }) => {
        await expect(page.locator('input#startDate')).toHaveAttribute('type', 'date');
        await expect(page.locator('input#targetDate')).toHaveAttribute('type', 'date');
    });
});
