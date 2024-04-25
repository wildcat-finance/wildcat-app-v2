import { ReactNode } from "react"

import { Box } from "@mui/material"

import initTranslations from "@/app/i18n"
import { Sidebar } from "@/components/Sidebar"
import TranslationsProvider from "@/components/TranslationsProvider"
import { useGetController } from "@/hooks/useGetController"

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
      <Box width="100%" padding="0px 16px 0px 14px">
        {children}
      </Box>
    </TranslationsProvider>
  )
}
