import type { Metadata } from "next"
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"

import { WagmiProvider } from "@/providers/WagmiProvider"
import { QueryProvider } from "@/providers/QueryProvider"

import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Wildcat Finance",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
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
