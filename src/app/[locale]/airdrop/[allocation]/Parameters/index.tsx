"use client"

import { useState } from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { ParametersItem } from "./components/ParametersItem"
import { ParametersContainer, ParametersContainerColumn } from "./style"
import { AirdropChip } from "../../components/AirdropChip"

export const Parameters = () => {
  const { t } = useTranslation()
  const [showMore, setShowMore] = useState(false)
  const { allocation } = useParams()

  const getStatus = () => {
    switch (allocation) {
      case "22222":
        return "expired"
      case "00000":
        return "non-active"
      case "11111":
        return "active"
      default:
        return "text"
    }
  }

  const mainParameters = [
    {
      title: t("airdrop.allocation.allocation"),
      value: <AirdropChip type={getStatus()} text="Active" />,
    },
    {
      title: t("airdrop.allocation.amount"),
      tooltipText: "add",
      value: "1000 WETH",
    },
    {
      title: t("airdrop.allocation.chainId"),
      value: "98",
    },
  ]

  const additionalParameters = [
    {
      title: t("airdrop.allocation.contract"),
      value: trimAddress("0x0000000000000000000000000000000000000000"),
      copy: "0x0000000000000000000000000000000000000000",
      link: `${EtherscanBaseUrl}/address/0x0000000000000000000000000000000000000000`,
    },
    {
      title: t("airdrop.allocation.claimStartDate"),
      value: "18-03-25 13:24:56",
    },
    {
      title: t("airdrop.allocation.durationWeeks"),
      value: "103",
    },
    {
      title: t("airdrop.allocation.initialUnlock"),
      tooltipText: "add",
      value: "15,000 WETH",
    },
    {
      title: t("airdrop.allocation.amountClaimed"),
      tooltipText: "add",
      value: "15,000 WETH",
    },
    {
      title: t("airdrop.allocation.claimableAmount"),
      value: (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Typography variant="text3">0 WETH</Typography>
          <Button color="secondary" size="small" variant="contained">
            {t("airdrop.allocation.claim")}
          </Button>
        </Box>
      ),
    },
  ]

  return (
    <Box sx={ParametersContainer}>
      <Box sx={ParametersContainerColumn}>
        {mainParameters.map((param, index) => (
          <>
            <ParametersItem
              key={param.title}
              title={param.title}
              tooltipText={param.tooltipText}
              value={param.value}
            />
            {index < mainParameters.length - 1 && (
              <Divider sx={{ margin: "12px 0 12px" }} />
            )}
          </>
        ))}

        {showMore &&
          additionalParameters.map((param) => (
            <>
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                key={param.title}
                title={param.title}
                tooltipText={param.tooltipText}
                value={param.value}
                copy={param.copy}
                link={param.link}
              />
            </>
          ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          onClick={() => setShowMore(!showMore)}
          startIcon={
            <SvgIcon
              component={UpArrow}
              sx={{
                width: "12px",
                height: "12px",
                transform: `rotate(${showMore ? "180deg" : "0deg"})`,
                "& path": {
                  fill: COLORS.blueRibbon,
                },
              }}
            />
          }
          sx={{ color: COLORS.blueRibbon }}
          size="small"
          variant="text"
        >
          {showMore
            ? t("airdrop.allocation.showLess")
            : t("airdrop.allocation.showMore")}
        </Button>
      </Box>
    </Box>
  )
}
