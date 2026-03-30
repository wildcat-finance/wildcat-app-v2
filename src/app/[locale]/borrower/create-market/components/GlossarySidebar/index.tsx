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
          title: t("createMarket.policy.policy.label"),
          description: t("createMarket.policy.policy.glossary"),
        },
        {
          title: t("createMarket.policy.name.label"),
          description: t("createMarket.policy.name.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.BASIC: {
      glossaryArray = [
        {
          title: t("createMarket.basic.asset.label"),
          description: t("createMarket.basic.asset.glossary"),
        },
        {
          title: t("createMarket.basic.tokenName.label"),
          description: t("createMarket.basic.tokenName.glossary"),
        },
        {
          title: t("createMarket.basic.tokenSymbol.label"),
          description: t("createMarket.basic.tokenSymbol.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.MLA: {
      glossaryArray = [
        {
          title: t("createMarket.mla.mla.label"),
          description: t("createMarket.mla.mla.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.FINANCIAL: {
      glossaryArray = [
        {
          title: t("createMarket.financial.maxCapacity.label"),
          description: t("createMarket.financial.maxCapacity.glossary"),
        },
        {
          title: t("createMarket.financial.baseAPR.label"),
          description: t("createMarket.financial.baseAPR.glossary"),
        },
        {
          title: t("createMarket.financial.penaltyAPR.label"),
          description: t("createMarket.financial.penaltyAPR.glossary"),
        },
        {
          title: t("createMarket.financial.ratio.label"),
          description: t("createMarket.financial.ratio.glossary"),
        },
        {
          title: t("createMarket.periods.grace.label"),
          description: t("createMarket.periods.grace.glossary"),
        },
        {
          title: t("createMarket.periods.wdCycle.label"),
          description: t("createMarket.periods.wdCycle.glossary"),
        },
        {
          title: t("createMarket.financial.minDeposit.label"),
          description: t("createMarket.financial.minDeposit.glossary"),
        },
      ]
      break
    }
    case CreateMarketSteps.LRESTRICTIONS: {
      glossaryArray = [
        {
          title: t("createMarket.restrictions.restrictWithdrawals.label",
          ),
          description: t("createMarket.restrictions.restrictWithdrawals.glossary",
          ),
        },
        {
          title: t("createMarket.restrictions.restrictTransfers.label",
          ),
          description: t("createMarket.restrictions.restrictTransfers.glossary",
          ),
        },
        {
          title: t("createMarket.restrictions.disableTransfers.label"),
          description: t("createMarket.restrictions.disableTransfers.glossary",
          ),
        },
      ]
      break
    }
    default: {
      glossaryArray = [
        {
          title: t("createMarket.policy.policy.label"),
          description: t("createMarket.policy.policy.glossary"),
        },
        {
          title: t("createMarket.policy.name.label"),
          description: t("createMarket.policy.name.glossary"),
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
        {t("createMarket.glossary")}
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
