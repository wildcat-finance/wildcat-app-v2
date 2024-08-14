import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import { ContentContainer, MenuItemButton } from "@/components/Sidebar/style"

export const LenderListSidebar = () => {
  const { t } = useTranslation()

  return (
    <Box sx={ContentContainer}>
      <BackButton title="Back" />
      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button variant="text" size="medium" sx={MenuItemButton}>
          Editing Lenders List
        </Button>

        <Button variant="text" size="medium" sx={MenuItemButton}>
          Confirmation
        </Button>
      </Box>
    </Box>
  )
}
