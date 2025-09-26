import * as React from "react"

import { Box, Button, Skeleton, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"

import BorrowAndRepayIcon from "@/assets/icons/borrowAndRepay_icon.svg"
import ContractIcon from "@/assets/icons/contract_icon.svg"
import LenderBorrowerIcon from "@/assets/icons/lenderBorrower_icon.svg"
import MarketEventsIcon from "@/assets/icons/marketEvents_icon.svg"
import MLAIcon from "@/assets/icons/mla_icon.svg"
import StatusAndDetailsIcon from "@/assets/icons/statusAndDetails_icon.svg"
import WithdrawalAndRequestsIcon from "@/assets/icons/withdrawalAndRequests_icon.svg"
import { BackButton } from "@/components/BackButton"
import { MenuItemButton } from "@/components/Sidebar/MarketSidebar/style"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"

export const LenderMarketSidebar = () => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const currentSection = useAppSelector(
    (state) => state.lenderMarketRouting.currentSection,
  )

  const isLoading = useAppSelector(
    (state) => state.lenderMarketRouting.isLoading,
  )

  const isLender = useAppSelector((state) => state.lenderMarketRouting.isLender)

  const hasCollateralContract = useAppSelector(
    (state) => state.lenderMarketRouting.hasCollateralContract,
  )

  const handleChangeSection = (newSection: LenderMarketSections) => {
    dispatch(setSection(newSection))
  }

  return (
    <Box
      sx={{
        minWidth: "267px",
        padding: "32px 12px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box position="sticky" top="32px">
        <BackButton title="Back To Markets" link={ROUTES.lender.root} />

        {isLoading && (
          <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
            <Skeleton
              height="44px"
              width="100%"
              sx={{ bgcolor: COLORS.athensGrey, borderRadius: "10px" }}
            />

            <Skeleton
              height="44px"
              width="100%"
              sx={{ bgcolor: COLORS.athensGrey, borderRadius: "10px" }}
            />

            <Skeleton
              height="44px"
              width="100%"
              sx={{ bgcolor: COLORS.athensGrey, borderRadius: "10px" }}
            />
          </Box>
        )}

        {!isLoading && (
          <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
            {isLender && (
              <Button
                variant="text"
                size="medium"
                onClick={() =>
                  handleChangeSection(LenderMarketSections.TRANSACTIONS)
                }
                sx={{
                  ...MenuItemButton,
                  backgroundColor:
                    currentSection === LenderMarketSections.TRANSACTIONS
                      ? COLORS.whiteSmoke
                      : "transparent",
                }}
              >
                <SvgIcon sx={{ marginRight: "10px" }}>
                  <BorrowAndRepayIcon />
                </SvgIcon>
                {t("lenderMarketDetails.sidebar.actions")}
              </Button>
            )}

            <Button
              variant="text"
              size="medium"
              onClick={() => handleChangeSection(LenderMarketSections.STATUS)}
              sx={{
                ...MenuItemButton,
                backgroundColor:
                  currentSection === LenderMarketSections.STATUS
                    ? COLORS.whiteSmoke
                    : "transparent",
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <StatusAndDetailsIcon />
              </SvgIcon>
              {t("lenderMarketDetails.sidebar.status")}
            </Button>

            {isLender && (
              <Button
                variant="text"
                size="medium"
                onClick={() =>
                  handleChangeSection(LenderMarketSections.REQUESTS)
                }
                sx={{
                  ...MenuItemButton,
                  backgroundColor:
                    currentSection === LenderMarketSections.REQUESTS
                      ? COLORS.whiteSmoke
                      : "transparent",
                }}
              >
                <SvgIcon sx={{ marginRight: "10px" }}>
                  <WithdrawalAndRequestsIcon />
                </SvgIcon>
                {t("lenderMarketDetails.sidebar.requests")}
              </Button>
            )}

            <Button
              variant="text"
              size="medium"
              onClick={() =>
                handleChangeSection(LenderMarketSections.BORROWER_PROFILE)
              }
              sx={{
                ...MenuItemButton,
                backgroundColor:
                  currentSection === LenderMarketSections.BORROWER_PROFILE
                    ? COLORS.whiteSmoke
                    : "transparent",
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <LenderBorrowerIcon />
              </SvgIcon>
              {t("lenderMarketDetails.sidebar.borrowerProfile")}
            </Button>

            <Button
              variant="text"
              size="medium"
              onClick={() =>
                handleChangeSection(LenderMarketSections.MARKET_HISTORY)
              }
              sx={{
                ...MenuItemButton,
                backgroundColor:
                  currentSection === LenderMarketSections.MARKET_HISTORY
                    ? COLORS.whiteSmoke
                    : "transparent",
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <MarketEventsIcon />
              </SvgIcon>
              {t("lenderMarketDetails.sidebar.marketHistory")}
            </Button>

            <Button
              disabled={!hasCollateralContract}
              variant="text"
              size="medium"
              onClick={() =>
                handleChangeSection(LenderMarketSections.COLLATERAL_CONTRACT)
              }
              sx={{
                ...MenuItemButton,
                backgroundColor:
                  currentSection === LenderMarketSections.COLLATERAL_CONTRACT
                    ? COLORS.whiteSmoke
                    : "transparent",
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <ContractIcon />
              </SvgIcon>
              {t("collateral.actions.title")}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
