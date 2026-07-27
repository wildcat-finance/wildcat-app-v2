import { ReactNode } from "react"

import { Box, SxProps, Theme } from "@mui/material"

// Width of the right-hand column on the market pages. Mirrors the old empty
// right padding (see the lender SectionContainer / borrower content container)
// so swapping the padding for this panel does not shift the main content.
export const MARKET_SIDE_PANEL_WIDTH = "32.3%"

export type MarketSidePanelProps = {
  children?: ReactNode
  sx?: SxProps<Theme>
}

/**
 * Full-height panel that occupies the right-hand column of the lender and
 * borrower market pages — the space that used to be empty right padding. It is
 * a plain container so additional market-side components can be dropped in as
 * children; it renders as empty (and therefore invisible) until they are.
 */
export const MarketSidePanel = ({ children, sx }: MarketSidePanelProps) => (
  <Box
    sx={{
      width: MARKET_SIDE_PANEL_WIDTH,
      flexShrink: 0,
      minHeight: 0,
      overflowY: "auto",
      boxSizing: "border-box",
      ...sx,
    }}
  >
    {children}
  </Box>
)
