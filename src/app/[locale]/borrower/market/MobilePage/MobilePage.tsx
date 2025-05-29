import { Box } from "@mui/material"

import { MarketParameters } from "@/components/MarketParameters"
import { MarketWithdrawalRequests } from "../[address]/components/MarketWithdrawalRequests"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

type MobilePageProps = {
  marketAccount: MarketAccount
  isHoldingMarket: boolean
}

export const MobilePage = ({
  marketAccount,
  isHoldingMarket,
}: MobilePageProps) => (
  <Box display="flex" flexDirection="column" gap={4} p={2}>
    <MarketParameters market={marketAccount.market} />
    <MarketWithdrawalRequests
      marketAccount={marketAccount}
      isHoldingMarket={isHoldingMarket}
    />
  </Box>
)
