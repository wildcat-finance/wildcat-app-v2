export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 1000,
  lg: 1200,
  xl: 1536,
} as const

// Matches MUI's default exclusive `down("md")` calculation.
export const MOBILE_MAX_WIDTH = BREAKPOINTS.md - 0.05
