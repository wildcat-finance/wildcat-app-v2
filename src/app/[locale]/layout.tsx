import "./globals.css"

import { ReactNode } from "react"

import { Box } from "@mui/material"
import { dir } from "i18next"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"

import {
  BackgroundContainer,
  ContentContainer,
  PageContainer,
} from "@/app/[locale]/layout-style"
import { Footer } from "@/components/Footer"
import Header from "@/components/Header"
import StoreProvider from "@/components/StoreProvider"
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"
import { config } from "@/lib/config"
import { RedirectsProvider } from "@/providers/RedirectsProvider"
import { WagmiQueryProviders } from "@/providers/WagmiQueryProviders"

import i18nConfig from "../../../i18nConfig"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Wildcat Finance",
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

  return (
    <html lang={locale} dir={dir(locale)}>
      <body className={inter.className}>
        <WagmiQueryProviders initialState={initialState}>
          <RedirectsProvider>
            <StoreProvider>
              <ThemeRegistry>
                <Box sx={BackgroundContainer} />
                <Box position="relative" zIndex="1">
                  <Header params={{ locale }} />
                  <Box sx={PageContainer}>
                    <Box sx={ContentContainer}>{children}</Box>
                    <Footer />
                  </Box>
                </Box>
              </ThemeRegistry>
            </StoreProvider>
          </RedirectsProvider>
        </WagmiQueryProviders>
      </body>
    </html>
  )
}
