import * as React from "react"

import { Box, Button, Skeleton, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import BorrowAndRepayIcon from "@/assets/icons/borrowAndRepay_icon.svg"
import LenderBorrowerIcon from "@/assets/icons/lenderBorrower_icon.svg"
import MarketEventsIcon from "@/assets/icons/marketEvents_icon.svg"
import StatusAndDetailsIcon from "@/assets/icons/statusAndDetails_icon.svg"
import SummaryIcon from "@/assets/icons/summary_icon.svg"
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

  const ongoingAmount = useAppSelector(
    (state) => state.lenderMarketRouting.ongoingAmount,
  )

  const handleChangeSection = (newSection: LenderMarketSections) => {
    dispatch(setSection(newSection))
  }

  const hideDescriptionSection = useAppSelector(
    (state) => state.hideMarketSections.description,
  )

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

            {!hideDescriptionSection && (
              <Button
                variant="text"
                size="medium"
                onClick={() =>
                  handleChangeSection(LenderMarketSections.SUMMARY)
                }
                sx={{
                  ...MenuItemButton,
                  backgroundColor:
                    currentSection === LenderMarketSections.SUMMARY
                      ? COLORS.whiteSmoke
                      : "transparent",
                }}
              >
                <SvgIcon
                  sx={{
                    marginRight: "10px",
                  }}
                >
                  <SummaryIcon />
                </SvgIcon>
                {t("lenderMarketDetails.description.title")}
              </Button>
            )}

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
                {!!ongoingAmount && (
                  <Box
                    sx={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      bgcolor: COLORS.blueRibbon01,

                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",

                      marginLeft: "auto",
                    }}
                  >
                    <Typography
                      variant="text4Highlighted"
                      color={COLORS.ultramarineBlue}
                    >
                      {ongoingAmount}
                    </Typography>
                  </Box>
                )}
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
          </Box>
        )}
      </Box>
    </Box>
  )
}
