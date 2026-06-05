import { test, expect } from '@playwright/test';
import { mockAllApiRoutes } from './api-mocks';

test.describe('Research Workspace', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all API calls before navigating so the Vite proxy
    // never attempts to reach the backend (which isn't running in CI).
    await mockAllApiRoutes(page);
  });

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
