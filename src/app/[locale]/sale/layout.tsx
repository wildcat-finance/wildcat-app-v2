import { Box } from "@mui/material"

import { SideAppHeader } from "@/components/SideAppHeader"

export default function SaleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box>
      <SideAppHeader />
      {children}
    </Box>
  )
}
