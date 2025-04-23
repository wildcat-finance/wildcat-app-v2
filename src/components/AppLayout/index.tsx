import { Box } from "@mui/material"

import {
  BackgroundContainer,
  ContentContainer,
  PageContainer,
} from "@/app/[locale]/layout-style"
import Header from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"

export const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Box sx={BackgroundContainer} />
    <Box position="relative" zIndex="1">
      <Header />
      <Box sx={PageContainer}>
        <Box sx={ContentContainer}>
          <Sidebar />
          <Box width="100%">{children}</Box>
        </Box>
        {/* <Footer /> */}
      </Box>
    </Box>
  </>
)
