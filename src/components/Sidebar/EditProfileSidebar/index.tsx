import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { ROUTES } from "@/routes"

export const EditProfileSidebar = () => {
  const { t } = useTranslation()
  return (
    <Box sx={ContentContainer}>
      <BackButton title={t("sidebar.back")} link={ROUTES.borrower.profile} />

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button variant="text" size="medium" sx={MenuItemButton}>
          {t("sidebar.editBorrowerProfile")}
        </Button>
      </Box>
    </Box>
  )
}
