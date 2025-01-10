import * as React from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type DetailsTabProps = {
  name?: string
  type?: string
  access?: string
  isLoading: boolean
}

export const DetailsTabItem = ({
  label,
  value,
}: {
  label?: string
  value?: string
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
    <Typography
      variant="text3"
      color={COLORS.santasGrey}
      sx={{ marginBottom: "6px" }}
    >
      {label}
    </Typography>
    <Typography variant="text2" sx={{ marginBottom: "12px" }}>
      {value ?? ""}
    </Typography>
    <Divider />
  </Box>
)

export const DetailsTab = ({
  name,
  type,
  access,
  isLoading,
}: DetailsTabProps) => (
  <Box
    sx={{
      width: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px 16px",
      marginTop: "44px",
    }}
  >
    {isLoading && (
      <>
        <Skeleton
          height="58px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="58px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="58px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      </>
    )}

    {!isLoading && (
      <>
        <DetailsTabItem label="Policy Name" value={name} />
        <DetailsTabItem label="Access Requirements" value={access} />
        <DetailsTabItem label="Market Type" value={type} />
      </>
    )}
  </Box>
)
