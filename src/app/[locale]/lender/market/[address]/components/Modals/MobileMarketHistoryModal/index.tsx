import React, { Dispatch, SetStateAction, useEffect } from "react"

import { Box, Divider } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { COLORS } from "@/theme/colors"

export const MobileMarketHistoryModal = ({
  market,
  setIsMobileHistoryOpen,
}: {
  market: Market
  setIsMobileHistoryOpen: Dispatch<SetStateAction<boolean>>
}) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (typeof window === "undefined") return
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        // Grow into the space the actions bar and footer leave over, but stay
        // content-sized otherwise. `height: 100%` resolved against the page
        // column, whose height already includes those siblings, so the card
        // overshot its content by their combined height.
        flex: 1,
        width: "100%",
        backgroundColor: COLORS.white,
        borderRadius: "14px",
        paddingBottom: "12px",
        marginBottom: "4px",
      }}
    >
      <TransactionHeader
        label={t("marketDetails.shared.sidebar.marketHistory")}
        subLabel={market.name}
        arrowOnClick={() => setIsMobileHistoryOpen(false)}
        crossOnClick={null}
        progress={undefined}
      />

      <Divider />

      <PaginatedMarketRecordsTable market={market} />
    </Box>
  )
}
