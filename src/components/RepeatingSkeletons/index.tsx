import * as React from "react"

import { Skeleton, SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type RepeatingSkeletonProps = {
  itemsLength: number
  skeletonSX: SxProps<Theme> | undefined
}

export const RepeatingSkeletons = ({
  itemsLength,
  skeletonSX,
}: RepeatingSkeletonProps) => (
  <>
    {Array.from(
      { length: itemsLength ?? 3 },
      (_, i) => `skeleton-row-${i}`,
    ).map((key) => (
      <Skeleton
        key={key}
        sx={{
          bgcolor: COLORS.athensGrey,
          ...skeletonSX,
        }}
      />
    ))}
  </>
)
