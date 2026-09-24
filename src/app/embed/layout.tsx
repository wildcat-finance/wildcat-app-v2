import { ReactNode } from "react"

import { Inter } from "next/font/google"

import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry"

import { EmbedQueryProvider } from "./components/EmbedQueryProvider"

const inter = Inter({ subsets: ["latin"] })

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <EmbedQueryProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </EmbedQueryProvider>
      </body>
    </html>
  )
}
