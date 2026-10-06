import { ReactNode } from "react"

import { LenderDataProvider } from "@/app/[locale]/lender/components/LenderDataProvider"
import { LenderMobileFooterMenu } from "@/app/[locale]/lender/components/LenderMobileFooterMenu"

export default function LenderLayout({ children }: { children: ReactNode }) {
  return (
    <LenderDataProvider>
      {children}
      <LenderMobileFooterMenu />
    </LenderDataProvider>
  )
}
