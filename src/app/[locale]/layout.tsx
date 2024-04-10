import type { Metadata } from "next"
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"

import { WagmiProvider } from "@/providers/WagmiProvider"
import { QueryProvider } from "@/providers/QueryProvider"

import "./globals.css"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import { dir } from "i18next"
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

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  return (
    <html lang={locale} dir={dir(locale)}>
      <body className={inter.className}>
        <QueryProvider>
          <WagmiProvider>
            <ThemeRegistry>{children}</ThemeRegistry>
          </WagmiProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
