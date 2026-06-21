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

// Bounded scroll container that CLIPS the grid (which itself is overflow:visible
// + auto-height). This is what makes the sticky header work like the markets
// tables: rows scrolled above the pinned header are clipped instead of showing
// through. Offset in the calc is the space above the table (top bar, Overview,
// title, chips) — tune if the layout changes.
export const ProfileHealthTableScrollSx = {
  overflowY: "auto" as const,
  maxHeight: "calc(100vh - 300px)",
}

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
