import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

vi.mock('@/pages/HomePage', () => ({ HomePage: () => <div data-testid="home-page" /> }));
vi.mock('@/pages/FilesPage', () => ({ FilesPage: () => <div data-testid="files-page" /> }));
vi.mock('@/pages/LiteraturePage', () => ({ LiteraturePage: () => <div data-testid="literature-page" /> }));
vi.mock('@/pages/QueryPage', () => ({ QueryPage: () => <div data-testid="query-page" /> }));
vi.mock('@/pages/VisualizationPage', () => ({ VisualizationPage: () => <div data-testid="visualization-page" /> }));
vi.mock('@/pages/NotesPage', () => ({ NotesPage: () => <div data-testid="notes-page" /> }));
vi.mock('@/pages/SuggestionsPage', () => ({ SuggestionsPage: () => <div data-testid="suggestions-page" /> }));
vi.mock('@/pages/ExportPage', () => ({ ExportPage: () => <div data-testid="export-page" /> }));
vi.mock('@/pages/NotFoundPage', () => ({ NotFoundPage: () => <div data-testid="not-found-page" /> }));

describe('App', () => {
  it('renders HomePage on / route', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(getByTestId('layout')).toBeDefined();
    expect(getByTestId('home-page')).toBeDefined();
  });

  it('renders FilesPage on /files route', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/files']}>
        <App />
      </MemoryRouter>
    );
    expect(getByTestId('files-page')).toBeDefined();
  });

  it('renders NotFoundPage on unknown route', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/unknown']}>
        <App />
      </MemoryRouter>
    );
    expect(getByTestId('not-found-page')).toBeDefined();
  });
});
