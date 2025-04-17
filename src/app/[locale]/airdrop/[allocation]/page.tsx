"use client"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

import { ClaimCard } from "./ClaimCard"
import { Parameters } from "./Parameters"
import { AllocationAlert } from "../components/AllocationAlert"

export default function AirdropPage() {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "calc(100vh - 60px)",
        padding: "8px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          width: "100%",
          gap: "8px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "28px 16px",
            height: "100%",
            width: "100%",
            gap: "12px",
            justifyContent: "space-between",
            backgroundColor: COLORS.white,
            borderRadius: "12px",
            overflow: "scroll",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Typography
              variant="text2"
              sx={{ color: COLORS.black }}
              textAlign="center"
            >
              {t("airdrop.allocation.yourAddress")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                padding: "12px",
                backgroundColor: COLORS.glitter,
                borderRadius: "12px",
                gap: "12px",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="text2" sx={{ color: COLORS.blueRibbon }}>
                87453gqhrq-485hrq8gv4rb
              </Typography>
              <Button
                variant="text"
                size="small"
                sx={{ color: COLORS.blueRibbon }}
              >
                {t("airdrop.allocation.tryAnother")}
              </Button>
            </Box>
            <Parameters />
          </Box>
          <Typography variant="text4" color={COLORS.santasGrey}>
            {t("footer.rights")}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flex: 2,
            flexDirection: "column",
            padding: "16px 28px",
            height: "100%",
            width: "100%",
            backgroundColor: COLORS.white,
            borderRadius: "12px",
          }}
        >
          <Typography
            variant="title3"
            textAlign="center"
            sx={{ color: COLORS.black }}
          >
            {t("airdrop.allocation.youHaveAllocation", {
              amount: "1",
            })}
          </Typography>
          <AllocationAlert type="expired" date="18-03-25 13:24:56" />
          <ClaimCard />
        </Box>
      </Box>
    </Box>
  )
}
