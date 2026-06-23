import { COLORS } from "@/theme/colors"

// Minimal filter-chip styling.
export const ProfileHealthChipsRowSx = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "16px",
}

export const profileHealthChipSx = (selected: boolean) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  height: "28px",
  padding: "6px 12px",
  borderRadius: "24px",
  cursor: "pointer",
  appearance: "none",
  backgroundColor: "transparent",
  border: `1px solid ${selected ? COLORS.manate : COLORS.whiteLilac}`,
  transition: "border-color 0.2s ease",
  "&:hover": {
    borderColor: COLORS.manate,
  },
})

const DATA_GRID_MIN_HEIGHT = "106px"

export const ProfileHealthDataGridSx = {
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

export const ProfileHealthClickableGridSx = {
  ...ProfileHealthDataGridSx,
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

export const ProfileHealthLinkCell = {
  textDecoration: "none",
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  color: "inherit",
}

export const ProfileHealthRowLinkStretchedSx = {
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

export const ProfileHealthRowLinkInteractiveSx = {
  position: "relative" as const,
  zIndex: 1,
}
