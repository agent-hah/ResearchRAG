import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileUpload } from './FileUpload';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('FileUpload', () => {
  it('renders upload area', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <FileUpload type="csv" />
      </QueryClientProvider>
    );
    
    // Check for "Drop CSV files here" text
    expect(screen.getByText(/Drop CSV files here/i)).toBeInTheDocument();
  });

  it('shows file input', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <FileUpload type="csv" />
      </QueryClientProvider>
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('accepts CSV files', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <FileUpload type="csv" />
      </QueryClientProvider>
    );
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    if (input) {
      expect(input.accept).toContain('.csv');
    }
  });
});
