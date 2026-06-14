import { Page } from '@playwright/test';

/**
 * Mock API responses for E2E tests.
 * 
 * In CI, the backend isn't running, so the Vite dev server's proxy to
 * localhost:8000 produces ECONNREFUSED errors. These mocks intercept
 * API requests at the browser level (before they hit the proxy) and
 * return realistic empty-state responses.
 */

/** Empty-state mock data matching the backend's response shapes. */
const MOCK_RESPONSES: Record<string, unknown> = {
  '/api/v1/query/datasets/': [],
  '/api/v1/literature/': [],
  '/api/v1/rag/stats': {
    total_documents: 0,
    total_chunks: 0,
    total_embeddings: 0,
    index_status: 'empty',
  },
  '/api/v1/query/history': {
    items: [],
    total: 0,
    page: 1,
    page_size: 5,
  },
};

/**
 * Intercepts all `/api/**` requests and returns mock JSON responses.
 * Known routes get specific mock data; unknown API routes get a generic
 * empty 200 to prevent proxy errors without breaking the app.
 */
export async function mockAllApiRoutes(page: Page): Promise<void> {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    // Strip query params for matching
    const pathname = url.pathname;

    // Check for an exact mock first
    const mockData = MOCK_RESPONSES[pathname];
    if (mockData) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      });
    }

    // Fallback: return an empty 200 JSON for any other API route
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}
