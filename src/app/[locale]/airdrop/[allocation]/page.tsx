"use client"

import { useState } from "react"

import { Box, Button, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

import { AllocationBox } from "./AllocationBox"
import { ClaimCard } from "./ClaimCard"
import { Parameters } from "./Parameters"
import {
  mainBox,
  leftBox,
  rightBox,
  footerText,
  containerBox,
  leftTitle,
  rightTitle,
} from "./style"
import { AllocationAlert } from "../components/AllocationAlert"

export default function AllocationPage() {
  const { allocation } = useParams()
  const { t } = useTranslation()
  const theme = useTheme()
  const breakpoint = theme.breakpoints
  const isMobile = useMediaQuery(breakpoint.down("sm"))
  const [activated, setActivated] = useState(false)

  const handleActivate = () => {
    setActivated(true)
  }

  const getStatus = () => {
    switch (allocation) {
      case "22222":
        return "expired"
      case "00000":
        return "non-active"
      default:
        return "wrong"
    }
  }

  const isActive = allocation === "11111" || activated

  return (
    <Box sx={containerBox(theme)}>
      <Box sx={mainBox(theme)}>
        <Box sx={rightBox(theme)}>
          {isMobile && <AllocationBox allocation="87453gqhrq-485hrq8gv4rb" />}
          <Typography
            variant="title3"
            textAlign="center"
            sx={rightTitle(theme)}
          >
            {t("airdrop.allocation.youHaveAllocation", {
              amount: "1",
            })}
          </Typography>
          {!isActive && (
            <AllocationAlert
              type={getStatus()}
              date="18-03-25 13:24:56"
              handleActivate={handleActivate}
            />
          )}
          {isActive && (
            <Box
              display="flex"
              flexDirection="column"
              margin="0 auto"
              gap="42px"
              maxWidth="550px"
            >
              <ClaimCard />
              <Box
                display="flex"
                flexDirection="column"
                gap="20px"
                alignItems="center"
                textAlign="center"
                px={{ md: "0px", xs: "12px" }}
                pb={{ md: "0px", xs: "12px" }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  gap={{ md: "12px", xs: "4px" }}
                  px={{ md: "0px", xs: "12px" }}
                >
                  <Typography variant="text1" color={COLORS.blackRock}>
                    {t("airdrop.allocation.tokenDelegation")}
                  </Typography>
                  <Typography variant="text3" color={COLORS.concreetGrey}>
                    {t("airdrop.allocation.giveAnotherWallet")}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  {t("airdrop.allocation.delegateTokens")}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
        <Box sx={leftBox(theme)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Typography
              variant="text2"
              sx={leftTitle(theme)}
              textAlign="center"
            >
              {isMobile
                ? t("airdrop.allocation.detailedInfo")
                : t("airdrop.allocation.yourAddress")}
            </Typography>
            {!isMobile && (
              <AllocationBox allocation="87453gqhrq-485hrq8gv4rb" />
            )}
            <Parameters />
          </Box>
          <Typography
            sx={footerText(theme)}
            variant="text4"
            color={COLORS.santasGrey}
          >
            {t("footer.rights")}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
