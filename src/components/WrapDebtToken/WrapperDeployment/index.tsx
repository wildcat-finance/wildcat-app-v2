import * as React from "react"

import { Market, WrapperDeploymentStatus } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
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
    statusMessage = t("marketDetails.lender.wrapDebtToken.transfersDisabled")
  } else if (isCheckingDeploymentCapability) {
    statusMessage = t("marketDetails.lender.wrapDebtToken.deployment.checking")
  } else if (deploymentStatus === WrapperDeploymentStatus.UnsupportedFactory) {
    statusMessage = t(
      "marketDetails.lender.wrapDebtToken.deployment.unsupportedFactory",
    )
  } else if (deploymentStatus === WrapperDeploymentStatus.FactoryUnavailable) {
    statusMessage = t(
      "marketDetails.lender.wrapDebtToken.deployment.factoryUnavailable",
    )
  } else if (isDeploymentCapabilityError) {
    statusMessage = t(
      "marketDetails.lender.wrapDebtToken.deployment.verificationFailed",
    )
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
