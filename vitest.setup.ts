// Vitest-specific setup for jest-dom matchers
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Provide IndexedDB in Node test environment (ESM)
import 'fake-indexeddb/auto';

// Ensure DOM is reset between tests to avoid duplicate nodes
afterEach(() => {
  cleanup();
});
