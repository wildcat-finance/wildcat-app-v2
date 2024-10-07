import { Box, Switch, Typography } from "@mui/material"
import Link from "next/link"

import initTranslations from "@/app/i18n"
import Logo from "@/assets/icons/logo_white.svg"
import { ContentContainer, NavContainer } from "@/components/Header/style"
import TranslationsProvider from "@/components/TranslationsProvider"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { NotificationButton } from "./NotificationButton"
import { HeaderButton } from "./HeaderButton"

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
        <Link href={ROUTES.borrower.root} style={{ height: "50px" }}>
          <Logo />
        </Link>
        <Box sx={NavContainer}>
          <Typography variant="text2Highlighted" sx={{ color: COLORS.white }}>
            {t("header.role.borrower")}
          </Typography>
          <Switch />
          <Typography variant="text2Highlighted" sx={{ color: COLORS.white }}>
            {t("header.role.lender")}
          </Typography>
        </Box>
        <NotificationButton />
        <HeaderButton />
      </Box>
    </TranslationsProvider>
  )
}
