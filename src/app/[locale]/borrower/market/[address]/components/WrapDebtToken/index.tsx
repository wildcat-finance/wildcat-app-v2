import * as React from "react"

import { Box } from "@mui/material"

import { NoWrapperPlaceholder } from "@/components/WrapDebtToken/NoWrapperPlaceholder"
import { useAppSelector } from "@/store/hooks"
import { WrapDebtTokenFlowSteps } from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"

import { WrapperSection } from "./components/WrapperSection"

export const WrapDebtToken = () => {
  const wrapperStep = useAppSelector((state) => state.wrapDebtTokenFlow.step)

  return (
    <Box>
      {wrapperStep === WrapDebtTokenFlowSteps.NO_WRAPPER && (
        <NoWrapperPlaceholder canCreateWrapper={false} />
      )}

      {wrapperStep === WrapDebtTokenFlowSteps.HAS_WRAPPER && <WrapperSection />}
    </Box>
  )
}
