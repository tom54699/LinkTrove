// Vitest-specific setup for jest-dom matchers
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure DOM is reset between tests to avoid duplicate nodes
afterEach(() => {
  cleanup();
});
