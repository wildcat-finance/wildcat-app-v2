import { Box, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Info from "@/assets/icons/info_icon.svg"
import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

import { GlossarySidebarProps } from "./interface"
import { GlossaryContainer, GlossaryItem as GlossaryItemStyle } from "./style"
import { getCreateMarketFlowVariant } from "../../flow-variants"

export const GlossarySidebar = ({
  hideGlossary,
  items,
  marketType,
  step,
}: GlossarySidebarProps) => {
  const { t } = useTranslation()
  const glossaryItems =
    items ??
    getCreateMarketFlowVariant(undefined).getGlossaryItems(
      step ?? CreateMarketSteps.POLICY,
      t,
      marketType,
    )
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

      {glossaryItems.map((block) => (
        <Box key={`${block.title}-${block.description}`} sx={GlossaryItemStyle}>
          <Typography variant="text3">{`‣ ${block.title}`}</Typography>

          <Typography variant="text3" color={COLORS.santasGrey}>
            {block.description}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
