import { ReactNode } from "react"

import { LenderDataProvider } from "@/app/[locale]/lender/components/LenderDataProvider"

export default function LenderLayout({ children }: { children: ReactNode }) {
  return <LenderDataProvider>{children}</LenderDataProvider>
}
