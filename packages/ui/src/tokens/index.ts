/** Axiom Foundation design tokens as JS constants */

export const colors = {
  paper: "#faf9f6",
  paperElevated: "#ffffff",
  ink: "#1c1917",
  inkSecondary: "#57534e",
  inkMuted: "#a8a29e",
  rule: "#e7e5e4",
  ruleSubtle: "#f5f5f4",
  accent: "#b45309",
  accentHover: "#92400e",
  accentLight: "rgba(180, 83, 9, 0.06)",
  codeBg: "#1c1917",
  codeText: "#e7e5e4",
  success: "#166534",
  warning: "#b45309",
  error: "#991b1b",
} as const;

export const easings = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
