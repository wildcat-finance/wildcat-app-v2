import { Box, Button } from "@mui/material"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"

export const BorrowerSidebar = () => (
  <Box sx={ContentContainer}>
    <BackButton title="Back" />

    <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Company Profile
      </Button>
    </Box>
  </Box>
)
