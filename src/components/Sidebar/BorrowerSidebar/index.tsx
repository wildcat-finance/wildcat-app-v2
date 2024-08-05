import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import {
  ContentContainer,
  BackButton,
  BackButtonIcon,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { ROUTES } from "@/routes"

export const BorrowerSidebar = () => (
  <Box sx={ContentContainer}>
    <Link href={ROUTES.borrower.root} passHref>
      <Button fullWidth variant="text" size="medium" sx={BackButton}>
        <SvgIcon fontSize="small" sx={BackButtonIcon}>
          <BackArrow />
        </SvgIcon>
        Back
      </Button>
    </Link>

    <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Borrower
      </Button>
    </Box>
  </Box>
)
