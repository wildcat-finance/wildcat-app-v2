import "./globals.css"

import { ReactNode } from "react"

import { Box } from "@mui/material"
import { dir } from "i18next"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import { Toaster } from "react-hot-toast"
import { cookieToInitialState } from "wagmi"

import {
  BackgroundContainer,
  ContentContainer,
  PageContainer,
} from "@/app/[locale]/layout-style"
import initTranslations from "@/app/i18n"
import CookieBanner from "@/components/CookieBanner"
import { Footer } from "@/components/Footer"
import Header from "@/components/Header"
import PollingRegistration from "@/components/PollingRegistration"
import { Sidebar } from "@/components/Sidebar"
import StoreProvider from "@/components/StoreProvider"
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"
import TranslationsProvider from "@/components/TranslationsProvider"
import { config } from "@/lib/config"
import { RedirectsProvider } from "@/providers/RedirectsProvider"
import { SafeProvider } from "@/providers/SafeProvider"
import { WagmiQueryProviders } from "@/providers/WagmiQueryProviders"

import i18nConfig from "../../../i18nConfig"

const i18nNamespaces = ["en"]

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Wildcat - Private Credit, On Your Terms",
}

export function generateStaticParams() {
  return i18nConfig.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  const initialState = cookieToInitialState(config, headers().get("cookie"))
  const { resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <html lang={locale} dir={dir(locale)}>
      <body className={inter.className}>
        <Toaster position="bottom-center" />
        <WagmiQueryProviders initialState={initialState}>
          <SafeProvider>
            <RedirectsProvider>
              <StoreProvider>
                <TranslationsProvider
                  namespaces={i18nNamespaces}
                  locale={locale}
                  resources={resources}
                >
                  {/* <PollingRegistration /> */}
                  <ThemeRegistry>
                    <Box sx={BackgroundContainer} />
                    <Box position="relative" zIndex="1">
                      <Header />
                      <Box sx={PageContainer}>
                        <Box sx={ContentContainer}>
                          <Sidebar />
                          <Box width="calc(100vw - 267px)">{children}</Box>
                          {/* <CookieBanner /> */}
                        </Box>
                        {/* <Footer /> */}
                      </Box>
                    </Box>
                  </ThemeRegistry>
                </TranslationsProvider>
              </StoreProvider>
            </RedirectsProvider>
          </SafeProvider>
        </WagmiQueryProviders>
      </body>
    </html>
  )
}
