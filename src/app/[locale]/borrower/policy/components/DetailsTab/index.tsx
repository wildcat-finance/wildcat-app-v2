import * as React from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

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
}: DetailsTabProps) => {
  const { t } = useTranslation()

  return (
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
          <DetailsTabItem label={t("common.fields.policyName")} value={name} />
          <DetailsTabItem
            label={t("borrower.editPolicy.accessControl")}
            value={access}
          />
          <DetailsTabItem label={t("common.fields.marketTerm")} value={type} />
        </>
      )}
    </Box>
  )
}
