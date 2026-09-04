import * as React from "react"

import { Market, WrapperDeploymentStatus } from "@wildcatfi/wildcat-sdk"

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
    deploymentStatus,
    isCheckingDeploymentCapability,
    isDeploymentCapabilityError,
    createWrapper,
    isCreatingWrapper,
  } = useCreateWrapper({ market, hasFactory, isDifferentChain })

  let statusMessage: string | undefined
  if (transfersDisabled) {
    statusMessage =
      "Wrappers are not available when market transfers are disabled."
  } else if (isCheckingDeploymentCapability) {
    statusMessage = "Checking wrapper availability..."
  } else if (deploymentStatus === WrapperDeploymentStatus.UnsupportedFactory) {
    statusMessage = "Wrapper deployment is not available for this market."
  } else if (deploymentStatus === WrapperDeploymentStatus.FactoryUnavailable) {
    statusMessage = "Wrappers are not available on this chain yet."
  } else if (isDeploymentCapabilityError) {
    statusMessage = "Unable to verify wrapper availability."
  }

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
      statusMessage={statusMessage}
    />
  )
}
