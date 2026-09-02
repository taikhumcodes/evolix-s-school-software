import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup testing library after each test
afterEach(() => {
  cleanup();
});
