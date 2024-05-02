import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import {
  BackButton,
  BackButtonIcon,
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/NewMarketSidebar/style"
import { ROUTES } from "@/routes"

import BackArrow from "../../../assets/icons/backArrow_icon.svg"

export const NewMarketSidebar = () => (
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
        Market Description
      </Button>
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Legal Info
      </Button>
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Confirmation
      </Button>
    </Box>
  </Box>
)
