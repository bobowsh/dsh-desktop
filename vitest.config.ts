import { defineConfig } from 'vitest/config'

// Root test files live in ./test and run under Vitest. The bundled
// `packages/*` workspaces ship their own `node --test` suites (run via their
// own package scripts), so include is scoped to ./test to avoid Vitest
// picking up their node:test files. The pattern covers test/spec in
// ts/js/mjs (local encoding.test.ts and *.mjs backfill tests rely on this).
export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js,mjs}']
  }
})
