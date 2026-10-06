import { COLORS } from "@/theme/colors"

// ── Page-level layout ──────────────────────────────────────────────────────
// Tab root / section / section-title containers, shared by every profile tab.

export const LenderProfilePageContainer = {
  display: "flex",
  flexDirection: "column",
  padding: { xs: "12px 16px", md: "0px" },
  gap: { xs: "4px", md: "36px" },
}

export const LenderProfilePageSection = {
  display: "flex",
  flexDirection: "column",
  borderRadius: { xs: "14px", md: "none" },
  backgroundColor: { xs: COLORS.white, md: "transparent" },
}

export const LenderProfilePageTitleContainer = {
  display: "flex",
  flexDirection: "column",
  gap: { xs: 0, md: "4px" },
  marginBottom: { xs: "4px", md: "24px" },
}

// ── Shared DataGrid styling ────────────────────────────────────────────────
// Auto-height (no internal scroll), non-sticky header, 66px rows. Shared by
// every lender-profile table (ProfileHealth, BorrowerExposure, MarketYield,
// Batches, Transactions).

const DATA_GRID_MIN_HEIGHT = "106px"

export const LenderProfileDataGridSx = {
  overflow: "visible",
  height: "auto !important",
  minHeight: DATA_GRID_MIN_HEIGHT,
  maxWidth: "100%",
  "& .MuiDataGrid-main": {
    overflow: "visible",
    height: "auto !important",
    minHeight: DATA_GRID_MIN_HEIGHT,
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScroller": {
    overflow: "visible",
    height: "auto !important",
    minHeight: "66px",
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScrollerContent": {
    height: "auto !important",
  },
  "& .MuiDataGrid-virtualScrollerRenderZone": {
    position: "static !important" as const,
    transform: "none !important",
  },
  "& .MuiDataGrid-scrollbar": {
    display: "none",
  },
  "& .MuiDataGrid-scrollbarFiller": {
    display: "none",
  },
  // MUI X v7 wraps the column headers in a `position: sticky` topContainer —
  // override it so the header scrolls with the page instead of pinning.
  "& .MuiDataGrid-topContainer": {
    position: "relative" as const,
  },
  "& .MuiDataGrid-columnHeader": {
    padding: 0,
  },
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
  },
  "& .MuiDataGrid-cell": {
    padding: "0px",
    minHeight: "66px",
    height: "auto",
  },
}

export const LenderProfileClickableGridSx = {
  ...LenderProfileDataGridSx,
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
    position: "relative" as const,
    cursor: "pointer",
  },
  "& .MuiDataGrid-cell": {
    padding: "0px",
    minHeight: "66px",
    height: "auto",
    overflow: "visible",
    position: "static" as const,
  },
}

// ── Shared row-link primitives ─────────────────────────────────────────────
// Stretched-anchor pattern: the name cell's <a>::before covers the whole row,
// while interactive elements sit above it via the interactive sx.

export const LenderProfileLinkCell = {
  textDecoration: "none",
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  color: "inherit",
}

export const LenderProfileRowLinkStretchedSx = {
  display: "block",
  width: "100%",
  minWidth: 0,
  textDecoration: "none",
  color: "inherit",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    zIndex: 0,
  },
}

export const LenderProfileRowLinkInteractiveSx = {
  position: "relative" as const,
  zIndex: 1,
}
