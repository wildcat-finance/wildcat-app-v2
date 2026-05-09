/* JS access points for the CSS variable tokens defined in globals.css.
 *
 * Two layers:
 *   COLORS.*       — legacy raw palette (var(--color-*)). Use these for
 *                    backward compatibility with existing components.
 *   TOKENS.*       — semantic tokens (var(--surface-*), --text-*, etc.).
 *                    Prefer these in new/refactored code.
 *
 * Static* values are theme-invariant (e.g. text on the dark hero strip).
 */

export const COLORS = {
  staticBlack: "#000000",
  staticWhite: "#FFFFFF",

  black: "var(--color-black)",
  black01: "var(--color-black-01)",
  black07: "var(--color-black-07)",
  bunker: "var(--color-bunker)",
  bunker08: "var(--color-bunker-08)",
  cobaltBlack: "var(--color-cobalt-black)",
  bunker03: "var(--color-bunker-03)",
  blackRock: "var(--color-black-rock)",
  blackRock006: "var(--color-black-rock-006)",
  blackRock03: "var(--color-black-rock-03)",
  blackRock07: "var(--color-black-rock-07)",
  blackRock08: "var(--color-black-rock-08)",
  matteSilver: "var(--color-matte-silver)",
  manate: "var(--color-manate)",
  santasGrey: "var(--color-santas-grey)",
  greySuit: "var(--color-grey-suit)",
  iron: "var(--color-iron)",
  whiteLilac: "var(--color-white-lilac)",
  athensGrey: "var(--color-athens-grey)",
  whiteSmoke: "var(--color-white-smoke)",
  blackHaze: "var(--color-black-haze)",
  hintOfRed: "var(--color-hint-of-red)",
  alabaster: "var(--color-alabaster)",
  alabaster05: "var(--color-alabaster-05)",
  white: "var(--color-white)",
  white01: "var(--color-white-01)",
  white03: "var(--color-white-03)",
  white04: "var(--color-white-04)",
  white06: "var(--color-white-06)",

  dullRed: "var(--color-dull-red)",
  dullRed08: "var(--color-dull-red-08)",
  carminePink: "var(--color-carmine-pink)",
  wildWatermelon: "var(--color-wild-watermelon)",
  azalea: "var(--color-azalea)",
  cherub: "var(--color-cherub)",
  remy: "var(--color-remy)",

  butteredRum: "var(--color-buttered-rum)",
  galliano: "var(--color-galliano)",
  oasis: "var(--color-oasis)",

  ultramarineBlue: "var(--color-ultramarine-blue)",
  blueRibbon: "var(--color-blue-ribbon)",
  blueRibbon01: "var(--color-blue-ribbon-01)",
  cornflowerBlue: "var(--color-cornflower-blue)",
  hawkesBlue: "var(--color-hawkes-blue)",
  glitter: "var(--color-glitter)",
  lightGreen: "var(--color-light-green)",

  // ===== Static (theme-invariant) =====
  staticWhiteAlpha10: "var(--static-white-01)",
  staticWhiteAlpha20: "var(--static-white-02)",
  staticWhiteAlpha30: "var(--static-white-03)",
  staticWhiteAlpha40: "var(--static-white-04)",
  staticWhiteAlpha60: "var(--static-white-06)",
  staticWhiteAlpha80: "var(--static-white-08)",
  staticBlackAlpha10: "var(--static-black-01)",
  staticBlackAlpha40: "var(--static-black-04)",
  staticBlackAlpha60: "var(--static-black-06)",
}

export const TOKENS = {
  // Surface
  surfaceCanvas: "var(--surface-canvas)",
  surfaceBase: "var(--surface-base)",
  surfaceSubtle: "var(--surface-subtle)",
  surfaceSoft: "var(--surface-soft)",
  surfaceElevated: "var(--surface-elevated)",
  surfaceCard: "var(--surface-card)",
  surfaceInverse: "var(--surface-inverse)",
  surfaceHeroOverlay: "var(--surface-hero-overlay)",

  // Text
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textTertiary: "var(--text-tertiary)",
  textDisabled: "var(--text-disabled)",
  textOnInverse: "var(--text-on-inverse)",
  textOnAccent: "var(--text-on-accent)",
  textLink: "var(--text-link)",

  // Borders
  borderSubtle: "var(--border-subtle)",
  borderDefault: "var(--border-default)",
  borderStrong: "var(--border-strong)",
  borderFocus: "var(--border-focus)",

  // Action — primary
  actionPrimaryBg: "var(--action-primary-bg)",
  actionPrimaryBgHover: "var(--action-primary-bg-hover)",
  actionPrimaryFg: "var(--action-primary-fg)",
  actionPrimaryDisabledBg: "var(--action-primary-disabled-bg)",
  actionPrimaryDisabledFg: "var(--action-primary-disabled-fg)",

  // Action — secondary
  actionSecondaryBg: "var(--action-secondary-bg)",
  actionSecondaryBgHover: "var(--action-secondary-bg-hover)",
  actionSecondaryFg: "var(--action-secondary-fg)",
  actionSecondaryDisabledBg: "var(--action-secondary-disabled-bg)",
  actionSecondaryDisabledFg: "var(--action-secondary-disabled-fg)",

  // Action — ghost / text
  actionGhostHoverBg: "var(--action-ghost-hover-bg)",
  actionGhostFg: "var(--action-ghost-fg)",

  // Brand
  brandPrimary: "var(--brand-primary)",
  brandPrimaryHover: "var(--brand-primary-hover)",
  brandPrimarySubtle: "var(--brand-primary-subtle)",
  brandPrimaryOn: "var(--brand-primary-on)",

  // Status
  statusSuccessFg: "var(--status-success-fg)",
  statusSuccessBg: "var(--status-success-bg)",
  statusSuccessDot: "var(--status-success-dot)",
  statusWarningFg: "var(--status-warning-fg)",
  statusWarningBg: "var(--status-warning-bg)",
  statusWarningDot: "var(--status-warning-dot)",
  statusErrorFg: "var(--status-error-fg)",
  statusErrorBg: "var(--status-error-bg)",
  statusErrorDot: "var(--status-error-dot)",
  statusInfoFg: "var(--status-info-fg)",
  statusInfoBg: "var(--status-info-bg)",
  statusInfoDot: "var(--status-info-dot)",

  // Hero (always reads on dark hero strip)
  heroFg: "var(--hero-fg)",
  heroFgMuted: "var(--hero-fg-muted)",
  heroFgDim: "var(--hero-fg-dim)",
  heroButtonBg: "var(--hero-button-bg)",
  heroButtonBgHover: "var(--hero-button-bg-hover)",
  heroButtonBorder: "var(--hero-button-border)",

  // Skeleton
  skeletonBg: "var(--skeleton-bg)",
  skeletonShimmer: "var(--skeleton-shimmer)",

  // Shadows
  shadowPopover: "var(--shadow-popover)",
  shadowModal: "var(--shadow-modal)",
  shadowCard: "var(--shadow-card)",
}
