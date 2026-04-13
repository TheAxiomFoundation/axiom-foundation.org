import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['src/_old_pages/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/lib/prism-*/**',
        'src/app/layout.tsx',
        'src/app/atlas/\\[\\[...segments\\]\\]/page.tsx', // thin use(params) wrapper
        'src/app/lab/**', // lab page route
        'src/components/lab/session-card.tsx', // lab page component (tested via lab-components.test)
        'src/hooks/use-sessions.ts', // lab page hook
        'src/_old_pages/**',
        'src/components/posthog-provider.tsx', // client-only PostHog init
        'src/components/gradient-sync.tsx', // client-only DOM effect
        'src/components/landing/autorac-section.tsx', // client-only animated components
        'src/components/landing/hero.tsx', // client-only animated component
      ],
      thresholds: {
        lines: 99,
        functions: 95, // animated components excluded from coverage still count functions
        branches: 97,
        statements: 99,
      },
    },
  },
})
