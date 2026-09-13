import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    /**
     * The server compiles as ESM under `moduleResolution: nodenext`, so every
     * relative import carries a `.js` extension that only exists after a build.
     * Vite resolves paths literally and would not find them, so the extension is
     * mapped back to the TypeScript source for tests only. The alternative —
     * dropping extensions in source — would break the actual build.
     */
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1.ts' }],
  },
});
