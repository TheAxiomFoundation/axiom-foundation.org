import { style, globalStyle, keyframes } from '@vanilla-extract/css';
import { vars } from '../theme.css';

// ============================================
// KEYFRAMES
// ============================================

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

// ============================================
// UTILITIES
// ============================================

export const icon = style({
  width: '20px',
  height: '20px',
});

export const iconSmall = style({
  width: '16px',
  height: '16px',
});

export const iconMedium = style({
  width: '24px',
  height: '24px',
});

// ============================================
// PAGE STRUCTURE
// ============================================

export const page = style({
  position: 'relative',
  minHeight: '100vh',
  overflowX: 'hidden',
});

export const bgGrid = style({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
  backgroundImage: `
    linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
  `,
  backgroundSize: '80px 80px',
  maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 80%)',
  WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 80%)',
});

export const bgGlow = style({
  position: 'fixed',
  top: '-20%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '150%',
  height: '80%',
  background: `radial-gradient(
    ellipse at center,
    rgba(59, 130, 246, 0.08) 0%,
    rgba(59, 130, 246, 0.02) 40%,
    transparent 70%
  )`,
  pointerEvents: 'none',
  zIndex: 0,
});

// ============================================
// LOGO (used in footer)
// ============================================

export const logoMark = style({
  fontFamily: vars.font.mono,
  fontSize: '1.5rem',
  fontWeight: 600,
  color: vars.color.precision,
  letterSpacing: '-0.02em',
});

export const logoText = style({
  fontFamily: vars.font.display,
  fontSize: '1.25rem',
  color: vars.color.text,
  fontStyle: 'italic',
});

// ============================================
// HERO
// ============================================

export const hero = style({
  position: 'relative',
  zIndex: 1,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.space['5xl']} ${vars.space.xl}`,
});

export const heroContent = style({
  maxWidth: '900px',
  textAlign: 'center',
  opacity: 0,
  transform: 'translateY(40px)',
  transition: `opacity 0.8s ${vars.ease.out}, transform 0.8s ${vars.ease.out}`,
});

export const heroContentVisible = style({
  opacity: 1,
  transform: 'translateY(0)',
});

export const heroBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.lg}`,
  background: 'rgba(59, 130, 246, 0.1)',
  border: `1px solid ${vars.color.border}`,
  borderRadius: '100px',
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  fontWeight: 500,
  color: vars.color.precision,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: vars.space.xl,
});

export const heroBadgeDot = style({
  width: '6px',
  height: '6px',
  background: vars.color.success,
  borderRadius: '50%',
  animation: `${pulse} 2s ease-in-out infinite`,
});

export const heroTitle = style({
  fontFamily: vars.font.display,
  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
  fontWeight: 400,
  lineHeight: 1.1,
  color: vars.color.text,
  marginBottom: vars.space.xl,
});

export const heroTitleAccent = style({
  color: vars.color.precision,
  fontStyle: 'italic',
});

export const heroSubtitle = style({
  fontFamily: vars.font.body,
  fontSize: '1.25rem',
  fontWeight: 300,
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  maxWidth: '600px',
  margin: `0 auto ${vars.space['2xl']}`,
});

export const heroActions = style({
  display: 'flex',
  gap: vars.space.lg,
  justifyContent: 'center',
  marginBottom: vars.space['3xl'],
  flexWrap: 'wrap',
});

export const btnPrimary = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.md} ${vars.space.xl}`,
  background: vars.color.precision,
  color: 'white',
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  fontWeight: 500,
  borderRadius: vars.radius.md,
  textDecoration: 'none',
  transition: `all ${vars.duration.fast}`,
  border: 'none',
  cursor: 'pointer',
  ':hover': {
    background: vars.color.precisionDark,
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
    color: 'white',
  },
});

export const btnSecondary = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.md} ${vars.space.xl}`,
  background: 'transparent',
  color: vars.color.text,
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  fontWeight: 500,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  textDecoration: 'none',
  transition: `all ${vars.duration.fast}`,
  cursor: 'pointer',
  ':hover': {
    background: 'rgba(59, 130, 246, 0.1)',
    borderColor: vars.color.precision,
    color: vars.color.text,
  },
});

export const heroStats = style({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: vars.space['2xl'],
  paddingTop: vars.space['2xl'],
  borderTop: `1px solid ${vars.color.borderSubtle}`,
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      gap: vars.space.lg,
    },
  },
});

export const heroStat = style({
  textAlign: 'center',
});

export const heroStatValue = style({
  display: 'block',
  fontFamily: vars.font.mono,
  fontSize: '2rem',
  fontWeight: 600,
  color: vars.color.text,
  lineHeight: 1,
  marginBottom: vars.space.xs,
});

export const heroStatLabel = style({
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
});

export const heroStatDivider = style({
  width: '1px',
  height: '40px',
  background: vars.color.borderSubtle,
  '@media': {
    '(max-width: 768px)': {
      width: '40px',
      height: '1px',
    },
  },
});

// ============================================
// SECTIONS
// ============================================

export const section = style({
  position: 'relative',
  zIndex: 1,
  padding: `${vars.space['5xl']} ${vars.space.xl}`,
});

export const sectionAlt = style({
  position: 'relative',
  zIndex: 1,
  padding: `${vars.space['5xl']} ${vars.space.xl}`,
  background: `linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, transparent 100%)`,
});

export const sectionContent = style({
  maxWidth: vars.maxWidth,
  margin: '0 auto',
});

export const sectionHeader = style({
  textAlign: 'center',
  marginBottom: vars.space['4xl'],
});

export const sectionLabel = style({
  display: 'inline-block',
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  fontWeight: 500,
  color: vars.color.warmth,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  marginBottom: vars.space.md,
});

export const sectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  color: vars.color.text,
  marginBottom: vars.space.lg,
});

export const sectionSubtitle = style({
  fontFamily: vars.font.body,
  fontSize: '1.1rem',
  fontWeight: 300,
  color: vars.color.textSecondary,
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: 1.6,
});

// ============================================
// CODE TRANSFORM
// ============================================

export const codeTransform = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space.xl,
  marginBottom: vars.space['4xl'],
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const codePanel = style({
  flex: '0 0 340px',
  background: vars.color.voidLight,
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
  overflow: 'hidden',
  opacity: 0.6,
  transform: 'scale(0.98)',
  transition: `all ${vars.duration.slow}`,
  '@media': {
    '(max-width: 768px)': {
      flex: '1 1 100%',
      maxWidth: '100%',
    },
  },
});

export const codePanelActive = style({
  opacity: 1,
  transform: 'scale(1)',
  borderColor: vars.color.precision,
  boxShadow: '0 0 40px rgba(59, 130, 246, 0.15)',
});

export const codePanelRac = style({});

globalStyle(`${codePanelRac} > div:first-child`, {
  background: 'rgba(59, 130, 246, 0.1)',
});

export const codePanelHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.md}`,
  background: 'rgba(255, 255, 255, 0.02)',
  borderBottom: `1px solid ${vars.color.borderSubtle}`,
});

export const codePanelDot = style({
  width: '8px',
  height: '8px',
  background: vars.color.warmth,
  borderRadius: '50%',
});

export const codePanelDotRac = style({
  background: vars.color.precision,
});

export const codePanelLabel = style({
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  color: vars.color.textTertiary,
});

export const codePanelContent = style({
  padding: vars.space.lg,
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  margin: 0,
  minHeight: '180px',
});

export const codeArrow = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space.sm,
  '@media': {
    '(max-width: 768px)': {
      transform: 'rotate(90deg)',
      margin: `${vars.space.md} 0`,
    },
  },
});

export const codeArrowLine = style({
  width: '60px',
  height: '2px',
  background: vars.color.border,
  position: 'relative',
  transition: `background ${vars.duration.base}`,
  '::after': {
    content: '""',
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    border: '5px solid transparent',
    borderLeftColor: 'inherit',
    background: 'transparent',
  },
});

export const codeArrowLineActive = style({
  background: vars.color.precision,
});

export const codeArrowLabel = style({
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  color: vars.color.textTertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  transition: `color ${vars.duration.base}`,
});

export const codeArrowLabelActive = style({
  color: vars.color.precision,
});

// ============================================
// FEATURES
// ============================================

export const features = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: vars.space.xl,
});

export const feature = style({
  padding: vars.space.xl,
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
  transition: `all ${vars.duration.base}`,
  ':hover': {
    background: 'rgba(59, 130, 246, 0.05)',
    borderColor: vars.color.border,
    transform: 'translateY(-4px)',
  },
});

export const featureIcon = style({
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '10px',
  color: vars.color.precision,
  marginBottom: vars.space.lg,
});

export const featureTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.25rem',
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

export const featureDesc = style({
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
});

// ============================================
// AUTORAC PIPELINE
// ============================================

export const autoracPipeline = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space.lg,
  marginBottom: vars.space['3xl'],
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const pipelineStep = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.md,
  padding: `${vars.space.lg} ${vars.space.xl}`,
  background: vars.color.voidLight,
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
  minWidth: '200px',
});

export const pipelineStepNumber = style({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: vars.color.precision,
  color: 'white',
  fontFamily: vars.font.mono,
  fontSize: '0.9rem',
  fontWeight: 600,
  borderRadius: '50%',
});

export const pipelineStepContent = style({});

globalStyle(`${pipelineStepContent} h4`, {
  fontFamily: vars.font.display,
  fontSize: '1.1rem',
  color: vars.color.text,
  marginBottom: vars.space.xs,
});

globalStyle(`${pipelineStepContent} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
});

export const pipelineConnector = style({
  width: '40px',
  height: '2px',
  background: `linear-gradient(90deg, ${vars.color.border}, ${vars.color.precision})`,
  '@media': {
    '(max-width: 768px)': {
      width: '2px',
      height: '24px',
      background: `linear-gradient(180deg, ${vars.color.border}, ${vars.color.precision})`,
    },
  },
});

export const autoracFeatures = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.space['2xl'],
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'center',
      gap: vars.space.md,
    },
  },
});

export const autoracFeature = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textSecondary,
});

globalStyle(`${autoracFeature} svg`, {
  color: vars.color.success,
});

// ============================================
// RLVR GRID
// ============================================

export const rlvrGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: vars.space.xl,
});

export const rlvrCard = style({
  padding: vars.space['2xl'],
  background: `linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.xl,
  transition: `all ${vars.duration.base}`,
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(59, 130, 246, 0.15)',
  },
});

export const rlvrCardIcon = style({
  width: '56px',
  height: '56px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: vars.color.void,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  color: vars.color.precision,
  marginBottom: vars.space.lg,
});

globalStyle(`${rlvrCard} h3`, {
  fontFamily: vars.font.display,
  fontSize: '1.35rem',
  color: vars.color.text,
  marginBottom: vars.space.md,
});

globalStyle(`${rlvrCard} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
});

// ============================================
// ROADMAP
// ============================================

export const roadmapGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: vars.space['2xl'],
});

export const roadmapColumn = style({
  background: vars.color.voidLight,
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.xl,
  padding: vars.space.xl,
});

export const roadmapColumnTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontFamily: vars.font.display,
  fontSize: '1.1rem',
  color: vars.color.text,
  marginBottom: vars.space.xl,
  paddingBottom: vars.space.md,
  borderBottom: `1px solid ${vars.color.borderSubtle}`,
});

globalStyle(`${roadmapColumnTitle} svg`, {
  color: vars.color.precision,
});

export const jurisdiction = style({
  marginBottom: vars.space.lg,
  opacity: 0.7,
  transition: `opacity ${vars.duration.fast}`,
});

export const jurisdictionActive = style({
  opacity: 1,
});

export const jurisdictionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.space.xs,
});

export const jurisdictionName = style({
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textSecondary,
});

export const jurisdictionPercent = style({
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  color: vars.color.precision,
});

export const jurisdictionBar = style({
  height: '4px',
  background: vars.color.void,
  borderRadius: '2px',
  overflow: 'hidden',
});

export const jurisdictionFill = style({
  height: '100%',
  background: `linear-gradient(90deg, ${vars.color.precision}, ${vars.color.warmth})`,
  borderRadius: '2px',
  transition: `width ${vars.duration.slow}`,
});

// ============================================
// SPONSORS
// ============================================

export const sponsors = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.space['3xl'],
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'center',
      gap: vars.space.lg,
    },
  },
});

export const sponsor = style({
  textAlign: 'center',
  padding: `${vars.space.xl} ${vars.space['2xl']}`,
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
  minWidth: '200px',
  transition: `all ${vars.duration.base}`,
  ':hover': {
    borderColor: vars.color.border,
    background: 'rgba(59, 130, 246, 0.05)',
  },
});

export const sponsorName = style({
  display: 'block',
  fontFamily: vars.font.display,
  fontSize: '1.35rem',
  color: vars.color.text,
  marginBottom: vars.space.xs,
});

export const sponsorType = style({
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
});

// ============================================
// CTA
// ============================================

export const ctaSection = style({
  position: 'relative',
  zIndex: 1,
  padding: `${vars.space['5xl']} ${vars.space.xl}`,
  background: `linear-gradient(180deg, ${vars.color.void} 0%, rgba(59, 130, 246, 0.08) 50%, ${vars.color.void} 100%)`,
});

export const ctaContent = style({
  maxWidth: '700px',
  margin: '0 auto',
  textAlign: 'center',
});

export const ctaTitle = style({
  fontFamily: vars.font.display,
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  color: vars.color.text,
  marginBottom: vars.space.lg,
});

export const ctaSubtitle = style({
  fontFamily: vars.font.body,
  fontSize: '1.1rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  marginBottom: vars.space['2xl'],
});

export const ctaActions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.space.lg,
  marginBottom: vars.space['2xl'],
  flexWrap: 'wrap',
});

export const ctaLinks = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.space.xl,
  flexWrap: 'wrap',
});

globalStyle(`${ctaLinks} a`, {
  fontFamily: vars.font.mono,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
  textDecoration: 'none',
  transition: `color ${vars.duration.fast}`,
});

globalStyle(`${ctaLinks} a:hover`, {
  color: vars.color.precision,
});

// ============================================
// FOOTER
// ============================================

export const footer = style({
  position: 'relative',
  zIndex: 1,
  padding: `${vars.space['3xl']} ${vars.space.xl}`,
  borderTop: `1px solid ${vars.color.borderSubtle}`,
});

export const footerContent = style({
  maxWidth: vars.maxWidth,
  margin: '0 auto',
  textAlign: 'center',
});

export const footerLogo = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'center',
  gap: vars.space.sm,
  marginBottom: vars.space.md,
});

export const footerText = style({
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textTertiary,
  marginBottom: vars.space.lg,
});

export const footerLinks = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.space.xl,
});

globalStyle(`${footerLinks} a`, {
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
  textDecoration: 'none',
  transition: `color ${vars.duration.fast}`,
});

globalStyle(`${footerLinks} a:hover`, {
  color: vars.color.text,
});

// ============================================
// MOCK DATA WARNINGS
// ============================================

export const mockDataBanner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.md} ${vars.space.lg}`,
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  borderRadius: vars.radius.md,
  marginBottom: vars.space['2xl'],
  fontFamily: vars.font.mono,
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#ff6b6b',
});

export const mockDataIcon = style({
  fontSize: '1.1rem',
});

export const mockDataLabel = style({
  position: 'absolute',
  top: `-${vars.space.md}`,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: `${vars.space.xs} ${vars.space.md}`,
  background: 'rgba(239, 68, 68, 0.2)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  fontWeight: 600,
  color: '#ff6b6b',
  whiteSpace: 'nowrap',
});

// ============================================
// CODE EXAMPLES TABS
// ============================================

export const codeExamplesContainer = style({
  marginBottom: vars.space['3xl'],
});

export const exampleBar = style({
  display: 'flex',
  gap: vars.space.sm,
  marginBottom: vars.space.md,
  flexWrap: 'wrap',
  justifyContent: 'center',
});

export const examplePill = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  background: 'transparent',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: '100px',
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textSecondary,
  cursor: 'pointer',
  transition: `all ${vars.duration.fast}`,
  ':hover': {
    borderColor: vars.color.border,
    color: vars.color.text,
  },
});

export const examplePillActive = style({
  background: 'rgba(59, 130, 246, 0.1)',
  borderColor: vars.color.precision,
  color: vars.color.precision,
});

export const tabBar = style({
  display: 'flex',
  gap: vars.space.xs,
  marginBottom: vars.space.md,
  justifyContent: 'center',
});

export const tab = style({
  padding: `${vars.space.sm} ${vars.space.lg}`,
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  fontFamily: vars.font.mono,
  fontSize: '0.85rem',
  color: vars.color.textTertiary,
  cursor: 'pointer',
  transition: `all ${vars.duration.fast}`,
  ':hover': {
    color: vars.color.textSecondary,
  },
});

export const tabActive = style({
  borderBottomColor: vars.color.precision,
  color: vars.color.precision,
});

export const codeBlock = style({
  background: vars.color.voidLight,
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
  overflow: 'hidden',
});

export const codeHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.space.sm} ${vars.space.md}`,
  background: 'rgba(255, 255, 255, 0.02)',
  borderBottom: `1px solid ${vars.color.borderSubtle}`,
});

export const codeFilename = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  color: vars.color.textTertiary,
});

export const codeNote = style({
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  color: vars.color.textTertiary,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: vars.radius.sm,
});

export const codeContent = style({
  maxHeight: '500px',
  overflow: 'auto',
});

export const codePre = style({
  margin: 0,
  padding: vars.space.lg,
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  lineHeight: 1.7,
  color: vars.color.textSecondary,
  whiteSpace: 'pre',
  overflowX: 'auto',
});

// ============================================
// COMPARISON TABLE
// ============================================

export const comparisonSection = style({
  marginTop: vars.space['4xl'],
  marginBottom: vars.space['4xl'],
});

export const comparisonTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.5rem',
  color: vars.color.text,
  textAlign: 'center',
  marginBottom: vars.space.sm,
});

export const comparisonSubtitle = style({
  fontFamily: vars.font.body,
  fontSize: '1rem',
  color: vars.color.textSecondary,
  textAlign: 'center',
  marginBottom: vars.space['2xl'],
});

export const tableWrapper = style({
  overflowX: 'auto',
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.borderSubtle}`,
});

export const comparisonTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
});

globalStyle(`${comparisonTable} th`, {
  padding: `${vars.space.md} ${vars.space.lg}`,
  textAlign: 'left',
  fontWeight: 600,
  color: vars.color.text,
  background: 'rgba(255, 255, 255, 0.02)',
  borderBottom: `1px solid ${vars.color.borderSubtle}`,
});

globalStyle(`${comparisonTable} td`, {
  padding: `${vars.space.md} ${vars.space.lg}`,
  borderBottom: `1px solid ${vars.color.borderSubtle}`,
  color: vars.color.textSecondary,
});

globalStyle(`${comparisonTable} tr:last-child td`, {
  borderBottom: 'none',
});

export const racColumnHeader = style({
  background: 'rgba(59, 130, 246, 0.1) !important',
  color: `${vars.color.precision} !important`,
});

export const hasSupport = style({
  color: `${vars.color.success} !important`,
  fontWeight: 500,
});

export const neutralSupport = style({
  color: `${vars.color.warmth} !important`,
});

export const noSupport = style({
  color: `${vars.color.textTertiary} !important`,
});

// ============================================
// FEATURES GRID
// ============================================

export const featuresGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: vars.space.xl,
  marginTop: vars.space['3xl'],
});

export const featureCard = style({
  padding: vars.space.xl,
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
  transition: `all ${vars.duration.base}`,
  ':hover': {
    background: 'rgba(59, 130, 246, 0.05)',
    borderColor: vars.color.border,
    transform: 'translateY(-4px)',
  },
});

export const featureCardIcon = style({
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '10px',
  color: vars.color.precision,
  marginBottom: vars.space.lg,
});

globalStyle(`${featureCard} h3`, {
  fontFamily: vars.font.display,
  fontSize: '1.1rem',
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

globalStyle(`${featureCard} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
});

globalStyle(`${featureCard} code`, {
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  padding: '2px 6px',
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '4px',
  color: vars.color.precision,
});

// ============================================
// VALIDATION TIERS
// ============================================

export const validationSection = style({
  marginTop: vars.space['3xl'],
  marginBottom: vars.space['3xl'],
});

export const validationTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.5rem',
  color: vars.color.text,
  textAlign: 'center',
  marginBottom: vars.space['2xl'],
});

export const validationTiers = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.lg,
  maxWidth: '700px',
  margin: '0 auto',
});

export const validationTier = style({
  display: 'flex',
  gap: vars.space.lg,
  padding: vars.space.xl,
  background: vars.color.voidLight,
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.lg,
});

export const tierNumber = style({
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: vars.color.precision,
  color: 'white',
  fontFamily: vars.font.mono,
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: '50%',
  flexShrink: 0,
});

export const tierContent = style({
  flex: 1,
});

globalStyle(`${tierContent} h4`, {
  fontFamily: vars.font.display,
  fontSize: '1.1rem',
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

globalStyle(`${tierContent} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textSecondary,
  marginBottom: vars.space.sm,
});

globalStyle(`${tierContent} code`, {
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  padding: '2px 6px',
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '4px',
  color: vars.color.precision,
});

export const tierDetail = style({
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: `${vars.color.textTertiary} !important`,
});

export const tierBranch = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
  marginTop: vars.space.md,
  paddingTop: vars.space.md,
  borderTop: `1px solid ${vars.color.borderSubtle}`,
});

export const tierFail = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  color: '#ff6b6b',
});

export const tierPass = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  color: vars.color.success,
});

export const tierConnector = style({
  width: '2px',
  height: '24px',
  background: `linear-gradient(180deg, ${vars.color.border}, ${vars.color.precision})`,
  margin: '0 auto',
});

export const oracleBadges = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  marginBottom: vars.space.sm,
  flexWrap: 'wrap',
});

export const oracleBadge = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  background: 'rgba(59, 130, 246, 0.15)',
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: vars.color.precision,
});

export const reviewerTags = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.space.sm,
  marginBottom: vars.space.sm,
});

globalStyle(`${reviewerTags} span`, {
  padding: `${vars.space.xs} ${vars.space.sm}`,
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  color: vars.color.textSecondary,
});

// ============================================
// SPEC SECTION
// ============================================

export const specContainer = style({
  background: vars.color.voidLight,
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.xl,
  overflow: 'hidden',
});

export const specHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.space.lg} ${vars.space.xl}`,
  background: 'rgba(59, 130, 246, 0.05)',
  borderBottom: `1px solid ${vars.color.borderSubtle}`,
});

export const specTitle = style({
  fontFamily: vars.font.mono,
  fontSize: '1rem',
  fontWeight: 600,
  color: vars.color.precision,
});

export const specToggle = style({
  padding: `${vars.space.sm} ${vars.space.lg}`,
  background: 'transparent',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontFamily: vars.font.body,
  fontSize: '0.85rem',
  color: vars.color.textSecondary,
  cursor: 'pointer',
  transition: `all ${vars.duration.fast}`,
  ':hover': {
    background: 'rgba(59, 130, 246, 0.1)',
    borderColor: vars.color.precision,
    color: vars.color.precision,
  },
});

export const specContent = style({
  maxHeight: '400px',
  overflow: 'hidden',
  transition: `max-height ${vars.duration.slow} ease-in-out`,
});

export const specContentExpanded = style({
  maxHeight: '2000px',
});

export const specPre = style({
  margin: 0,
  padding: vars.space.xl,
  fontFamily: vars.font.mono,
  fontSize: '0.8rem',
  lineHeight: 1.7,
  color: vars.color.textSecondary,
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
});

// ============================================
// LAB SECTION
// ============================================

export const labGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: vars.space.xl,
  marginBottom: vars.space['3xl'],
});

export const labCard = style({
  padding: vars.space['2xl'],
  background: `linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.xl,
  transition: `all ${vars.duration.base}`,
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(59, 130, 246, 0.15)',
  },
});

export const labCardIcon = style({
  width: '56px',
  height: '56px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: vars.color.void,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  color: vars.color.precision,
  marginBottom: vars.space.lg,
});

globalStyle(`${labCard} h3`, {
  fontFamily: vars.font.display,
  fontSize: '1.35rem',
  color: vars.color.text,
  marginBottom: vars.space.md,
});

globalStyle(`${labCard} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  marginBottom: vars.space.md,
});

export const labCardMeta = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.75rem',
  color: vars.color.textTertiary,
});

export const labPluginSection = style({
  marginBottom: vars.space['3xl'],
});

export const labPluginTitle = style({
  fontFamily: vars.font.display,
  fontSize: '1.5rem',
  color: vars.color.text,
  textAlign: 'center',
  marginBottom: vars.space.sm,
});

export const labPluginSubtitle = style({
  fontFamily: vars.font.body,
  fontSize: '1rem',
  color: vars.color.textSecondary,
  textAlign: 'center',
  marginBottom: vars.space['2xl'],
});

export const labPluginGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: vars.space.md,
});

export const labPluginItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.lg}`,
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${vars.color.borderSubtle}`,
  borderRadius: vars.radius.md,
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textSecondary,
  transition: `all ${vars.duration.fast}`,
  ':hover': {
    borderColor: vars.color.border,
    background: 'rgba(59, 130, 246, 0.05)',
  },
});

export const labPluginBadge = style({
  padding: `2px ${vars.space.sm}`,
  background: 'rgba(59, 130, 246, 0.15)',
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: '0.7rem',
  fontWeight: 600,
  color: vars.color.precision,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const labIssueCard = style({
  background: 'rgba(255, 170, 0, 0.05)',
  border: '1px solid rgba(255, 170, 0, 0.3)',
  borderRadius: vars.radius.xl,
  overflow: 'hidden',
});

export const labIssueHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.md} ${vars.space.xl}`,
  background: 'rgba(255, 170, 0, 0.1)',
  borderBottom: '1px solid rgba(255, 170, 0, 0.2)',
  fontFamily: vars.font.display,
  fontSize: '1rem',
  fontWeight: 500,
  color: '#ffaa00',
});

export const labIssueIcon = style({
  fontSize: '1.2rem',
});

export const labIssueContent = style({
  padding: vars.space.xl,
});

globalStyle(`${labIssueContent} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.95rem',
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  margin: 0,
});

globalStyle(`${labIssueContent} strong`, {
  color: vars.color.text,
});

globalStyle(`${labIssueContent} code`, {
  fontFamily: vars.font.mono,
  fontSize: '0.85rem',
  padding: '2px 6px',
  background: 'rgba(255, 170, 0, 0.15)',
  borderRadius: '4px',
  color: '#ffaa00',
});

// Atlas section styles
export const atlasGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: vars.space.lg,
  marginTop: vars.space['2xl'],
  marginBottom: vars.space['2xl'],
});

export const atlasCard = style({
  background: `linear-gradient(135deg, ${vars.color.voidLight} 0%, ${vars.color.void} 100%)`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.xl,
  transition: `all ${vars.duration.base} ${vars.ease.out}`,
  ':hover': {
    borderColor: vars.color.precision,
    transform: 'translateY(-2px)',
  },
});

globalStyle(`${atlasCard} h4`, {
  fontFamily: vars.font.display,
  fontSize: '1.1rem',
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

globalStyle(`${atlasCard} p`, {
  fontFamily: vars.font.body,
  fontSize: '0.9rem',
  color: vars.color.textSecondary,
  lineHeight: 1.5,
  margin: 0,
});

export const atlasFeatures = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
  marginBottom: vars.space['2xl'],
});

export const atlasCta = style({
  display: 'flex',
  justifyContent: 'center',
});
