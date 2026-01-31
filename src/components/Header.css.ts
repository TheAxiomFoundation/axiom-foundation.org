import { style } from '@vanilla-extract/css'
import { vars } from '../theme.css'

export const header = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  padding: `${vars.space.xl} 0`,
  background: `linear-gradient(to bottom, ${vars.color.void} 0%, transparent 100%)`,
  backdropFilter: 'blur(8px)',
})

export const headerContent = style({
  maxWidth: vars.maxWidth,
  margin: '0 auto',
  padding: `0 ${vars.space.xl}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

export const logo = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: vars.space.sm,
  textDecoration: 'none',
})

export const logoMark = style({
  fontFamily: vars.font.mono,
  fontSize: '1.5rem',
  fontWeight: 600,
  color: vars.color.precision,
  letterSpacing: '-0.02em',
})

export const logoText = style({
  fontFamily: vars.font.display,
  fontSize: '1.25rem',
  color: vars.color.text,
  fontStyle: 'italic',
})

export const logoImage = style({
  height: '44px',
  width: 'auto',
})

export const nav = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.xl,
})

export const navLink = style({
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  fontWeight: 500,
  color: vars.color.textSecondary,
  textDecoration: 'none',
  transition: `color ${vars.duration.fast}`,
  display: 'flex',
  alignItems: 'center',
  ':hover': {
    color: vars.color.text,
  },
})

export const navLinkActive = style({
  color: vars.color.text,
})

export const icon = style({
  width: '20px',
  height: '20px',
})
