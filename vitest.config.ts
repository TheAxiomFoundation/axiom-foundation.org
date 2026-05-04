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
    exclude: ['src/_old_pages/**', 'node_modules/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/types.ts', // type-only modules have zero runtime code
        'src/test/**',
        'src/lib/prism-*/**',
        'src/app/api/**/route.ts',
        'src/app/layout.tsx',
        'src/app/axiom/\\[\\[...segments\\]\\]/page.tsx', // thin use(params) wrapper
        'src/app/axiom/\\[\\[...segments\\]\\]/axiom-client.tsx', // thin client boundary wrapper
        'src/app/axiom/ops/page.tsx', // thin route alias
        'src/app/ops/page.tsx', // thin server route wrapper
        'src/app/robots.ts', // Next metadata route, no branching logic
        'src/app/sitemap.ts', // Next metadata route driven by Supabase pagination
        'src/_old_pages/**',
        'src/components/posthog-provider.tsx', // client-only PostHog init
        'src/components/gradient-sync.tsx', // client-only DOM effect
        'src/components/landing/encoder-section.tsx', // client-only animated components
        'src/components/landing/hero.tsx', // client-only animated component
      ],
      thresholds: {
        // Vitest 4/V8 reports a broader executable map for the same
        // tests, especially TSX component branches. Keep thresholds
        // tight to the upgraded runner's measured floor.
        lines: 95,
        functions: 94,
        branches: 86,
        statements: 94,
      },
    },
  },
})
