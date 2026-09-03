import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Polyfill URL.createObjectURL and URL.revokeObjectURL in JSDOM
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
  window.URL.revokeObjectURL = vi.fn();
}

// Cleanup testing library after each test
afterEach(() => {
  cleanup();
});
