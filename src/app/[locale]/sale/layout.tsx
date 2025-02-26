import { Box } from "@mui/material"

import { SaleHeader } from "@/app/[locale]/sale/components/SaleHeader"

export default function SaleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box>
      <SaleHeader />
      {children}
    </Box>
  )
}
