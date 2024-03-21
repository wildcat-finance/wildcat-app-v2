import { Box } from "@mui/material"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { Footer } from "@/components/Footer"

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
      <Box
        sx={{
          margin: "0 6px",
          borderRadius: "12px 12px 0px 0px",
          backgroundColor: "white",

          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            minHeight: "calc(100vh - 82px - 43px)",
            width: "100%",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <Sidebar />
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  )
}
