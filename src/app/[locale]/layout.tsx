import type { Metadata } from "next"
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"

import { QueryProvider } from "@/providers/QueryProvider"

import "./globals.css"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import { dir } from "i18next"
import Image from "@/assets/pictures/background.webp"
import Header from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Box } from "@mui/material"
import initTranslations from "@/app/i18n"
import { ContentContainer, PageContainer } from "@/app/[locale]/layout-style"
import { cookieToInitialState } from "wagmi"
import { config } from "@/lib/config"
import { headers } from "next/headers"
import { Providers } from "@/providers/Providers"
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

// const initialState = cookieToInitialState(config, headers().get("cookie"))

const i18nNamespaces = ["header", "footer"]

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  const { t } = await initTranslations(locale, i18nNamespaces)

  return (
    <html lang={locale} dir={dir(locale)}>
      <body className={inter.className}>
        {/* <Providers initialState={initialState}> */}
        <Providers>
          <ThemeRegistry>
            <Box
              sx={{
                backgroundImage: `url(${Image.src})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
              }}
            >
              <Header params={{ locale }} />
              <Box sx={PageContainer}>
                <Box sx={ContentContainer}>{children}</Box>
                <Footer />
              </Box>
            </Box>
          </ThemeRegistry>
        </Providers>
      </body>
    </html>
  )
}
