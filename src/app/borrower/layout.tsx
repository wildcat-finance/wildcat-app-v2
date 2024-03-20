import { Box } from "@mui/material"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"

export default function BorrowerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box sx={{ backgroundColor: "black" }}>
      <Header />
      <Box
        sx={{
          minHeight: "calc(100vh - 82px)",
          margin: "0 6px",
          borderRadius: "12px 12px 0px 0px",
          backgroundColor: "white",

          display: "flex",
        }}
      >
        <Sidebar />
        {children}
      </Box>
    </Box>
  )
}
