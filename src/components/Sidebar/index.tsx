import { Box } from "@mui/material"
import { COLORS } from "@/theme/colors"

export const Sidebar = () => {
  let sidebarType

  return (
    <Box
      className="test"
      sx={{
        minHeight: "calc(100vh - 82px)",
        minWidth: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
      }}
    >
      <div />
    </Box>
  )
}
