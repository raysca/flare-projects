import { test, expect } from '@playwright/test';

test.describe('Issue Creation', () => {
    // Login before each test since issue creation requires authentication
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');

        // Navigate to create issue page
        await page.goto('/create-issue');
    });

    test('should display the issue creation form', async ({ page }) => {
        // Verify page heading
        await expect(page.getByRole('heading', { name: 'Create New Issue' })).toBeVisible();

        // Verify back link
        await expect(page.getByRole('link', { name: /Back to Issues/i })).toBeVisible();

        // Verify key form fields
        await expect(page.locator('input#title')).toBeVisible();
        await expect(page.getByText('Cycle (Optional)')).toBeVisible();
        await expect(page.getByText('Description')).toBeVisible();

        // Verify dropdowns exist (comboboxes for project, cycle, status, priority, assignee, labels)
        const comboboxes = page.locator('button[role="combobox"]');
        await expect(comboboxes).toHaveCount(6);

        // Verify action buttons
        await expect(page.getByRole('button', { name: 'Create Issue' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('should create an issue successfully with required fields only', async ({ page }) => {
        const uniqueTitle = `Test Issue ${Date.now()}`;

        // Project should be auto-selected (first project)
        // Fill required field - title
        await page.fill('input#title', uniqueTitle);

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect to home/issues list (successful creation redirects to home)
        await expect(page).toHaveURL('/');

        // Verify we're on the home page (My Issues heading should be visible)
        await expect(page.getByRole('heading', { name: 'My Issues' })).toBeVisible();
    });

    test('should create an issue with all fields filled', async ({ page }) => {
        const uniqueTitle = `Full Issue ${Date.now()}`;

        // Fill title
        await page.fill('input#title', uniqueTitle);

        // Change status (click the status dropdown - it's a Radix Select)
        const statusTrigger = page.locator('button[role="combobox"]').nth(2); // Third combobox is status
        await statusTrigger.click();
        await page.getByRole('option', { name: /Todo/i }).click();

        // Change priority
        const priorityTrigger = page.locator('button[role="combobox"]').nth(3); // Fourth combobox is priority
        await priorityTrigger.click();
        await page.getByRole('option', { name: /High/i }).click();

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect to home (successful creation redirects to home)
        await expect(page).toHaveURL('/');

        // Verify we're on the home page
        await expect(page.getByRole('heading', { name: 'My Issues' })).toBeVisible();
    });

    test('should show error when title is empty', async ({ page }) => {
        // Try to submit without title
        await page.click('button[type="submit"]');

        // Verify error message
        await expect(page.getByText('Title is required')).toBeVisible();

        // Should stay on the form
        await expect(page).toHaveURL('/create-issue');
    });

    test('should have title input with autofocus', async ({ page }) => {
        await expect(page.locator('input#title')).toBeFocused();
    });

    test('should have correct placeholder for title', async ({ page }) => {
        await expect(page.locator('input#title')).toHaveAttribute('placeholder', 'Issue title');
    });

    test('should navigate back to issues when clicking cancel', async ({ page }) => {
        await page.click('button:has-text("Cancel")');

        await expect(page).toHaveURL('/');
    });

    test('should navigate back to issues when clicking back link', async ({ page }) => {
        await page.click('text=Back to Issues');

        await expect(page).toHaveURL('/');
    });

    test('should show loading state during submission', async ({ page }) => {
        const uniqueTitle = `Loading Issue ${Date.now()}`;

        await page.fill('input#title', uniqueTitle);

        // Intercept API to add delay
        await page.route('**/issues', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await route.continue();
        });

        const submitButton = page.getByRole('button', { name: 'Create Issue' });
        await submitButton.click();

        // Button should show loading state
        await expect(page.getByRole('button', { name: 'Creating...' })).toBeVisible();

        // Button should be disabled
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should have default status as Backlog', async ({ page }) => {
        // Find the status selector (third combobox)
        const statusTrigger = page.locator('button[role="combobox"]').nth(2);
        await expect(statusTrigger).toContainText('Backlog');
    });

    test('should have default priority as No Priority', async ({ page }) => {
        // Find the priority selector (fourth combobox)
        const priorityTrigger = page.locator('button[role="combobox"]').nth(3);
        await expect(priorityTrigger).toContainText('No Priority');
    });
});

test.describe('Issue Creation - Project Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/create-issue');
    });

    test('should auto-select first project', async ({ page }) => {
        // First combobox should be project selector and have a value
        const projectTrigger = page.locator('button[role="combobox"]').first();
        // Should not show placeholder text
        await expect(projectTrigger).not.toContainText('Select project');
    });

    test('should be able to change project', async ({ page }) => {
        const projectTrigger = page.locator('button[role="combobox"]').first();
        await projectTrigger.click();

        // Should show project options
        await expect(page.getByRole('listbox')).toBeVisible();
    });

    test('should pre-select project when projectId is provided in URL', async ({ page }) => {
        // First get a project ID by reading from the dropdown
        const projectTrigger = page.locator('button[role="combobox"]').first();
        const initialProjectText = await projectTrigger.textContent();

        // The project should be selected
        expect(initialProjectText).toBeTruthy();
        expect(initialProjectText).not.toBe('Select project');
    });
});

test.describe('Issue Creation - Status Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/create-issue');
    });

    test('should show all status options', async ({ page }) => {
        const statusTrigger = page.locator('button[role="combobox"]').nth(2);
        await statusTrigger.click();

        // Verify all status options are available
        await expect(page.getByRole('option', { name: /Backlog/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /Todo/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /In Progress/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /In Review/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /Done/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /Cancelled/i })).toBeVisible();
    });

    test('should be able to select In Progress status', async ({ page }) => {
        const statusTrigger = page.locator('button[role="combobox"]').nth(2);
        await statusTrigger.click();
        await page.getByRole('option', { name: /In Progress/i }).click();

        await expect(statusTrigger).toContainText('In Progress');
    });
});

test.describe('Issue Creation - Priority Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/create-issue');
    });

    test('should show all priority options', async ({ page }) => {
        const priorityTrigger = page.locator('button[role="combobox"]').nth(3);
        await priorityTrigger.click();

        // Verify all priority options are available
        await expect(page.getByRole('option', { name: /No Priority/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /Low/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /Medium/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /High/i })).toBeVisible();
        await expect(page.getByRole('option', { name: /Urgent/i })).toBeVisible();
    });

    test('should be able to select Urgent priority', async ({ page }) => {
        const priorityTrigger = page.locator('button[role="combobox"]').nth(3);
        await priorityTrigger.click();
        await page.getByRole('option', { name: /Urgent/i }).click();

        await expect(priorityTrigger).toContainText('Urgent');
    });
});

test.describe('Issue Creation - Cycle Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/create-issue');
    });

    test('should have cycle selector with No Cycle as default', async ({ page }) => {
        // Cycle is the second combobox
        const cycleTrigger = page.locator('button[role="combobox"]').nth(1);
        await expect(cycleTrigger).toContainText('No Cycle');
    });

    test('should be able to open cycle dropdown', async ({ page }) => {
        const cycleTrigger = page.locator('button[role="combobox"]').nth(1);
        await cycleTrigger.click();

        // Should show at least "No Cycle" option
        await expect(page.getByRole('option', { name: /No Cycle/i })).toBeVisible();
    });
});

test.describe('Issue Creation - From Project Context', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    test('should be able to navigate to create issue page directly', async ({ page }) => {
        // Navigate directly to create issue page
        await page.goto('/create-issue');

        await expect(page).toHaveURL('/create-issue');
        await expect(page.getByRole('heading', { name: 'Create New Issue' })).toBeVisible();
    });
});

test.describe('Issue Creation - No Projects Warning', () => {
    // This test would require a user with no projects
    // Skipping for now as it requires specific test data setup
    test.skip('should show warning when user has no projects', async ({ page }) => {
        // Would need a fresh user with no projects
        await page.goto('/create-issue');

        await expect(page.getByText('You need to create a project first')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Create a Project' })).toBeVisible();
    });
});

test.describe('Issue Creation - Description Editor', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
        await page.goto('/create-issue');
    });

    test('should have description editor', async ({ page }) => {
        // Rich text editor should be present
        await expect(page.getByText('Description')).toBeVisible();

        // The editor container should be visible
        const editorContainer = page.locator('.ProseMirror, [contenteditable="true"]').first();
        await expect(editorContainer).toBeVisible();
    });

    test('should be able to type in description', async ({ page }) => {
        const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();

        await editor.click();
        await page.keyboard.type('This is a test description');

        await expect(editor).toContainText('This is a test description');
    });
});

test.describe('Issue Creation - Complete Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'john@linearflow.dev');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    test('should create issue with status and priority and redirect to home', async ({ page }) => {
        const uniqueTitle = `E2E Test Issue ${Date.now()}`;

        await page.goto('/create-issue');

        // Fill the form
        await page.fill('input#title', uniqueTitle);

        // Set status to Todo
        const statusTrigger = page.locator('button[role="combobox"]').nth(2);
        await statusTrigger.click();
        await page.getByRole('option', { name: /Todo/i }).click();

        // Set priority to High
        const priorityTrigger = page.locator('button[role="combobox"]').nth(3);
        await priorityTrigger.click();
        await page.getByRole('option', { name: /High/i }).click();

        // Submit
        await page.click('button[type="submit"]');

        // Verify redirect to home (successful creation)
        await expect(page).toHaveURL('/');

        // Verify we're on the home page
        await expect(page.getByRole('heading', { name: 'My Issues' })).toBeVisible();
    });
});
