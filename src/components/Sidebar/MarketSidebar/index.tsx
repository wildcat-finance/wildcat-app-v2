import { Box, Button } from "@mui/material"

import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/MarketSidebar/style"
import { COLORS } from "@/theme/colors"
import Link from "next/link"
import { ROUTES } from "@/routes"
import SvgIcon from "@mui/material/SvgIcon"

import { useTranslation } from "react-i18next"
import BackArrow from "../../../assets/icons/backArrow_icon.svg"
import Cross from "../../../assets/icons/cross_icon.svg"

export const MarketSidebar = () => {
  const { t } = useTranslation()

  return (
    <Box sx={ContentContainer}>
      <Link href={ROUTES.borrower.root} passHref>
        <Button
          fullWidth
          variant="text"
          size="medium"
          sx={{
            color: COLORS.greySuit,
            justifyContent: "flex-start",
            marginBottom: "14px",
          }}
        >
          <SvgIcon
            fontSize="small"
            sx={{
              marginRight: "4px",
              "& path": { fill: `${COLORS.greySuit}` },
            }}
          >
            <BackArrow />
          </SvgIcon>
          {t("borrowerMarketDetails:backButton")}
        </Button>
      </Link>

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button variant="text" size="medium" sx={MenuItemButton}>
          {t("borrowerMarketDetails:borrowRepayLinkButton")}
        </Button>
        <Button variant="text" size="medium" sx={MenuItemButton}>
          {t("borrowerMarketDetails:statusDetailsLinkButton")}
        </Button>
        <Button variant="text" size="medium" sx={MenuItemButton}>
          {t("borrowerMarketDetails:withdrawalRequestsLinkButton")}
        </Button>
        <Button variant="text" size="medium" sx={MenuItemButton}>
          {t("borrowerMarketDetails:lendersLinkButton")}
        </Button>
      </Box>

      <Button
        variant="outlined"
        color="secondary"
        sx={{ fontWeight: 500, marginTop: "24px" }}
      >
        <SvgIcon fontSize="small" sx={{ marginRight: "4px" }}>
          <Cross />
        </SvgIcon>
        {t("borrowerMarketDetails:terminateButton")}
      </Button>
    </Box>
  )
}
