import { Box, Button } from "@mui/material"
import { usePathname } from "next/navigation"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { ROUTES } from "@/routes"

export const BorrowerSidebar = () => {
  const pathname = usePathname()

  const backLink = pathname.includes(ROUTES.borrower.profile)
    ? ROUTES.borrower.root
    : ROUTES.lender.root

  return (
    <Box sx={ContentContainer}>
      <BackButton title="Back" link={backLink} />

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button variant="text" size="medium" sx={MenuItemButton}>
          Borrower Profile
        </Button>
      </Box>
    </Box>
  )
}
