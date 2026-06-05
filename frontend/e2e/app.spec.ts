import { test, expect } from '@playwright/test';

test.describe('Research Workspace', () => {
  test('should load the homepage and display navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check if the title is correct
    await expect(page).toHaveTitle(/Research/i);

    // Verify main navigation items
    await expect(page.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Literature/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Notes/i })).toBeVisible();
  });
});
