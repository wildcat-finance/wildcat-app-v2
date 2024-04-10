import { Box, Switch, Typography } from "@mui/material"

import { ContentContainer, NavContainer } from "@/components/Header/style"

import { TFunction } from "i18next"
import { HeaderButton } from "../HeaderButton"
import Logo from "../../assets/icons/logo_white.svg"

export const Header = ({ t }: { t: TFunction }) => (
  <Box sx={ContentContainer}>
    <Logo />
    <Box sx={NavContainer}>
      <Typography variant="text2Highlighted">{t("header:borrower")}</Typography>
      <Switch />
      <Typography variant="text2Highlighted">{t("header:lender")}</Typography>
    </Box>
    <HeaderButton />
  </Box>
)
