import React, { useState } from "react"

import { Box, SvgIcon, Typography, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import Info from "@/assets/icons/info_icon.svg"
import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

import { GlossarySidebarProps } from "./interface"
import { GlossaryContainer, GlossaryItem } from "./style"

const MAX_DESCRIPTION_LENGTH = 60

export const GlossarySidebar = ({
  step,
  hideGlossary,
}: GlossarySidebarProps) => {
  const { t } = useTranslation()
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set())

  let glossaryArray: {
    title: string
    description: string
  }[]

  switch (step) {
    case CreateMarketSteps.POLICY: {
      glossaryArray = [
        {
          title: t("createNewMarket.policy.policy.label"),
          description: t("createNewMarket.policy.policy.glossary"),
        },
        {
          title: t("createNewMarket.policy.name.label"),
          description: t("createNewMarket.policy.name.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.BASIC: {
      glossaryArray = [
        {
          title: t("createNewMarket.basic.asset.label"),
          description: t("createNewMarket.basic.asset.glossary"),
        },
        {
          title: t("createNewMarket.basic.tokenName.label"),
          description: t("createNewMarket.basic.tokenName.glossary"),
        },
        {
          title: t("createNewMarket.basic.tokenSymbol.label"),
          description: t("createNewMarket.basic.tokenSymbol.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.MLA: {
      glossaryArray = [
        {
          title: t("createNewMarket.mla.mla.label"),
          description: t("createNewMarket.mla.mla.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.FINANCIAL: {
      glossaryArray = [
        {
          title: t("createNewMarket.financial.maxCapacity.label"),
          description: t("createNewMarket.financial.maxCapacity.glossary"),
        },
        {
          title: t("createNewMarket.financial.baseAPR.label"),
          description: t("createNewMarket.financial.baseAPR.glossary"),
        },
        {
          title: t("createNewMarket.financial.penaltyAPR.label"),
          description: t("createNewMarket.financial.penaltyAPR.glossary"),
        },
        {
          title: t("createNewMarket.financial.ratio.label"),
          description: t("createNewMarket.financial.ratio.glossary"),
        },
        {
          title: t("createNewMarket.periods.grace.label"),
          description: t("createNewMarket.periods.grace.glossary"),
        },
        {
          title: t("createNewMarket.periods.wdCycle.label"),
          description: t("createNewMarket.periods.wdCycle.glossary"),
        },
        {
          title: t("createNewMarket.financial.minDeposit.label"),
          description: t("createNewMarket.financial.minDeposit.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.LRESTRICTIONS: {
      glossaryArray = [
        {
          title: t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.label",
          ),
          description: t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.glossary",
          ),
        },
        {
          title: t(
            "createNewMarket.lenderRestrictions.restrictTransfers.label",
          ),
          description: t(
            "createNewMarket.lenderRestrictions.restrictTransfers.glossary",
          ),
        },
        {
          title: t("createNewMarket.lenderRestrictions.disableTransfers.label"),
          description: t(
            "createNewMarket.lenderRestrictions.disableTransfers.glossary",
          ),
        },
      ]
      break
    }
    default: {
      glossaryArray = [
        {
          title: t("createNewMarket.policy.policy.label"),
          description: t("createNewMarket.policy.policy.glossary"),
        },
        {
          title: t("createNewMarket.policy.name.label"),
          description: t("createNewMarket.policy.name.glossary"),
        },
      ]
      break
    }
  }

  if (hideGlossary)
    return (
      <Box
        sx={{
          width: "267px",
          minWidth: "267px",
          height: "100%",
        }}
      />
    )

  const toggleExpand = (index: number) => {
    setExpandedIndexes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <Box sx={GlossaryContainer}>
      <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
        <Info />
      </SvgIcon>

      <Typography variant="text1" sx={{ margin: "12px 0 32px" }}>
        {t("createNewMarket.glossary")}
      </Typography>

      {glossaryArray.map((block, i) => {
        const isExpanded = expandedIndexes.has(i)
        const shouldTruncate = block.description.length > MAX_DESCRIPTION_LENGTH

        if (!shouldTruncate) {
          return (
            <Box key={block.title} sx={GlossaryItem}>
              <Typography variant="text3">{`‣ ${block.title}`}</Typography>
              <Typography variant="text3" color={COLORS.santasGrey}>
                {block.description}
              </Typography>
            </Box>
          )
        }

        if (isExpanded) {
          return (
            <Box key={block.title} sx={GlossaryItem}>
              <Typography variant="text3">{`‣ ${block.title}`}</Typography>
              <Typography variant="text3" color={COLORS.santasGrey}>
                {block.description}
              </Typography>
            </Box>
          )
        }

        const truncatedText = block.description.slice(0, MAX_DESCRIPTION_LENGTH)

        return (
          <Box key={block.title} sx={GlossaryItem}>
            <Typography variant="text3">{`‣ ${block.title}`}</Typography>
            <Typography
              variant="text3"
              color={COLORS.santasGrey}
              sx={{ display: "inline" }}
            >
              {truncatedText}
              <Box
                component="span"
                sx={{
                  display: "inline",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(i)}
              >
                …{" "}
                <Box
                  component="span"
                  sx={{
                    color: COLORS.ultramarineBlue,
                    fontWeight: 500,
                    fontSize: 13,
                    lineHeight: "20px",
                    "&:hover": { color: COLORS.blueRibbon },
                  }}
                >
                  show more
                </Box>
              </Box>
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
