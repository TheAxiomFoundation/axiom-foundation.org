import { createGlobalThemeContract, createGlobalTheme, globalStyle } from '@vanilla-extract/css';

/**
 * Rules Foundation Design Tokens
 *
 * Monumental Infrastructure aesthetic: courthouse meets circuit board
 * Typography: Instrument Serif + IBM Plex Sans + JetBrains Mono
 */

export const vars = createGlobalThemeContract({
  font: {
    display: 'font-display',
    body: 'font-body',
    mono: 'font-mono',
  },
  color: {
    void: 'color-void',
    voidLight: 'color-void-light',
    voidLighter: 'color-void-lighter',
    precision: 'color-precision',
    precisionDark: 'color-precision-dark',
    precisionGlow: 'color-precision-glow',
    warmth: 'color-warmth',
    warmthLight: 'color-warmth-light',
    pearl: 'color-pearl',
    pearlMuted: 'color-pearl-muted',
    text: 'color-text',
    textSecondary: 'color-text-secondary',
    textTertiary: 'color-text-tertiary',
    success: 'color-success',
    border: 'color-border',
    borderSubtle: 'color-border-subtle',
  },
  space: {
    xs: 'space-xs',
    sm: 'space-sm',
    md: 'space-md',
    lg: 'space-lg',
    xl: 'space-xl',
    '2xl': 'space-2xl',
    '3xl': 'space-3xl',
    '4xl': 'space-4xl',
    '5xl': 'space-5xl',
  },
  radius: {
    sm: 'radius-sm',
    md: 'radius-md',
    lg: 'radius-lg',
    xl: 'radius-xl',
  },
  ease: {
    out: 'ease-out',
    spring: 'ease-spring',
  },
  duration: {
    fast: 'duration-fast',
    base: 'duration-base',
    slow: 'duration-slow',
    slower: 'duration-slower',
  },
  shadow: {
    glow: 'shadow-glow',
    card: 'shadow-card',
    elevated: 'shadow-elevated',
  },
  maxWidth: 'max-width',
});

createGlobalTheme(':root', vars, {
  font: {
    display: "'Instrument Serif', Georgia, serif",
    body: "'IBM Plex Sans', -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  color: {
    void: '#0a1628',
    voidLight: '#0f1f36',
    voidLighter: '#152644',
    precision: '#3b82f6',
    precisionDark: '#2563eb',
    precisionGlow: 'rgba(59, 130, 246, 0.15)',
    warmth: '#f59e0b',
    warmthLight: '#fbbf24',
    pearl: '#f8fafc',
    pearlMuted: '#e2e8f0',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    success: '#10b981',
    border: 'rgba(59, 130, 246, 0.2)',
    borderSubtle: 'rgba(148, 163, 184, 0.1)',
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
    '5xl': '8rem',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  shadow: {
    glow: '0 0 60px rgba(59, 130, 246, 0.15)',
    card: '0 4px 24px rgba(0, 0, 0, 0.3)',
    elevated: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  maxWidth: '1280px',
});

// Global styles
globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

globalStyle('html', {
  scrollBehavior: 'smooth',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
});

globalStyle('body', {
  fontFamily: vars.font.body,
  backgroundColor: vars.color.void,
  color: vars.color.text,
  lineHeight: 1.6,
  fontSize: '16px',
  overflowX: 'hidden',
});

globalStyle('::selection', {
  background: vars.color.precision,
  color: vars.color.pearl,
});

globalStyle('h1, h2, h3, h4, h5, h6', {
  fontFamily: vars.font.display,
  fontWeight: 400,
  lineHeight: 1.2,
});

globalStyle('code, pre', {
  fontFamily: vars.font.mono,
});

globalStyle('a', {
  color: vars.color.precision,
  textDecoration: 'none',
  transition: `color ${vars.duration.fast}`,
});

globalStyle('a:hover', {
  color: vars.color.warmth,
});

export type Theme = typeof vars;
