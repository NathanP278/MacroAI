import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
