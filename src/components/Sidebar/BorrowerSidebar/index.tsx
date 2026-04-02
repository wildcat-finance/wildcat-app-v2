import { Box, Button } from "@mui/material"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { ROUTES } from "@/routes"

export const BorrowerSidebar = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  const backLink = pathname.includes(ROUTES.borrower.profile)
    ? ROUTES.borrower.root
    : ROUTES.lender.root

  return (
    <Box sx={ContentContainer}>
      <BackButton title={t("common.actions.back")} link={backLink} />

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button variant="text" size="medium" sx={MenuItemButton}>
          {pathname === ROUTES.borrower.editProfile
            ? t("borrowerProfile.sidebar.editBorrowerProfile")
            : t("borrowerProfile.sidebar.borrowerProfile")}
        </Button>
      </Box>
    </Box>
  )
}
