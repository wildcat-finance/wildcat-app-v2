"use client"

import { useState } from "react"

import { Typography, Button, Box, useTheme, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"

import Clock from "@/assets/icons/clock_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import {
  bottomBox,
  containerBox,
  middleBox,
  topBox,
  mainContainerBox,
  blueBox,
} from "./style"

export const ClaimCard = () => {
  const [claimed, setClaimed] = useState(false)

  const handleClaim = () => {
    setClaimed(true)
  }
  const theme = useTheme()
  const { t } = useTranslation()
  const contractAddress = "0x0000000000000000000000000000000000000000"
  const totalAllocation = "15,000"
  const availableToClaim = "10,000"
  const nextClaimDate = "May 1"
  const totalClaimed = "1,000"

  return (
    <Box sx={mainContainerBox}>
      <Box sx={containerBox(theme, claimed)}>
        <Box sx={topBox}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Typography variant="text2" color={COLORS.concreetGrey}>
              {t("airdrop.claimCard.totalAllocation")}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: "3px" }}>
              <Typography variant="title2" sx={{ mt: 1 }}>
                {totalAllocation}
              </Typography>
              <Typography
                variant="text2"
                sx={{ mt: 1 }}
                color={COLORS.concreetGrey}
              >
                WETH
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: "100%",
            }}
          >
            <Typography variant="text2" color={COLORS.concreetGrey}>
              {t("airdrop.claimCard.contractAddress")}
            </Typography>
            <Box
              display="flex"
              alignItems="center"
              sx={{
                border: `1px solid ${COLORS.whiteLilac}`,
                borderRadius: "8px",
                padding: "4px 12px",
              }}
            >
              <Typography
                variant="text2"
                sx={{ mr: 1 }}
                color={COLORS.blackRock}
              >
                {trimAddress(contractAddress)}
              </Typography>
              <LinkGroup
                linkValue={`${EtherscanBaseUrl}/address/${contractAddress}`}
                copyValue={contractAddress}
              />
            </Box>
          </Box>
        </Box>

        {!claimed && (
          <Box sx={middleBox}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                gap="4px"
              >
                <Typography variant="text2" color={COLORS.concreetGrey}>
                  {t("airdrop.claimCard.availableToClaim")}
                </Typography>
                <Typography
                  variant="title3"
                  fontWeight="600"
                  fontSize="15px"
                  color={COLORS.blackRock}
                >
                  {availableToClaim} WETH
                </Typography>
              </Box>
              <Button onClick={handleClaim} variant="contained">
                {t("airdrop.claimCard.claim")}
              </Button>
            </Box>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="text2" color={COLORS.concreetGrey}>
                {t("airdrop.claimCard.nextClaimOn")}
              </Typography>
              <Typography variant="text2" color={COLORS.concreetGrey}>
                {nextClaimDate}
              </Typography>
            </Box>
            <Box
              display="flex"
              alignItems="center"
              gap="4px"
              flexDirection="column"
              sx={{
                py: "32px",
                position: "absolute",
                left: "0",
                top: "0",
                bottom: "0",
                paddingLeft: "6px",
              }}
            >
              <Box
                sx={{
                  height: "6px",
                  width: "6px",
                  borderRadius: "50%",
                  background: COLORS.ultramarineBlue,
                }}
              />
              <Box
                sx={{
                  flex: 1,
                  width: "2px",
                  background: COLORS.whiteLilac,
                }}
              />
              <Box
                sx={{
                  height: "6px",
                  width: "6px",
                  borderRadius: "50%",
                  background: COLORS.hawkesBlue,
                }}
              />
            </Box>
          </Box>
        )}

        {!claimed && (
          <Box sx={bottomBox(theme)}>
            <Typography variant="text2" color={COLORS.concreetGrey}>
              {t("airdrop.claimCard.claimed")}: {totalClaimed} WETH
            </Typography>
          </Box>
        )}
      </Box>
      {claimed && (
        <Box sx={blueBox(theme)}>
          <SvgIcon
            sx={{
              "& path": { fill: COLORS.blueRibbon },
              marginTop: "2px",
            }}
          >
            <Clock />
          </SvgIcon>
          <Box display="flex" flexDirection="column" gap="6px">
            <Typography
              variant="text2"
              fontWeight="600"
              color={COLORS.ultramarineBlue}
            >
              {t("airdrop.claimCard.nextClaimAvailable")}
            </Typography>
            <Typography variant="text3" color={COLORS.ultramarineBlue}>
              {t("airdrop.claimCard.great")}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}
