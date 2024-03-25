import { Box, Button } from "@mui/material"

import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/MarketSidebar/style"
import { COLORS } from "@/theme/colors"
import Link from "next/link"
import { ROUTES } from "@/routes"
import SvgIcon from "@mui/material/SvgIcon"

import BackArrow from "../../../assets/icons/backArrow_icon.svg"
import Cross from "../../../assets/icons/cross_icon.svg"

export const MarketSidebar = () => (
  <Box sx={ContentContainer}>
    <Link href={ROUTES.borrower} passHref>
      <Button
        fullWidth
        variant="text"
        size="medium"
        sx={{ color: COLORS.greySuit, justifyContent: "flex-start", marginBottom: "14px" }}
      >
        <SvgIcon
          fontSize="small"
          sx={{ marginRight: "4px", "& path": { fill: `${COLORS.greySuit}` } }}
        >
          <BackArrow />
        </SvgIcon>
        Back to My Markets
      </Button>
    </Link>

    <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Borrow and Repay
      </Button>
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Status and Details
      </Button>
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Withdrawal Requests
      </Button>
      <Button variant="text" size="medium" sx={MenuItemButton}>
        Authorised Lenders
      </Button>
    </Box>

    <Button variant="outlined" color="secondary" sx={{ fontWeight: 500, marginTop: "24px" }}>
      <SvgIcon fontSize="small" sx={{ marginRight: "4px" }}>
        <Cross />
      </SvgIcon>
      Terminate Market
    </Button>
  </Box>
)
