import * as React from "react"

import { Market } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { NoWrapperState } from "@/components/WrapDebtToken/NoWrapperState"
import { useCreateWrapper } from "@/hooks/wrapper/useCreateWrapper"

type WrapperDeploymentProps = {
  market: Market | undefined
  hasFactory: boolean
  isDifferentChain: boolean
}

export const WrapperDeployment = ({
  market,
  hasFactory,
  isDifferentChain,
}: WrapperDeploymentProps) => {
  const {
    canCreateWrapper,
    transfersDisabled,
    createWrapper,
    isCreatingWrapper,
  } = useCreateWrapper({ market, hasFactory, isDifferentChain })

  return (
    <NoWrapperState
      canCreateWrapper={canCreateWrapper}
      onCreateWrapper={() =>
        toastRequest(createWrapper(), {
          pending: "Deploying wrapper...",
          success: "Wrapper deployed",
          error: "Failed to deploy wrapper",
        })
      }
      isCreatingWrapper={isCreatingWrapper}
      disableCreateWrapper={!canCreateWrapper}
      statusMessage={
        transfersDisabled
          ? "Wrappers are not available when market transfers are disabled."
          : undefined
      }
    />
  )
}
