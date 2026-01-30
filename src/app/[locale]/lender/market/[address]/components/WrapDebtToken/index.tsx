import * as React from "react"

import { Box } from "@mui/material"

import { useAppSelector } from "@/store/hooks"
import { WrapDebtTokenFlowSteps } from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"

import { NoWrapperPlaceholder } from "./components/NoWrapperPlaceholder"
import { WrapperSection } from "./components/WrapperSection"

export const WrapDebtToken = () => {
  const wrapperStep = useAppSelector((state) => state.wrapDebtTokenFlow.step)

  return (
    <Box>
      {wrapperStep === WrapDebtTokenFlowSteps.NO_WRAPPER && (
        <NoWrapperPlaceholder canCreateWrapper />
      )}

      {wrapperStep === WrapDebtTokenFlowSteps.CREATE_WRAPPER && (
        <WrapperSection />
      )}

      {/* {wrapperStep === WrapDebtTokenFlowSteps.HAS_WRAPPER && <Box />} */}
    </Box>
  )
}
