import React, { Dispatch, SetStateAction, useEffect } from "react"

import { Box, Divider } from "@mui/material"

import { Markdown } from "@/components/Markdown"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { COLORS } from "@/theme/colors"

export const MobileMarketDescriptionModal = ({
  marketSummary,
  marketName,
  isLoading,
  setIsMobileDescriptionOpen,
}: {
  marketName: string | undefined
  marketSummary:
    | {
        marketAddress: string
        description: string
      }
    | undefined
  isLoading: boolean
  setIsMobileDescriptionOpen?: Dispatch<SetStateAction<boolean>>
}) => {
  useEffect(() => {
    if (typeof window === "undefined") return

    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  if (isLoading || !marketSummary || !setIsMobileDescriptionOpen) return null

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.white,
        borderRadius: "14px",
        paddingBottom: "12px",
        marginBottom: "4px",
      }}
    >
      <TransactionHeader
        label="Description"
        subLabel={marketName}
        arrowOnClick={() => setIsMobileDescriptionOpen(false)}
        crossOnClick={null}
        progress={undefined}
      />

      <Divider />

      <Box
        sx={{
          padding: "24px 16px 12px",
        }}
      >
        <Markdown markdown={marketSummary?.description || ""} />
      </Box>
      <Box />
    </Box>
  )
}
