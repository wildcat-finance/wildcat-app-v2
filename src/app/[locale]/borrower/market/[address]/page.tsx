import { Box } from "@mui/material"
import { useParams } from "next/navigation"

import { useGetMarket } from "@/app/[locale]/borrower/market/hooks/useGetMarket"
import initTranslations from "@/app/i18n"
import { MarketHeader } from "@/components/MarketHeader"
import TranslationsProvider from "@/components/TranslationsProvider"

const i18nNamespaces = ["borrowerMarketDetails"]

export default async function NewMarket({
  params: { locale, address },
}: {
  params: { locale: string; address: string }
}) {
  const { resources } = await initTranslations(locale, i18nNamespaces)

  // const { marketAddress } = useParams<{
  //   locale: string
  //   marketAddress: string
  // }>()
  // const { data: market, isInitialLoading: isMarketLoading } = useGetMarket({
  //   marketAddress,
  // })

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
