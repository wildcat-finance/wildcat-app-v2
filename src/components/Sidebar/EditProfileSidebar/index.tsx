import { Box, Button } from "@mui/material"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { ROUTES } from "@/routes"

export const EditProfileSidebar = () => (
  <Box sx={ContentContainer}>
    <BackButton title="Back" link={ROUTES.borrower.profile} />

    <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Edit Borrower Profile
      </Button>
    </Box>
  </Box>
)
