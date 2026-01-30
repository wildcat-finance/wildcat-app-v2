import React from "react"

import { Box } from "@mui/material"

import { WrapperExchangeBanner } from "@/components/WrapDebtToken/WrapperExchangeBanner"
import { WrapperHeader } from "@/components/WrapDebtToken/WrapperHeader"
import { useAppSelector } from "@/store/hooks"

const mockAddress = "0x000000000000000000000000000000000000"

export const WrapperSection = () => {
  const initialAmount = useAppSelector(
    (state) => state.wrapDebtTokenFlow.initialAmount,
  )
  const wrappedAmount = useAppSelector(
    (state) => state.wrapDebtTokenFlow.wrappedAmount,
  )

  return (
    <Box>
      <WrapperHeader contractAddress={mockAddress} />

      <WrapperExchangeBanner />
    </Box>
  )
}
