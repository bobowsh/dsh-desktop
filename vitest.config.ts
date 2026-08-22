import { defineConfig } from 'vitest/config'

// Root test files live in ./test and run under Vitest. The bundled
// `packages/*` workspaces ship their own `node --test` suites (run via their
// own package scripts), so they must be excluded here or Vitest fails with
// "No test suite found" when it picks up their node:test files.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts']
  }
})
