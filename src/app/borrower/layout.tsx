import { Box } from "@mui/material"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { Footer } from "@/components/Footer"

import { ContentContainer, PageContainer } from "@/app/borrower/layout-style"
import Image from "../../assets/pictures/background.webp"

export default function BorrowerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box
      sx={{
        backgroundImage: `url(${Image.src})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      }}
    >
      <Header />
      <Box sx={PageContainer}>
        <Box sx={ContentContainer}>
          <Sidebar />
          <Box sx={{ width: "100%" }}>{children}</Box>
        </Box>
        <Footer />
      </Box>
    </Box>
  )
}
