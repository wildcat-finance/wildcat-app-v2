import * as React from "react"

import { Box, Typography } from "@mui/material"
import { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { NoWrapperState } from "@/components/WrapDebtToken/NoWrapperState"
import { WrapperDeployment } from "@/components/WrapDebtToken/WrapperDeployment"
import { WrapperSection } from "@/components/WrapDebtToken/WrapperSection"
import { WrapperSkeleton } from "@/components/WrapDebtToken/WrapperSkeleton"
import { COLORS } from "@/theme/colors"

export type WrapDebtTokenProps = {
  market: Market | undefined
  wrapper: TokenWrapper | undefined
  hasWrapper: boolean
  hasFactory: boolean
  isWrapperLookupLoading: boolean
  isWrapperLoading: boolean
  isWrapperError: boolean
  isAuthorizedLender: boolean
  isDifferentChain: boolean
}

export const WrapDebtToken = ({
  market,
  wrapper,
  hasWrapper,
  hasFactory,
  isWrapperLookupLoading,
  isWrapperLoading,
  isWrapperError,
  isAuthorizedLender,
  isDifferentChain,
}: WrapDebtTokenProps) => {
  const { t } = useTranslation()

  return (
    <Box>
      {hasWrapper && !isAuthorizedLender && (
        <Typography variant="text3" color={COLORS.manate}>
          {t("marketDetails.lender.onlyAuthorizedLendersCanAccess")}
        </Typography>
      )}

      {!hasFactory && (
        <NoWrapperState
          canCreateWrapper={false}
          statusMessage="Wrappers are not available on this chain yet."
        />
      )}

      {hasFactory && !hasWrapper && !isWrapperLookupLoading && (
        <WrapperDeployment
          market={market}
          hasFactory={hasFactory}
          isDifferentChain={isDifferentChain}
        />
      )}

      {hasFactory && isWrapperLookupLoading && <WrapperSkeleton />}

      {isAuthorizedLender &&
        hasWrapper &&
        wrapper &&
        !isWrapperLoading &&
        !isWrapperError && (
          <WrapperSection
            market={market}
            wrapper={wrapper}
            isDifferentChain={isDifferentChain}
            isAuthorizedLender={isAuthorizedLender}
          />
        )}

      {isAuthorizedLender &&
        hasWrapper &&
        (isWrapperLoading || isWrapperError) && <WrapperSkeleton />}
    </Box>
  )
}
