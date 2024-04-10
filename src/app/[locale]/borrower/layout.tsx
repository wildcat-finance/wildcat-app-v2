import { Box } from "@mui/material"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { Footer } from "@/components/Footer"

import {
  ContentContainer,
  PageContainer,
} from "@/app/[locale]/borrower/layout-style"
import TranslationsProvider from "@/components/TranslationsProvider"
import { ReactNode } from "react"
import initTranslations from "@/app/i18n"
import Image from "../../../assets/pictures/background.webp"

const i18nNamespaces = ["borrowerMarketList", "borrowerMarketDetails"]

export default async function BorrowerLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  const { resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <TranslationsProvider
      namespaces={i18nNamespaces}
      locale={locale}
      resources={resources}
    >
      <Box
        sx={{
          backgroundImage: `url(${Image.src})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
        }}
      >
        <Header />
        <Box sx={PageContainer}>
          <Box sx={ContentContainer}>
            <Sidebar />
            <Box sx={{ width: "100%" }}>{children}</Box>
          </Box>
          <Footer />
        </Box>
      </Box>
    </TranslationsProvider>
  )
}
