import { Box } from "@mui/material"
import { MarketHeader } from "@/components/MarketHeader"
import TranslationsProvider from "@/components/TranslationsProvider"
import initTranslations from "@/app/i18n"

const i18nNamespaces = ["borrowerMarketDetails"]

export default async function Market({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <TranslationsProvider
      namespaces={i18nNamespaces}
      locale={locale}
      resources={resources}
    >
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "806px" }}>
          <MarketHeader />
        </Box>
      </Box>
    </TranslationsProvider>
  )
}
