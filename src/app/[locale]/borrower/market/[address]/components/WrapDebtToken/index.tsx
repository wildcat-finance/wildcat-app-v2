import * as React from "react"
import { useEffect } from "react"

import { Box, Typography } from "@mui/material"
import { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { NoWrapperState } from "@/components/WrapDebtToken/NoWrapperState"
import { WrapperSection } from "@/components/WrapDebtToken/WrapperSection"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useAppDispatch } from "@/store/hooks"
import { setIsMobileOpenedState } from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"
import { COLORS } from "@/theme/colors"

export type WrapDebtTokenProps = {
  market: Market | undefined
  wrapper: TokenWrapper | undefined
  hasWrapper: boolean
  hasFactory: boolean
  isWrapperLookupLoading: boolean
  isWrapperLoading: boolean
  isWrapperError: boolean
}

export const WrapDebtToken = ({
  market,
  wrapper,
  hasWrapper,
  hasFactory,
  isWrapperLookupLoading,
  isWrapperLoading,
  isWrapperError,
}: WrapDebtTokenProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(setIsMobileOpenedState(true))
  }, [])

  const { isWrongNetwork, isSelectionMismatch } = useNetworkGate({
    desiredChainId: market?.chainId,
    includeAgreementStatus: false,
  })
  const isDifferentChain = isSelectionMismatch || isWrongNetwork

  return (
    <Box>
      {!hasFactory && (
        <NoWrapperState
          canCreateWrapper={false}
          statusMessage={t("wrapDebtToken.errors.notAvailableOnChain")}
        />
      )}

      {hasFactory && !hasWrapper && !isWrapperLookupLoading && (
        <NoWrapperState canCreateWrapper={false} />
      )}

      {hasFactory && isWrapperLookupLoading && (
        <Typography variant="text3" color={COLORS.manate}>
          {t("wrapDebtToken.states.checkingStatus")}
        </Typography>
      )}

      {hasWrapper && wrapper && !isWrapperLoading && !isWrapperError && (
        <WrapperSection
          market={market}
          wrapper={wrapper}
          isDifferentChain={isDifferentChain}
          isAuthorizedLender
        />
      )}

      {hasWrapper && (isWrapperLoading || isWrapperError) && (
        <Typography variant="text3" color={COLORS.manate}>
          {t("wrapDebtToken.states.loadingDetails")}
        </Typography>
      )}
    </Box>
  )
}
