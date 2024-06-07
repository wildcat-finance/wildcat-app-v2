import { ReactNode } from "react"

import { Box } from "@mui/material"

import initTranslations from "@/app/i18n"
import { Sidebar } from "@/components/Sidebar"
import TranslationsProvider from "@/components/TranslationsProvider"

const i18nNamespaces = ["en"]

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
