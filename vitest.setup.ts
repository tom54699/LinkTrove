// Vitest-specific setup for jest-dom matchers
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Provide IndexedDB in Node test environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
try { require('fake-indexeddb/auto'); } catch {}

// Ensure DOM is reset between tests to avoid duplicate nodes
afterEach(() => {
  cleanup();
});
