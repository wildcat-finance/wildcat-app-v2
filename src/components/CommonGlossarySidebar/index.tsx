import { Box, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Info from "@/assets/icons/info_icon.svg"
import { COLORS } from "@/theme/colors"

export type CommonGlossarySidebarType = {
  glossaryArray: {
    title: string
    description: string
  }[]
  hideGlossary?: boolean
}

export const CommonGlossarySidebar = ({
  glossaryArray,
  hideGlossary,
}: CommonGlossarySidebarType) => {
  const { t } = useTranslation()

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
    <Box
      sx={{
        width: "267px",
        minWidth: "267px",
        flexGrow: 1,
        padding: "44px 44px 0 24px",
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${COLORS.blackRock006}`,
      }}
    >
      <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
        <Info />
      </SvgIcon>

      <Typography variant="text1" sx={{ margin: "12px 0 32px" }}>
        {t("createNewMarket.glossary")}
      </Typography>

      {glossaryArray.map((block) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          <Typography variant="text3">{`‣ ${block.title}`}</Typography>

          <Typography variant="text3" color={COLORS.santasGrey}>
            {block.description}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
