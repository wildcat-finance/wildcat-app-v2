import { Box, Switch, Typography } from "@mui/material"

import initTranslations from "@/app/i18n"
import { ContentContainer, NavContainer } from "@/components/Header/style"
import TranslationsProvider from "@/components/TranslationsProvider"
import { COLORS } from "@/theme/colors"

import { HeaderButton } from "./HeaderButton"
import Logo from "../../assets/icons/logo_white.svg"

const i18nNamespaces = ["en"]

export default async function Header({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { t, resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <TranslationsProvider
      namespaces={i18nNamespaces}
      locale={locale}
      resources={resources}
    >
      <Box sx={ContentContainer}>
        <Logo />
        <Box sx={NavContainer}>
          <Typography variant="text2Highlighted" sx={{ color: COLORS.white }}>
            {t("header.role.borrower")}
          </Typography>
          <Switch />
          <Typography variant="text2Highlighted" sx={{ color: COLORS.white }}>
            {t("header.role.lender")}
          </Typography>
        </Box>
        <HeaderButton />
      </Box>
    </TranslationsProvider>
  )
}
