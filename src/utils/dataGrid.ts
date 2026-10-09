import { GridColDef } from "@mui/x-data-grid"

const DEFAULT_COLUMN_WIDTH = 100
const DEFAULT_COLUMN_MIN_WIDTH = 50

type ColumnWidthDef = Pick<GridColDef, "flex" | "width" | "minWidth">

export const getGridMinWidth = (
  columns: readonly ColumnWidthDef[],
  horizontalPadding = 0,
) =>
  columns.reduce((total, column) => {
    const minWidth = column.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH
    const width = column.flex
      ? minWidth
      : Math.max(column.width ?? DEFAULT_COLUMN_WIDTH, minWidth)
    return total + width
  }, horizontalPadding)
