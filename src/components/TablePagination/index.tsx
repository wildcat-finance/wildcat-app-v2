import * as React from "react"

import { PaginationItem, SvgIcon, TablePaginationProps } from "@mui/material"
import MuiPagination from "@mui/material/Pagination"
import {
  gridPageCountSelector,
  GridPagination,
  useGridApiContext,
  useGridSelector,
} from "@mui/x-data-grid"

import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"

const ArrowBack = () => (
  <SvgIcon fontSize="small">
    <ArrowLeftIcon />
  </SvgIcon>
)

const ArrowForward = () => (
  <SvgIcon fontSize="small" style={{ rotate: "180deg" }}>
    <ArrowLeftIcon />
  </SvgIcon>
)

function Pagination({
  page,
  onPageChange,
  className,
}: Pick<TablePaginationProps, "page" | "onPageChange" | "className">) {
  const apiRef = useGridApiContext()
  const pageCount = useGridSelector(apiRef, gridPageCountSelector)

  return (
    <MuiPagination
      color="primary"
      shape="rounded"
      size="small"
      className={className}
      count={pageCount}
      page={page + 1}
      renderItem={(item) => (
        <PaginationItem
          slots={{ previous: ArrowBack, next: ArrowForward }}
          {...item}
        />
      )}
      onChange={(event, newPage) => {
        onPageChange(
          event as React.MouseEvent<HTMLButtonElement> | null,
          newPage - 1,
        )
      }}
    />
  )
}

export function TablePagination() {
  return (
    <GridPagination
      labelDisplayedRows={() => null}
      ActionsComponent={Pagination}
    />
  )
}
