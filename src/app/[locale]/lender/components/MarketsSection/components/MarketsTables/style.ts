import { COLORS } from "@/theme/colors"

const DATA_GRID_MIN_HEIGHT = "106px"

export const DataGridSx = {
  overflow: "visible",
  height: "auto !important",
  minHeight: DATA_GRID_MIN_HEIGHT,
  maxWidth: "calc(100vw - 267px)",
  padding: "0 16px",
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
  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: COLORS.white,
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

// Grid styles for tables whose rows navigate to a market page.
// Pairs with the stretched-link pattern (rowLinkStretchedSx): the row is the
// positioning context for the name cell's <a>::before overlay, and cells must
// allow that overlay to escape their box so it can cover the full row width.
export const clickableGridSx = {
  ...DataGridSx,
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

// Applied to the primary row anchor (rendered inside the name cell). The
// ::before pseudo stretches to cover the entire row, giving the whole row
// native anchor semantics (cmd/middle-click, right-click "open in new tab",
// hover URL preview) with a single <a> per row.
export const rowLinkStretchedSx = {
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

// Applied to any interactive element that must remain clickable/hoverable on
// top of the stretched-link overlay (secondary links, buttons, tooltip
// triggers). Raising z-index lifts the element above the ::before overlay so
// its own click/hover events fire instead of the row navigation.
export const rowLinkInteractiveSx = {
  position: "relative" as const,
  zIndex: 1,
}
