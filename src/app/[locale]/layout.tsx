import "./globals.css"
import { ContentContainer, PageContainer } from "@/app/[locale]/layout-style"
import { Inter } from "next/font/google"
import { Box } from "@mui/material"

import { ReactNode } from "react"
import { dir } from "i18next"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"

import { WagmiQueryProviders } from "@/providers/WagmiQueryProviders"
import { AuthProvider } from "@/providers/AuthProvider"
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"
import Header from "@/components/Header"
import { Footer } from "@/components/Footer"
import Image from "@/assets/pictures/background.webp"

import { config } from "@/lib/config"
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
          <AuthProvider>
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
          </AuthProvider>
        </WagmiQueryProviders>
      </body>
    </html>
  )
}
