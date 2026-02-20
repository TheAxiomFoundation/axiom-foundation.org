import { style, globalStyle } from '@vanilla-extract/css'
import { vars } from '../theme.css'

// ============================================
// PAGE LAYOUT
// ============================================

export const page = style({
  position: 'relative',
  minHeight: '100vh',
  background: vars.color.void,
  color: vars.color.text,
})

export const gridOverlay = style({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
  backgroundImage: `
    linear-gradient(rgba(59, 130, 246, 0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.015) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
})

export const container = style({
  position: 'relative',
  zIndex: 1,
  maxWidth: '1400px',
  margin: '0 auto',
  padding: `${vars.space['3xl']} ${vars.space.xl}`,
})

// ============================================
// PAGE TITLE SECTION
// ============================================

export const pageHeader = style({
  marginBottom: vars.space['3xl'],
  paddingTop: vars.space['4xl'],  // Space for fixed nav header
})

export const headerTop = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.lg,
  marginBottom: vars.space.lg,
})

export const labBadge = style({
  padding: `${vars.space.sm} ${vars.space.lg}`,
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
  border: `1px solid ${vars.color.precision}`,
  borderRadius: '100px',
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: vars.color.precision,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
})

export const headerTitle = style({
  fontFamily: vars.font.display,
  fontSize: 'clamp(2rem, 4vw, 2.5rem)',
  fontWeight: 400,
  color: vars.color.text,
  margin: 0,
})

export const headerMeta = style({
  display: 'flex',
  gap: vars.space.xl,
  flexWrap: 'wrap',
})

export const metaItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
})

export const metaLabel = style({
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
})

export const metaValue = style({
  fontFamily: vars.font.mono,
  fontSize: '0.9rem',
  fontWeight: 600,
  color: vars.color.text,
})

// ============================================
// DATA STATUS BANNERS
// ============================================

export const statusBanner = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.lg,
  padding: `${vars.space.lg} ${vars.space.xl}`,
  borderRadius: vars.radius.lg,
  marginBottom: vars.space.xl,
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  fontWeight: 600,
})

export const statusBannerLoading = style({
  background: 'linear-gradient(135deg, #00d4ff 0%, #0088cc 100%)',
  color: 'white',
})

// ============================================
// TABLE SECTION
// ============================================

export const tableSection = style({
  marginBottom: vars.space['3xl'],
})

// ============================================
// DETAIL PANEL
// ============================================

export const detailPanel = style({
  background: 'rgba(0, 212, 255, 0.03)',
  border: `1px solid rgba(0, 212, 255, 0.2)`,
  borderRadius: vars.radius.lg,
  overflow: 'hidden',
})

export const detailSection = style({
  padding: vars.space.xl,
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
})

export const detailSectionTitle = style({
  fontFamily: vars.font.body,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: vars.color.textTertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: vars.space.md,
})

// ============================================
// SDK SESSIONS
// ============================================

export const sessionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
})

export const sessionCard = style({
  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.03) 0%, rgba(0, 255, 136, 0.02) 100%)',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.xl,
  padding: `${vars.space.xl} ${vars.space['2xl']}`,
  cursor: 'pointer',
  transition: `all ${vars.duration.fast}`,
  position: 'relative',
  overflow: 'hidden',
  ':hover': {
    borderColor: 'rgba(0, 212, 255, 0.3)',
    transform: 'translateY(-2px)',
  },
})

export const sessionGlow = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '2px',
  background: 'linear-gradient(90deg, #00d4ff, #00ff88, #a78bfa)',
  opacity: 0.6,
})

export const sessionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: vars.space.lg,
})

export const sessionBadge = style({
  background: 'linear-gradient(135deg, #00d4ff 0%, #0088cc 100%)',
  color: vars.color.void,
  padding: `${vars.space.xs} ${vars.space.md}`,
  borderRadius: '100px',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

export const sessionId = style({
  fontFamily: vars.font.mono,
  fontSize: '1rem',
  fontWeight: 600,
  color: '#00ff88',
})

export const sessionStats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
  gap: vars.space.lg,
})

export const sessionStat = style({})

globalStyle(`${sessionStat} > div:first-child`, {
  fontSize: '0.65rem',
  color: vars.color.textTertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: vars.space.xs,
})

globalStyle(`${sessionStat} > div:last-child`, {
  fontFamily: vars.font.mono,
  fontSize: '1rem',
  fontWeight: 600,
})

// ============================================
// EMPTY STATE
// ============================================

export const emptyState = style({
  padding: `${vars.space['4xl']} ${vars.space['2xl']}`,
  textAlign: 'center' as const,
  background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.03) 0%, transparent 100%)',
  borderRadius: vars.radius.xl,
  border: '1px dashed rgba(0, 212, 255, 0.2)',
})

export const emptyStateIcon = style({
  marginBottom: vars.space.xl,
  opacity: 0.6,
  color: vars.color.precision,
})

export const emptyStateTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.25rem',
  color: vars.color.text,
  marginBottom: vars.space.sm,
})

export const emptyStateDesc = style({
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textTertiary,
})

// ============================================
// SESSION CARD TITLE
// ============================================

export const sessionTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.1rem',
  color: vars.color.text,
  marginBottom: vars.space.xs,
})

export const sessionIdSecondary = style({
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  color: vars.color.textTertiary,
})

// ============================================
// EVENT TIMELINE
// ============================================

export const timelineContainer = style({
  maxHeight: '400px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
})

export const timelineEvent = style({
  display: 'grid',
  gridTemplateColumns: '40px 100px 120px 1fr',
  gap: vars.space.sm,
  alignItems: 'start',
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.sm,
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: `background ${vars.duration.fast}`,
  ':hover': {
    background: 'rgba(255, 255, 255, 0.04)',
  },
})

export const timelineSeq = style({
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  color: vars.color.textTertiary,
  textAlign: 'right' as const,
})

export const timelineBadge = style({
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  fontWeight: 600,
  padding: `1px ${vars.space.sm}`,
  borderRadius: vars.radius.sm,
  display: 'inline-block',
  textAlign: 'center' as const,
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

export const timelineTime = style({
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  color: vars.color.textTertiary,
})

export const timelineContent = style({
  fontSize: '0.8rem',
  color: vars.color.textSecondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
})

export const timelineContentExpanded = style({
  fontSize: '0.8rem',
  color: vars.color.textSecondary,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
})

export const timelineShowMore = style({
  padding: `${vars.space.md} ${vars.space.lg}`,
  textAlign: 'center' as const,
  color: vars.color.precision,
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  cursor: 'pointer',
  borderRadius: vars.radius.md,
  transition: `background ${vars.duration.fast}`,
  ':hover': {
    background: 'rgba(59, 130, 246, 0.1)',
  },
})
