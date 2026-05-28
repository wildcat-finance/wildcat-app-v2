import { Box, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Info from "@/assets/icons/info_icon.svg"
import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

import { GlossarySidebarProps } from "./interface"
import { GlossaryContainer, GlossaryItem } from "./style"

export const GlossarySidebar = ({
  step,
  hideGlossary,
}: GlossarySidebarProps) => {
  const { t } = useTranslation()

  let glossaryArray: {
    title: string
    description: string
  }[]

  switch (step) {
    case CreateMarketSteps.POLICY: {
      glossaryArray = [
        {
          title: t("borrower.createMarket.policy.policy.label"),
          description: t("borrower.createMarket.policy.policy.glossary"),
        },
        {
          title: t("borrower.createMarket.policy.name.label"),
          description: t("borrower.createMarket.policy.name.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.BASIC: {
      glossaryArray = [
        {
          title: t("common.fields.underlyingAsset"),
          description: t("borrower.createMarket.basic.asset.glossary"),
        },
        {
          title: t("borrower.createMarket.basic.tokenName.label"),
          description: t("borrower.createMarket.basic.tokenName.glossary"),
        },
        {
          title: t("borrower.createMarket.basic.tokenSymbol.label"),
          description: t("borrower.createMarket.basic.tokenSymbol.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.MLA: {
      glossaryArray = [
        {
          title: t("borrower.createMarket.mla.mla.label"),
          description: t("borrower.createMarket.mla.mla.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.FINANCIAL: {
      glossaryArray = [
        {
          title: t("borrower.createMarket.financial.maxCapacity.label"),
          description: t(
            "borrower.createMarket.financial.maxCapacity.glossary",
          ),
        },
        {
          title: t("borrower.createMarket.financial.baseAPR.label"),
          description: t("borrower.createMarket.financial.baseAPR.glossary"),
        },
        {
          title: t("borrower.createMarket.financial.penaltyAPR.label"),
          description: t("borrower.createMarket.financial.penaltyAPR.glossary"),
        },
        {
          title: t("borrower.createMarket.financial.ratio.label"),
          description: t("borrower.createMarket.financial.ratio.glossary"),
        },
        {
          title: t("borrower.createMarket.periods.grace.label"),
          description: t("borrower.createMarket.periods.grace.glossary"),
        },
        {
          title: t("borrower.createMarket.periods.wdCycle.label"),
          description: t("borrower.createMarket.periods.wdCycle.glossary"),
        },
        {
          title: t("borrower.createMarket.financial.minDeposit.label"),
          description: t("borrower.createMarket.financial.minDeposit.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.LRESTRICTIONS: {
      glossaryArray = [
        {
          title: t(
            "borrower.createMarket.lenderRestrictions.restrictWithdrawals.label",
          ),
          description: t(
            "borrower.createMarket.lenderRestrictions.restrictWithdrawals.glossary",
          ),
        },
        {
          title: t(
            "borrower.createMarket.lenderRestrictions.restrictTransfers.label",
          ),
          description: t(
            "borrower.createMarket.lenderRestrictions.restrictTransfers.glossary",
          ),
        },
        {
          title: t(
            "borrower.createMarket.lenderRestrictions.disableTransfers.label",
          ),
          description: t(
            "borrower.createMarket.lenderRestrictions.disableTransfers.glossary",
          ),
        },
      ]
      break
    }
    default: {
      glossaryArray = [
        {
          title: t("borrower.createMarket.policy.policy.label"),
          description: t("borrower.createMarket.policy.policy.glossary"),
        },
        {
          title: t("borrower.createMarket.policy.name.label"),
          description: t("borrower.createMarket.policy.name.glossary"),
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

  return (
    <Box sx={GlossaryContainer}>
      <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
        <Info />
      </SvgIcon>

      <Typography variant="text1" sx={{ margin: "12px 0 32px" }}>
        {t("borrower.createMarket.glossary")}
      </Typography>

      {glossaryArray.map((block) => (
        <Box sx={GlossaryItem}>
          <Typography variant="text3">{`‣ ${block.title}`}</Typography>

          <Typography variant="text3" color={COLORS.santasGrey}>
            {block.description}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
