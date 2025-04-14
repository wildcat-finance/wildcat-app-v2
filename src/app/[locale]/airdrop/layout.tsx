import { Box } from "@mui/material"

import Background from "@/assets/pictures/overviewBG.webp"
import { SideAppHeader } from "@/components/SideAppHeader"

export default function AirdropLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box sx={{ height: "-webkit-fill-available" }}>
      <Box
        sx={{
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          position: "fixed",
          backgroundImage: `url(${Background.src})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",

          zIndex: "-1",
        }}
      />
      <SideAppHeader theme="dark" />
      {children}
    </Box>
  )
}
