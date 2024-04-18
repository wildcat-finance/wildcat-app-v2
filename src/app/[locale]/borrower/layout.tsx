import { ReactNode } from "react"

import { Box } from "@mui/material"
import { Sidebar } from "@/components/Sidebar"

import TranslationsProvider from "@/components/TranslationsProvider"
import initTranslations from "@/app/i18n"

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
      <Sidebar />
      <Box width="100%">{children}</Box>
    </TranslationsProvider>
  )
}
