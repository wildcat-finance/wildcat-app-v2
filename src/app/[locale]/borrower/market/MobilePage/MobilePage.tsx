import { Box } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { MarketParameters } from "@/components/MarketParameters"

import { MarketWithdrawalRequests } from "../[address]/components/MarketWithdrawalRequests"

type MobilePageProps = {
  marketAccount: MarketAccount
  isHoldingMarket: boolean
}

export const MobilePage = ({
  marketAccount,
  isHoldingMarket,
}: MobilePageProps) => (
  <Box display="flex" flexDirection="column" gap="4px">
    <MarketParameters market={marketAccount.market} />
    <MarketWithdrawalRequests
      marketAccount={marketAccount}
      isHoldingMarket={isHoldingMarket}
    />
  </Box>
)
