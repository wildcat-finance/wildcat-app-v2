import { useState } from "react"

import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Link as ScrollLink } from "react-scroll"

import { TerminateModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateModal"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/MarketSidebar/style"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import BackArrow from "../../../assets/icons/backArrow_icon.svg"
import Cross from "../../../assets/icons/cross_icon.svg"

export const MarketSidebar = () => {
  const { t } = useTranslation()
  const [isOpenTerminateModal, setIsOpenTerminateModal] =
    useState<boolean>(false)

  return (
    <Box sx={ContentContainer}>
      <Box position="sticky" top="32px">
        <Link href={ROUTES.borrower.root} passHref>
          <Button
            fullWidth
            variant="text"
            size="medium"
            sx={{
              color: COLORS.greySuit,
              justifyContent: "flex-start",
              marginBottom: "12px",
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
            {t("borrowerMarketDetails.sidebar.backToMarkets")}
          </Button>
        </Link>

        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          <ScrollLink to="borrowRepay" smooth duration={500}>
            <Button variant="text" size="medium" sx={MenuItemButton}>
              {t("borrowerMarketDetails.sidebar.borrowRepay")}
            </Button>
          </ScrollLink>
          <ScrollLink to="statusDetails" smooth duration={500}>
            <Button variant="text" size="medium" sx={MenuItemButton}>
              {t("borrowerMarketDetails.sidebar.statusDetails")}
            </Button>
          </ScrollLink>
          <ScrollLink to="withdrawals" smooth duration={500}>
            <Button variant="text" size="medium" sx={MenuItemButton}>
              {t("borrowerMarketDetails.sidebar.withdrawalRequests")}
            </Button>
          </ScrollLink>
          <ScrollLink to="lenders" smooth duration={500}>
            <Button variant="text" size="medium" sx={MenuItemButton}>
              {t("borrowerMarketDetails.sidebar.authorisedLenders")}
            </Button>
          </ScrollLink>
        </Box>

        <Button
          variant="outlined"
          color="secondary"
          sx={{ fontWeight: 500, marginTop: "24px", width: "100%" }}
          onClick={() => {
            setIsOpenTerminateModal(!isOpenTerminateModal)
          }}
        >
          <SvgIcon fontSize="small" sx={{ marginRight: "4px" }}>
            <Cross />
          </SvgIcon>
          {t("borrowerMarketDetails.sidebar.terminateMarket")}
        </Button>
        <TerminateModal
          isOpen={isOpenTerminateModal}
          setIsOpen={setIsOpenTerminateModal}
        />
      </Box>
    </Box>
  )
}
