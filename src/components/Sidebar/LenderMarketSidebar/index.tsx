import * as React from "react"

import { Box, Button, Skeleton } from "@mui/material"

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
  const dispatch = useAppDispatch()

  const currentSection = useAppSelector(
    (state) => state.lenderMarketRouting.currentSection,
  )

  const isLoading = useAppSelector(
    (state) => state.lenderMarketRouting.isLoading,
  )

  const handleChangeSection = (newSection: LenderMarketSections) => {
    dispatch(setSection(newSection))
  }

  return (
    <Box
      sx={{
        minHeight: "100%",
        minWidth: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        padding: "32px 12px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box position="sticky" top="32px">
        <BackButton title="Back to markets" link={ROUTES.lender.root} />

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
              Deposit and Withdraw
            </Button>

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
              Status
            </Button>

            <Button
              variant="text"
              size="medium"
              onClick={() => handleChangeSection(LenderMarketSections.REQUESTS)}
              sx={{
                ...MenuItemButton,
                backgroundColor:
                  currentSection === LenderMarketSections.REQUESTS
                    ? COLORS.whiteSmoke
                    : "transparent",
              }}
            >
              Withdrawal Requests
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
